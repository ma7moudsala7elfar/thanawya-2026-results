import React, { useState, useEffect } from 'react';
import { 
  Search, Award, BarChart3, GraduationCap, Trophy, CheckCircle2, 
  AlertTriangle, XCircle, Share2, Printer, RefreshCw, ArrowRight, UserCheck, Percent
} from 'lucide-react';
import confetti from 'canvas-confetti';

const API_BASE = '/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'top' | 'stats'
  const [searchMode, setSearchMode] = useState('seat'); // 'seat' | 'name'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Top students & stats state
  const [topStudents, setTopStudents] = useState([]);
  const [stats, setStats] = useState(null);

  // Trigger confetti for top performers
  const triggerCelebration = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Perform search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load student details
  const handleSelectStudent = async (seatingNo) => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_BASE}/student/${seatingNo}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'فشل في تحميل بيانات الطالب');
      }
      const data = await res.json();
      setSelectedStudent(data);
      if (data.percentage >= 90) {
        triggerCelebration();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (/^\d+$/.test(searchQuery.trim())) {
      handleSelectStudent(searchQuery.trim());
    } else if (searchResults.length > 0) {
      handleSelectStudent(searchResults[0].seating_no);
    }
  };

  // Fetch top students on tab change
  useEffect(() => {
    if (activeTab === 'top' && topStudents.length === 0) {
      fetch(`${API_BASE}/top-students?limit=50`)
        .then(res => res.json())
        .then(data => setTopStudents(data.results || []))
        .catch(err => console.error(err));
    } else if (activeTab === 'stats' && !stats) {
      fetch(`${API_BASE}/stats`)
        .then(res => res.json())
        .then(data => setStats(data))
        .catch(err => console.error(err));
    }
  }, [activeTab]);

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="header">
        <div className="brand">
          <div className="brand-icon">
            <GraduationCap />
          </div>
          <div className="brand-title">
            <h1>نتيجة الثانوية العامة 2026</h1>
            <p>جمهورية مصر العربية • النظام الحديث (الدور الأول)</p>
          </div>
        </div>

        <nav className="nav-tabs">
          <button 
            className={`nav-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Search size={18} />
            البحث عن نتيجة
          </button>
          <button 
            className={`nav-btn ${activeTab === 'top' ? 'active' : ''}`}
            onClick={() => setActiveTab('top')}
          >
            <Trophy size={18} />
            أوائل الجمهورية
          </button>
          <button 
            className={`nav-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <BarChart3 size={18} />
            إحصائيات النتيجة
          </button>
        </nav>
      </header>

      {/* Engineer Greeting Banner */}
      <div className="engineer-banner">
        <div className="engineer-banner-content">
          <span className="engineer-banner-sparkle">✨</span>
          <h2>المهندس محمود صلاح الفار يتمنى لكم النجاح والتوفيق</h2>
          <span className="engineer-banner-sparkle">✨</span>
        </div>
      </div>

      {/* SEARCH TAB */}
      {activeTab === 'search' && (
        <>
          {!selectedStudent ? (
            <div className="search-card">
              <div className="search-header">
                <h2>استعلم عن نتيجتك فوراً</h2>
                <p>قم بالإدخال برقم الجلوس أو اسم الطالب للبحث في قاعدة بيانات 2026 الرسمية</p>
              </div>

              <div className="search-box-wrapper">
                <div className="search-mode-selector">
                  <button 
                    className={`mode-chip ${searchMode === 'seat' ? 'active' : ''}`}
                    onClick={() => setSearchMode('seat')}
                  >
                    البحث برقم الجلوس
                  </button>
                  <button 
                    className={`mode-chip ${searchMode === 'name' ? 'active' : ''}`}
                    onClick={() => setSearchMode('name')}
                  >
                    البحث باسم الطالب
                  </button>
                </div>

                <form onSubmit={handleDirectSearch} className="search-input-group">
                  <span className="search-icon-right">
                    <Search size={22} />
                  </span>
                  <input 
                    type="text" 
                    placeholder={searchMode === 'seat' ? "أدخل رقم الجلوس (مثال: 2001970)" : "أدخل اسم الطالب (مثال: أحمد محمود)"}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="search-action-btn">
                    {loading ? 'جاري البحث...' : 'عرض النتيجة'}
                  </button>
                </form>

                {error && (
                  <div style={{ marginTop: '16px', color: '#EF4444', textAlign: 'center', fontWeight: '600' }}>
                    ⚠️ {error}
                  </div>
                )}

                {/* Auto Suggestions List */}
                {searchResults.length > 0 && (
                  <div className="suggestions-list">
                    {searchResults.map((st) => (
                      <div 
                        key={st.seating_no} 
                        className="suggestion-item"
                        onClick={() => handleSelectStudent(st.seating_no)}
                      >
                        <div>
                          <strong style={{ display: 'block', fontSize: '16px' }}>{st.student_name}</strong>
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>رقم الجلوس: {st.seating_no}</span>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontWeight: '800', color: 'var(--gold-glow)', fontSize: '17px' }}>
                            {st.percentage}%
                          </span>
                          <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>
                            ({st.total_score} / {st.max_score})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* STUDENT RESULT CARD */
            <div className="student-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <button 
                  onClick={() => setSelectedStudent(null)} 
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid var(--border-color)',
                    color: '#FFF',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontFamily: 'var(--font-arabic)'
                  }}
                >
                  <ArrowRight size={18} />
                  بحث عن طالب آخر
                </button>

                <div className={`status-badge ${
                  selectedStudent.status.includes('ناجح') ? 'status-passed' :
                  selectedStudent.status.includes('ثان') ? 'status-second' : 'status-failed'
                }`}>
                  {selectedStudent.status.includes('ناجح') && <CheckCircle2 size={18} />}
                  {selectedStudent.status.includes('ثان') && <AlertTriangle size={18} />}
                  {selectedStudent.status.includes('راسب') && <XCircle size={18} />}
                  {selectedStudent.status}
                </div>
              </div>

              {/* Certificate Main Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '30px', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '8px' }}>
                    {selectedStudent.student_name}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '20px' }}>
                    رقم الجلوس: <strong style={{ color: '#FFF' }}>{selectedStudent.seating_no}</strong> • شعبة النظام الحديث 2026
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>الترتيب على مستوى الجمهورية</span>
                      <p style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary-gold)', marginTop: '4px' }}>
                        المرتبة #{selectedStudent.national_rank?.toLocaleString()}
                      </p>
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>المستوى الأكاديمي</span>
                      <p style={{ fontSize: '22px', fontWeight: '800', color: '#34D399', marginTop: '4px' }}>
                        أعلى من {selectedStudent.percentile}% من الطلاب
                      </p>
                    </div>
                  </div>
                </div>

                {/* Score Circle Gauge */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="score-circle">
                    <span className="score-num">{selectedStudent.percentage}%</span>
                    <span className="score-max">{selectedStudent.total_score} من {selectedStudent.max_score}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <button 
                  onClick={() => window.print()}
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    border: 'none',
                    color: '#FFF',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontFamily: 'var(--font-arabic)',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Printer size={18} />
                  طباعة الشهادة (PDF)
                </button>
                <button 
                  onClick={() => alert(`تم نسخ رابط نتيجة الطالب ${selectedStudent.student_name}`)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid var(--border-color)',
                    color: '#FFF',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontFamily: 'var(--font-arabic)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Share2 size={18} />
                  مشاركة النتيجة
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* TOP STUDENTS TAB */}
      {activeTab === 'top' && (
        <div className="search-card">
          <div className="search-header">
            <h2>🏆 قائمة أوائل الثانوية العامة 2026</h2>
            <p>لوحة الشرف لأفضل المتفوقين على مستوى جمهورية مصر العربية</p>
          </div>

          <table className="grid-table">
            <thead>
              <tr>
                <th>الترتيب</th>
                <th>رقم الجلوس</th>
                <th>اسم الطالب</th>
                <th>المجموع الكلي</th>
                <th>النسبة المئوية</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {topStudents.map((st, index) => (
                <tr key={st.seating_no} style={{ cursor: 'pointer' }} onClick={() => { setActiveTab('search'); handleSelectStudent(st.seating_no); }}>
                  <td>
                    <div className={`rank-pill ${index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-other'}`}>
                      {index + 1}
                    </div>
                  </td>
                  <td><strong>{st.seating_no}</strong></td>
                  <td>{st.student_name}</td>
                  <td><strong>{st.total_score}</strong> / {st.max_score}</td>
                  <td><span style={{ color: 'var(--gold-glow)', fontWeight: '800' }}>{st.percentage}%</span></td>
                  <td><span className="status-badge status-passed">{st.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* STATS TAB */}
      {activeTab === 'stats' && stats && (
        <div className="search-card">
          <div className="search-header">
            <h2>📊 الإحصائيات العامة والدراسات التحليلية</h2>
            <p>تقرير معتمد لنتائج امتحانات الدور الأول للثانوية العامة 2026</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '30px' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>إجمالي الطلاب</span>
              <h3 style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px' }}>{stats.total_students?.toLocaleString()}</h3>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center' }}>
              <span style={{ color: '#34D399', fontSize: '14px' }}>نسبة النجاح العامة</span>
              <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#34D399', marginTop: '6px' }}>{stats.pass_rate}%</h3>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(245, 158, 11, 0.3)', textAlign: 'center' }}>
              <span style={{ color: '#FBBF24', fontSize: '14px' }}>طلاب الدور الثاني</span>
              <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#FBBF24', marginTop: '6px' }}>{stats.second_round_students?.toLocaleString()}</h3>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.3)', textAlign: 'center' }}>
              <span style={{ color: '#F87171', fontSize: '14px' }}>الراسبون</span>
              <h3 style={{ fontSize: '28px', fontWeight: '800', color: '#F87171', marginTop: '6px' }}>{stats.failed_students?.toLocaleString()}</h3>
            </div>
          </div>

          <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>توزيع النسبة المئوية للدرجات:</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: '90% إلى 100% (ممتاز مرتفع)', count: stats.range_90_100, color: '#F59E0B' },
              { label: '80% إلى 89.9% (جيد جداً)', count: stats.range_80_90, color: '#34D399' },
              { label: '70% إلى 79.9% (جيد)', count: stats.range_70_80, color: '#6366F1' },
              { label: '60% إلى 69.9% (مقبول)', count: stats.range_60_70, color: '#3B82F6' },
              { label: '50% إلى 59.9% (ضعيف)', count: stats.range_50_60, color: '#EC4899' },
              { label: 'أقل من 50%', count: stats.range_below_50, color: '#EF4444' }
            ].map((band, idx) => {
              const perc = ((band.count / stats.total_students) * 100).toFixed(1);
              return (
                <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px 18px', borderRadius: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
                    <span>{band.label}</span>
                    <strong>{band.count?.toLocaleString()} طالب ({perc}%)</strong>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ width: `${perc}%`, height: '100%', background: band.color, borderRadius: '5px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
