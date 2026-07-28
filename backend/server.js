const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

function getDatabase() {
    const dbPath = path.join(__dirname, 'thanawya.db');
    if (!fs.existsSync(dbPath)) {
        const gzPath = path.join(__dirname, 'thanawya.db.gz');
        if (fs.existsSync(gzPath)) {
            console.log('Decompressing thanawya.db.gz to thanawya.db...');
            const compressed = fs.readFileSync(gzPath);
            const decompressed = zlib.gunzipSync(compressed);
            fs.writeFileSync(dbPath, decompressed);
            console.log('Decompressed database successfully!');
        }
    }
    return new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error('Failed to connect to Thanawya SQLite DB:', err);
        } else {
            console.log('Connected to Thanawya SQLite DB successfully at:', dbPath);
        }
    });
}

const db = getDatabase();

// Arabic text normalizer matching Python logic
function normalizeArabic(text) {
    if (!text) return "";
    let str = String(text).trim();
    str = str.replace(/[\u064B-\u0652]/g, "");
    str = str.replace(/[أإآا]/g, "ا");
    str = str.replace(/ى/g, "ي");
    str = str.replace(/ة/g, "ه");
    str = str.replace(/\s+/g, " ");
    return str.toLowerCase();
}

// Search Endpoint (By Seat Number or Name)
app.get('/api/search', (req, res) => {
    const query = (req.query.q || '').trim();
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    if (!query) {
        return res.json({ total: 0, page, limit, results: [] });
    }

    const isNumeric = /^\d+$/.test(query);

    if (isNumeric) {
        const seatNo = parseInt(query, 10);
        const countSql = `SELECT COUNT(*) AS total FROM students WHERE seating_no = ? OR seating_no LIKE ?`;
        const selectSql = `SELECT seating_no, student_name, total_score, max_score, percentage, status FROM students WHERE seating_no = ? OR seating_no LIKE ? ORDER BY seating_no ASC LIMIT ? OFFSET ?`;
        const seatPattern = `${query}%`;

        db.get(countSql, [seatNo, seatPattern], (err, countRow) => {
            if (err) return res.status(500).json({ error: err.message });

            db.all(selectSql, [seatNo, seatPattern, limit, offset], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({
                    total: countRow ? countRow.total : 0,
                    page,
                    limit,
                    results: rows || []
                });
            });
        });
    } else {
        const normalizedQuery = normalizeArabic(query);
        const searchPattern = `%${normalizedQuery}%`;

        const countSql = `SELECT COUNT(*) AS total FROM students WHERE search_name LIKE ?`;
        const selectSql = `SELECT seating_no, student_name, total_score, max_score, percentage, status FROM students WHERE search_name LIKE ? ORDER BY total_score DESC LIMIT ? OFFSET ?`;

        db.get(countSql, [searchPattern], (err, countRow) => {
            if (err) return res.status(500).json({ error: err.message });

            db.all(selectSql, [searchPattern, limit, offset], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({
                    total: countRow ? countRow.total : 0,
                    page,
                    limit,
                    results: rows || []
                });
            });
        });
    }
});

// Single Student Detail with Rank & Percentile
app.get('/api/student/:seating_no', (req, res) => {
    const seatingNo = parseInt(req.params.seating_no, 10);
    if (isNaN(seatingNo)) {
        return res.status(400).json({ error: 'رقم الجلوس غير صحيح' });
    }

    const studentSql = `SELECT seating_no, student_name, total_score, max_score, percentage, status FROM students WHERE seating_no = ?`;

    db.get(studentSql, [seatingNo], (err, student) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!student) return res.status(404).json({ error: 'لم يتم العثور على طالب برقم الجلوس هذا' });

        const rankSql = `SELECT COUNT(*) + 1 AS rank FROM students WHERE total_score > ?`;
        const lowerCountSql = `SELECT COUNT(*) AS lower_count FROM students WHERE total_score < ?`;
        const totalCountSql = `SELECT COUNT(*) AS total_students FROM students`;

        db.get(rankSql, [student.total_score], (err, rankRow) => {
            db.get(lowerCountSql, [student.total_score], (err, lowerRow) => {
                db.get(totalCountSql, [], (err, totalRow) => {
                    const totalStudents = totalRow ? totalRow.total_students : 919396;
                    const rank = rankRow ? rankRow.rank : 1;
                    const lowerCount = lowerRow ? lowerRow.lower_count : 0;
                    const percentile = Number(((lowerCount / totalStudents) * 100).toFixed(2));

                    res.json({
                        ...student,
                        national_rank: rank,
                        percentile: percentile,
                        total_students: totalStudents
                    });
                });
            });
        });
    });
});

// Top Students Leaderboard
app.get('/api/top-students', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const sql = `SELECT seating_no, student_name, total_score, max_score, percentage, status FROM students ORDER BY total_score DESC, seating_no ASC LIMIT ?`;

    db.all(sql, [limit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ results: rows || [] });
    });
});

// Overall Statistics
app.get('/api/stats', (req, res) => {
    const statsSql = `
        SELECT
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
        FROM students
    `;

    db.get(statsSql, [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        const passRate = row ? Number(((row.passed_students / row.total_students) * 100).toFixed(2)) : 0;
        res.json({
            ...row,
            avg_score: Number((row.avg_score || 0).toFixed(2)),
            pass_rate: passRate
        });
    });
});

app.listen(PORT, () => {
    console.log(`Thanawya Results Backend running on http://localhost:${PORT}`);
});
