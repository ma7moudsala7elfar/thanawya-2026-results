#!/usr/bin/env python3
import os
import sys
import sqlite3
import subprocess
import csv
import re
import time

def normalize_arabic(text):
    if not text:
        return ""
    text = str(text).strip()
    # Remove Arabic diacritics (tashkeel)
    text = re.sub(r'[\u064B-\u0652]', '', text)
    # Normalize Alef variations
    text = re.sub(r'[أإآا]', 'ا', text)
    # Normalize Yaa
    text = re.sub(r'ى', 'ي', text)
    # Normalize Taa Marbouta
    text = re.sub(r'ة', 'ه', text)
    # Remove extra spaces
    text = re.sub(r'\s+', ' ', text)
    return text.lower()

def convert_accdb_to_sqlite(accdb_path, output_sqlite_path):
    print(f"Reading ACCDB file: {accdb_path}")
    if not os.path.exists(accdb_path):
        raise FileNotFoundError(f"File not found: {accdb_path}")

    start_time = time.time()
    table_name = "dbo_SEARCH_NEW"

    print(f"Exporting table '{table_name}' using mdb-export stream...")

    # Initialize SQLite DB
    if os.path.exists(output_sqlite_path):
        os.remove(output_sqlite_path)

    conn = sqlite3.connect(output_sqlite_path)
    cursor = conn.cursor()

    # PRAGMA optimizations for fast insertion
    cursor.execute("PRAGMA synchronous = OFF;")
    cursor.execute("PRAGMA journal_mode = MEMORY;")
    cursor.execute("PRAGMA cache_size = 100000;")

    cursor.execute('''
        CREATE TABLE students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seating_no INTEGER UNIQUE,
            student_name TEXT,
            search_name TEXT,
            total_score REAL,
            max_score REAL DEFAULT 320.0,
            percentage REAL,
            status TEXT
        )
    ''')

    proc = subprocess.Popen(['mdb-export', accdb_path, table_name], stdout=subprocess.PIPE, text=True, bufsize=1048576)

    reader = csv.reader(proc.stdout)
    header = next(reader, None)
    print(f"CSV Header detected: {header}")

    col_idx = {
        'seating_no': 0,
        'arabic_name': 1,
        'total_degree': 2,
        'student_case_desc': 3
    }
    if header:
        for idx, col in enumerate(header):
            c_clean = col.strip().lower()
            if 'seat' in c_clean or 'جلس' in c_clean:
                col_idx['seating_no'] = idx
            elif 'name' in c_clean or 'اسم' in c_clean:
                col_idx['arabic_name'] = idx
            elif 'total' in c_clean or 'degree' in c_clean or 'مجموع' in c_clean:
                col_idx['total_degree'] = idx
            elif 'case' in c_clean or 'desc' in c_clean or 'حال' in c_clean:
                col_idx['student_case_desc'] = idx

    batch = []
    batch_size = 50000
    inserted_count = 0

    for row in reader:
        if not row or len(row) <= max(col_idx.values()):
            continue

        try:
            seating_no = int(row[col_idx['seating_no']].strip())
        except ValueError:
            continue

        name = row[col_idx['arabic_name']].strip() if col_idx['arabic_name'] < len(row) else ""
        search_name = normalize_arabic(name)

        try:
            total_score = float(row[col_idx['total_degree']].strip())
        except ValueError:
            total_score = 0.0

        status = row[col_idx['student_case_desc']].strip() if col_idx['student_case_desc'] < len(row) else "ناجح دور أول"
        percentage = round((total_score / 320.0) * 100, 2) if total_score > 0 else 0.0

        batch.append((seating_no, name, search_name, total_score, 320.0, percentage, status))

        if len(batch) >= batch_size:
            cursor.executemany('''
                INSERT OR IGNORE INTO students (
                    seating_no, student_name, search_name, total_score, max_score, percentage, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', batch)
            inserted_count += len(batch)
            print(f"Inserted {inserted_count} records...")
            batch.clear()

    if batch:
        cursor.executemany('''
            INSERT OR IGNORE INTO students (
                seating_no, student_name, search_name, total_score, max_score, percentage, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', batch)
        inserted_count += len(batch)
        print(f"Inserted {inserted_count} total records.")

    proc.stdout.close()
    proc.wait()

    print("Creating indexes on seating_no, search_name, and total_score...")
    cursor.execute("CREATE INDEX idx_seating_no ON students(seating_no);")
    cursor.execute("CREATE INDEX idx_search_name ON students(search_name);")
    cursor.execute("CREATE INDEX idx_total_score ON students(total_score DESC);")

    conn.commit()

    # Restore default PRAGMAs after commit
    try:
        cursor.execute("PRAGMA synchronous = NORMAL;")
        cursor.execute("PRAGMA journal_mode = DELETE;")
    except Exception:
        pass

    conn.close()

    elapsed = time.time() - start_time
    print(f"Conversion completed in {elapsed:.2f} seconds! Database saved to: {output_sqlite_path}")

if __name__ == '__main__':
    accdb_file = sys.argv[1] if len(sys.argv) > 1 else "/home/mahmoud-salah/.gemini/antigravity-ide/scratch/thanawya-results/نسخة البحث الدور الأول 2026 - نظام حديث (1).accdb"
    out_db = sys.argv[2] if len(sys.argv) > 2 else "/home/mahmoud-salah/.gemini/antigravity-ide/scratch/thanawya-results/backend/thanawya.db"
    convert_accdb_to_sqlite(accdb_file, out_db)
