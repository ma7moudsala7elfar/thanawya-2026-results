#!/usr/bin/env python3
import os
import sqlite3
import random
import re

def normalize_arabic(text):
    if not text:
        return ""
    text = str(text).strip()
    text = re.sub(r'[\u064B-\u0652]', '', text)
    text = re.sub(r'[أإآا]', 'ا', text)
    text = re.sub(r'ى', 'ي', text)
    text = re.sub(r'ة', 'ه', text)
    text = re.sub(r'\s+', ' ', text)
    return text.lower()

FIRST_NAMES_MALE = [
    "أحمد", "محمد", "محمود", "عمر", "علي", "مصطفى", "إبراهيم", "يوسف", "حسن", "حسين",
    "عبدالرحمن", "عبدالله", "زياد", "كريم", "خالد", "عمرو", "حمزة", "طارق", "مروان", "ياسين",
    "أمير", "أيمن", "سامح", "شريف", "حازم", "سيف", "مازن", "أنس", "وليد", "هاني"
]

FIRST_NAMES_FEMALE = [
    "مريم", "فاطمة", "آية", "سارة", "نور", "منة الله", "هدى", "رحمة", "إسراء", "دعاء",
    "منى", "سلمى", "حبيبة", "شهد", "روان", "ملك", "يارا", "جنى", "رانيا", "بسنت",
    "ندى", "أميرة", "إيمان", "مي", "رضوى", "فرح", "نورهان", "خلود", "أسماء", "دينا"
]

FATHER_NAMES = [
    "محمد", "أحمد", "محمود", "علي", "حسن", "إبراهيم", "مصطفى", "عبدالله", "حسين", "سيد",
    "عبدالرحمن", "خالد", "صلاح", "عادل", "طارق", "سامي", "فتحي", "جمال", "فاروق", "مجدي"
]

FAMILY_NAMES = [
    "السيد", "الشريف", "العوضي", "رضوان", "سليمان", "خليل", "شاهين", "زهران", "منصور", "عمران",
    "بدوي", "يوسف", "الشافعي", "القاضي", "زكي", "غانم", "سالم", "حماد", "عثمان", "مطاوع"
]

SCHOOLS = [
    "مدرسة السعيدية الثانوية بنين",
    "مدرسة الأورمان الثانوية بنات",
    "مدرسة الطبري الثانوية بنين",
    "مدرسة المتفوقين في العلوم والتكنولوجيا STEM 6 أكتوبر",
    "مدرسة الشهيد جواد حسني الثانوية",
    "مدرسة عباس العقاد الثانوية بنات",
    "مدرسة المقريزي الثانوية بنين",
    "مدرسة النصر الثانوية بنين",
    "مدرسة جمال عبدالناشر الثانوية بنين",
    "مدرسة أم المؤمنين الثانوية بنات",
    "مدرسة الشهيد أحمد المنسي الثانوية",
    "مدرسة الإبراهيمية الثانوية بنين"
]

DIRECTORATES_ADMINS = [
    ("القاهرة", "إدارة عابدين التعليمية"),
    ("القاهرة", "إدارة مصر الجديدة التعليمية"),
    ("القاهرة", "إدارة النزهة التعليمية"),
    ("الجيزة", "إدارة الدقي التعليمية"),
    ("الجيزة", "إدارة 6 أكتوبر التعليمية"),
    ("الجيزة", "إدارة الهرم التعليمية"),
    ("الإسكندرية", "إدارة شرق التعليمية"),
    ("الإسكندرية", "إدارة وسط التعليمية"),
    ("الدقهلية", "إدارة المنصورة التعليمية"),
    ("الشرقية", "إدارة الزقازيق التعليمية"),
    ("أسيوط", "إدارة أسيوط التعليمية"),
    ("الغربية", "إدارة طنطا التعليمية")
]

SECTIONS = [
    "علمي علوم",
    "علمي رياضة",
    "أدبي",
    "STEM متفوقين"
]

def generate_db(db_path):
    if os.path.exists(db_path):
        os.remove(db_path)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seating_no TEXT UNIQUE,
            student_name TEXT,
            search_name TEXT,
            school TEXT,
            directorate TEXT,
            administration TEXT,
            section TEXT,
            status TEXT,
            total_score REAL,
            max_score REAL DEFAULT 410.0,
            percentage REAL,
            arabic REAL,
            foreign_lang_1 REAL,
            foreign_lang_2 REAL,
            pure_math REAL,
            appl_math REAL,
            chemistry REAL,
            physics REAL,
            biology REAL,
            geology REAL,
            history REAL,
            geography REAL,
            philosophy REAL,
            psychology REAL,
            religion REAL,
            civics REAL,
            statistics REAL
        )
    ''')

    random.seed(42)
    students = []
    start_seating_no = 100001
    num_students = 2500

    print(f"Generating {num_students} realistic student records...")

    for i in range(num_students):
        seating_no = str(start_seating_no + i)
        is_male = random.choice([True, False])
        first = random.choice(FIRST_NAMES_MALE if is_male else FIRST_NAMES_FEMALE)
        father = random.choice(FATHER_NAMES)
        grand = random.choice(FATHER_NAMES)
        family = random.choice(FAMILY_NAMES)
        
        full_name = f"{first} {father} {grand} {family}"
        search_name = normalize_arabic(full_name)

        directorate, administration = random.choice(DIRECTORATES_ADMINS)
        school = random.choice(SCHOOLS)
        section = random.choice(SECTIONS)

        # Subject marks (Max scores in Egyptian Thanawya Amma: Arabic 80, Eng 50, Fr 40, Chem 60, Phys 60, Bio 60, Geo 60, Pure Math 60, Appl Math 60, Hist 60, Geog 60, Phil 60, Psych 60)
        # Total max: 410 (Regular) or 600 (STEM)
        
        # Skill level distribution: Top student, Excellent, Good, Average, Failed
        skill = random.choices(["top", "excellent", "good", "average", "low", "fail"], weights=[1, 10, 35, 35, 15, 4])[0]
        
        if skill == "top":
            perf = random.uniform(0.96, 0.995)
        elif skill == "excellent":
            perf = random.uniform(0.85, 0.95)
        elif skill == "good":
            perf = random.uniform(0.70, 0.84)
        elif skill == "average":
            perf = random.uniform(0.55, 0.69)
        elif skill == "low":
            perf = random.uniform(0.45, 0.54)
        else:
            perf = random.uniform(0.30, 0.44)

        def mark(max_m):
            variation = random.uniform(-0.08, 0.05)
            val = round(max(0.0, min(max_m, max_m * (perf + variation))), 1)
            return val

        arabic = mark(80)
        fl1 = mark(50)
        fl2 = mark(40)

        pure_math = appl_math = chemistry = physics = biology = geology = history = geography = philosophy = psychology = None

        if section == "علمي علوم":
            chemistry = mark(60)
            physics = mark(60)
            biology = mark(60)
            geology = mark(60)
            total_score = round(arabic + fl1 + fl2 + chemistry + physics + biology + geology, 1)
            max_score = 410.0
        elif section == "علمي رياضة":
            chemistry = mark(60)
            physics = mark(60)
            pure_math = mark(60)
            appl_math = mark(60)
            total_score = round(arabic + fl1 + fl2 + chemistry + physics + pure_math + appl_math, 1)
            max_score = 410.0
        elif section == "أدبي":
            history = mark(60)
            geography = mark(60)
            philosophy = mark(60)
            psychology = mark(60)
            total_score = round(arabic + fl1 + fl2 + history + geography + philosophy + psychology, 1)
            max_score = 410.0
        else: # STEM
            chemistry = mark(60)
            physics = mark(60)
            pure_math = mark(60)
            biology = mark(60)
            total_score = round(arabic + fl1 + fl2 + chemistry + physics + pure_math + biology, 1)
            max_score = 410.0

        perc = round((total_score / max_score) * 100, 2)

        if perc >= 50.0:
            status = "ناجح"
        elif perc >= 40.0:
            status = "دور ثانٍ"
        else:
            status = "راسب"

        # Non-added subjects
        religion = mark(40)
        civics = mark(25)
        statistics = mark(25)

        students.append((
            seating_no, full_name, search_name, school, directorate, administration, section, status,
            total_score, max_score, perc,
            arabic, fl1, fl2, pure_math, appl_math, chemistry, physics, biology, geology,
            history, geography, philosophy, psychology, religion, civics, statistics
        ))

    cursor.executemany('''
        INSERT INTO students (
            seating_no, student_name, search_name, school, directorate, administration, section, status,
            total_score, max_score, percentage,
            arabic, foreign_lang_1, foreign_lang_2, pure_math, appl_math, chemistry, physics, biology, geology,
            history, geography, philosophy, psychology, religion, civics, statistics
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', students)

    # Add indexes
    cursor.execute('CREATE INDEX idx_seating_no ON students(seating_no);')
    cursor.execute('CREATE INDEX idx_search_name ON students(search_name);')
    cursor.execute('CREATE INDEX idx_section_score ON students(section, total_score DESC);')
    cursor.execute('CREATE INDEX idx_total_score ON students(total_score DESC);')

    conn.commit()
    conn.close()
    print(f"Demo Thanawya database generated at: {db_path}")

if __name__ == '__main__':
    target_path = os.path.join(os.path.dirname(__file__), "..", "thanawya.db")
    generate_db(target_path)
