process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]', err.stack || err);
});
process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED REJECTION]', reason);
});

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
// puppeteer loaded via dynamic import() — it's ESM-only in v19+

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── Database Setup ────────────────────────────────────────────────────────────

let dbInstance = null;

function getDatabase() {
    if (dbInstance) return dbInstance;

    const dbCandidates = [
        path.join(__dirname, '..', 'db', 'thanawya.db'),
        path.join(__dirname, 'db', 'thanawya.db'),
        path.join(process.cwd(), 'db', 'thanawya.db'),
        path.join(process.cwd(), 'thanawya.db')
    ];

    for (const p of dbCandidates) {
        if (fs.existsSync(p) && fs.statSync(p).size > 1024) {
            console.log('[DB] Connected to thanawya.db at:', p);
            dbInstance = new sqlite3.Database(p, sqlite3.OPEN_READONLY);
            return dbInstance;
        }
    }

    // Priority 2: Already decompressed in /tmp
    const tmpDbPath = '/tmp/thanawya.db';
    if (fs.existsSync(tmpDbPath) && fs.statSync(tmpDbPath).size > 1024) {
        console.log('[DB] Using cached DB at /tmp/thanawya.db');
        dbInstance = new sqlite3.Database(tmpDbPath, sqlite3.OPEN_READONLY);
        return dbInstance;
    }

    // Priority 3: Decompress .gz candidate
    const gzCandidates = [
        path.join(__dirname, '..', 'db', 'thanawya.db.gz'),
        path.join(__dirname, 'db', 'thanawya.db.gz'),
        path.join(process.cwd(), 'db', 'thanawya.db.gz'),
        path.join(process.cwd(), 'thanawya.db.gz')
    ];

    for (const gzPath of gzCandidates) {
        if (fs.existsSync(gzPath)) {
            console.log('[DB] Found gz at:', gzPath, 'Decompressing to /tmp...');
            try {
                const gzBuf = fs.readFileSync(gzPath);
                const decompressedBuf = zlib.gunzipSync(gzBuf);
                fs.writeFileSync(tmpDbPath, decompressedBuf);
                console.log('[DB] Decompression complete. File size:', fs.statSync(tmpDbPath).size);
                dbInstance = new sqlite3.Database(tmpDbPath, sqlite3.OPEN_READONLY);
                return dbInstance;
            } catch (e) {
                console.error('[DB] Decompression error:', e.message);
            }
        }
    }

    // Fallback: empty in-memory DB
    console.error('[DB] WARNING: No DB found — using in-memory empty DB');
    dbInstance = new sqlite3.Database(':memory:');
    dbInstance.run(`CREATE TABLE IF NOT EXISTS students (
        seating_no INTEGER PRIMARY KEY,
        student_name TEXT,
        search_name TEXT,
        total_score REAL,
        max_score REAL,
        percentage REAL,
        status TEXT
    )`);
    return dbInstance;
}

const db = getDatabase();

// ─── Arabic Normalization ──────────────────────────────────────────────────────

function normalizeArabic(text) {
    if (!text) return '';
    return String(text)
        .trim()
        .replace(/[\u064B-\u0652]/g, '')
        .replace(/[أإآا]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

// ─── Puppeteer Shared Browser ─────────────────────────────────────────────────

const liveSubjectCache = new Map();
let sharedBrowser = null;

async function getSharedBrowser() {
    if (sharedBrowser) {
        try {
            const pages = await sharedBrowser.pages();
            if (pages) return sharedBrowser;
        } catch (_) {
            sharedBrowser = null;
        }
    }

    // On Railway Nixpacks or Docker, use system chromium or executablePath from ENV
    let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
    if (!executablePath) {
        try {
            const { execSync } = require('child_process');
            const whichChromium = execSync('which chromium 2>/dev/null || which google-chrome 2>/dev/null').toString().trim();
            if (whichChromium) executablePath = whichChromium;
        } catch (_) {}
    }

    console.log('[Puppeteer] Launching Chrome...', executablePath ? `(path: ${executablePath})` : '(bundled)');

    // Dynamic import for ESM-only puppeteer v19+
    const { default: puppeteer } = await import('puppeteer');

    sharedBrowser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--mute-audio'
        ]
    });

    sharedBrowser.on('disconnected', () => {
        console.log('[Puppeteer] Browser disconnected, will restart on next request.');
        sharedBrowser = null;
    });

    return sharedBrowser;
}

// ─── Real-Time Headless Scraper from Gomhuria Online ─────────────────────────

async function scrapeGomhuriaOnline(seatingNo) {
    const key = String(seatingNo);

    if (liveSubjectCache.has(key)) {
        console.log(`[Scraper] Cache hit for ${key}`);
        return liveSubjectCache.get(key);
    }

    try {
        const browser = await getSharedBrowser();
        const page = await browser.newPage();

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        console.log(`[Scraper] Opening Gomhuria for seating_no: ${key}...`);
        await page.goto('https://natega.gomhuriaonline.com', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await page.waitForSelector('#seat-number', { timeout: 10000 });
        await page.type('#seat-number', key);

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
            page.click('.inquiry-form__submit')
        ]);

        const html = await page.content();
        await page.close();

        // Parse table rows from student-result__table
        const rowRegex = /<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi;
        const parsedSubjects = [];
        let match;

        while ((match = rowRegex.exec(html)) !== null) {
            const name = match[1].replace(/<[^>]+>/g, '').trim();
            const score = match[2].replace(/<[^>]+>/g, '').trim();
            const perc = match[3].replace(/<[^>]+>/g, '').trim();

            if (name && name !== 'المادة') {
                parsedSubjects.push({
                    name,
                    score,
                    percentage: perc,
                    isEnrolled: !score.includes('غير مقرر')
                });
            }
        }

        if (parsedSubjects.length > 0) {
            console.log(`[Scraper] ✅ Got ${parsedSubjects.length} subjects for ${key}`);
            liveSubjectCache.set(key, parsedSubjects);
            return parsedSubjects;
        }

        console.warn(`[Scraper] ⚠️ No subjects found in HTML for ${key}`);
        return null;

    } catch (err) {
        console.error(`[Scraper] ❌ Error for ${key}:`, err.message);
        return null;
    }
}

// ─── API Routes ───────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/search', (req, res) => {
    const query = (req.query.q || '').trim();
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    if (!query) return res.json({ total: 0, page, limit, results: [] });

    const isNumeric = /^\d+$/.test(query);

    if (isNumeric) {
        const seatNo = parseInt(query, 10);
        const seatPattern = `${query}%`;
        db.get(
            `SELECT COUNT(*) AS total FROM students WHERE seating_no = ? OR seating_no LIKE ?`,
            [seatNo, seatPattern],
            (err, countRow) => {
                if (err) return res.status(500).json({ error: err.message });
                db.all(
                    `SELECT seating_no, student_name, total_score, max_score, percentage, status FROM students WHERE seating_no = ? OR seating_no LIKE ? ORDER BY seating_no ASC LIMIT ? OFFSET ?`,
                    [seatNo, seatPattern, limit, offset],
                    (err, rows) => {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({ total: countRow?.total || 0, page, limit, results: rows || [] });
                    }
                );
            }
        );
    } else {
        const pattern = `%${normalizeArabic(query)}%`;
        db.get(
            `SELECT COUNT(*) AS total FROM students WHERE search_name LIKE ?`,
            [pattern],
            (err, countRow) => {
                if (err) return res.status(500).json({ error: err.message });
                db.all(
                    `SELECT seating_no, student_name, total_score, max_score, percentage, status FROM students WHERE search_name LIKE ? ORDER BY total_score DESC LIMIT ? OFFSET ?`,
                    [pattern, limit, offset],
                    (err, rows) => {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({ total: countRow?.total || 0, page, limit, results: rows || [] });
                    }
                );
            }
        );
    }
});

app.get('/api/student/:seating_no', async (req, res) => {
    const seatingNo = parseInt(req.params.seating_no, 10);
    if (isNaN(seatingNo)) return res.status(400).json({ error: 'رقم الجلوس غير صحيح' });

    db.get(
        `SELECT seating_no, student_name, total_score, max_score, percentage, status FROM students WHERE seating_no = ?`,
        [seatingNo],
        async (err, student) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!student) return res.status(404).json({ error: 'لم يتم العثور على طالب برقم الجلوس هذا' });

            // Scrape real subject grades from Gomhuria Online
            let subjects = null;
            try {
                subjects = await scrapeGomhuriaOnline(seatingNo);
            } catch (e) {
                console.error('[Route] Scrape error:', e.message);
            }

            db.get(`SELECT COUNT(*) + 1 AS rank FROM students WHERE total_score > ?`, [student.total_score], (err, rankRow) => {
                db.get(`SELECT COUNT(*) AS lower_count FROM students WHERE total_score < ?`, [student.total_score], (err, lowerRow) => {
                    db.get(`SELECT COUNT(*) AS total_students FROM students`, [], (err, totalRow) => {
                        const totalStudents = totalRow?.total_students || 919396;
                        const rank = rankRow?.rank || 1;
                        const lowerCount = lowerRow?.lower_count || 0;
                        const percentile = Number(((lowerCount / totalStudents) * 100).toFixed(2));

                        res.json({
                            ...student,
                            national_rank: rank,
                            percentile,
                            total_students: totalStudents,
                            subjects: subjects || [],
                            is_live_scraped: subjects !== null && subjects.length > 0
                        });
                    });
                });
            });
        }
    );
});

app.get('/api/top-students', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    db.all(
        `SELECT seating_no, student_name, total_score, max_score, percentage, status FROM students ORDER BY total_score DESC, seating_no ASC LIMIT ?`,
        [limit],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ results: rows || [] });
        }
    );
});

app.get('/api/stats', (req, res) => {
    db.get(
        `SELECT
            COUNT(*) as total_students,
            SUM(CASE WHEN status LIKE '%ناجح%' THEN 1 ELSE 0 END) as passed_students,
            SUM(CASE WHEN status LIKE '%ثان%' THEN 1 ELSE 0 END) as second_round_students,
            SUM(CASE WHEN status LIKE '%راسب%' THEN 1 ELSE 0 END) as failed_students,
            SUM(CASE WHEN status LIKE '%غياب%' THEN 1 ELSE 0 END) as absent_students,
            AVG(total_score) as avg_score,
            MAX(total_score) as max_score,
            SUM(CASE WHEN percentage >= 90 THEN 1 ELSE 0 END) as range_90_100,
            SUM(CASE WHEN percentage >= 80 AND percentage < 90 THEN 1 ELSE 0 END) as range_80_90,
            SUM(CASE WHEN percentage >= 70 AND percentage < 80 THEN 1 ELSE 0 END) as range_70_80,
            SUM(CASE WHEN percentage >= 60 AND percentage < 70 THEN 1 ELSE 0 END) as range_60_70,
            SUM(CASE WHEN percentage >= 50 AND percentage < 60 THEN 1 ELSE 0 END) as range_50_60,
            SUM(CASE WHEN percentage < 50 THEN 1 ELSE 0 END) as range_below_50
        FROM students`,
        [],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                ...row,
                avg_score: Number((row.avg_score || 0).toFixed(2)),
                pass_rate: Number(((row.passed_students / row.total_students) * 100).toFixed(2))
            });
        }
    );
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] 🚀 Thanawya Backend running on 0.0.0.0:${PORT}`);
    console.log(`[Server] Health check: http://0.0.0.0:${PORT}/api/health`);
});
