import React, { useState, useEffect } from 'react';
import { 
  Search, Award, BarChart3, GraduationCap, Trophy, CheckCircle2, 
  AlertTriangle, XCircle, Share2, Printer, RefreshCw, ArrowRight, UserCheck, ChevronLeft, ChevronRight, X, BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'top' | 'stats'
  const [searchMode, setSearchMode] = useState('seat'); // 'seat' | 'name'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
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

  // Perform search query with pagination
  const executeSearch = async (query, pageNum = 1) => {
    const trimmed = (query || '').trim();
    if (!trimmed) return;

    try {
      setLoading(true);
      setError('');
      setActiveQuery(trimmed);
      setCurrentPage(pageNum);

      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(trimmed)}&page=${pageNum}&limit=20`);
      if (!res.ok) throw new Error('فشل في جلب نتائج البحث');
      const data = await res.json();
      
      setSearchResults(data.results || []);
      setTotalResults(data.total || 0);

      // If exact seating number match with only 1 result, auto open
      if (/^\d+$/.test(trimmed) && data.results && data.results.length === 1) {
        handleSelectStudent(data.results[0].seating_no);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError('حدث خطأ أثناء إجراء البحث');
    } finally {
      setLoading(false);
    }
  };

  // Live search debounce (minimum 2 chars)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      if (searchQuery === '') {
        setSearchResults([]);
        setTotalResults(0);
        setActiveQuery('');
      }
      return;
    }

    if (trimmed.length < 2 && !/^\d+$/.test(trimmed)) {
      return;
    }

    const timer = setTimeout(() => {
      executeSearch(trimmed, 1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveQuery('');
    setSearchResults([]);
    setTotalResults(0);
    setError('');
  };

  // Load detailed student profile
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

  const handleDirectSearchSubmit = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!searchQuery.trim()) return;
    executeSearch(searchQuery, 1);
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

  const totalPages = Math.ceil(totalResults / 20);

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
            <Search size={16} />
            <span>بحث</span>
          </button>
          <button 
            className={`nav-btn ${activeTab === 'top' ? 'active' : ''}`}
            onClick={() => setActiveTab('top')}
          >
            <Trophy size={16} />
            <span>الأوائل</span>
          </button>
          <button 
            className={`nav-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <BarChart3 size={16} />
            <span>الإحصائيات</span>
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
                    onClick={() => { setSearchMode('seat'); handleClearSearch(); }}
                  >
                    البحث برقم الجلوس
                  </button>
                  <button 
                    className={`mode-chip ${searchMode === 'name' ? 'active' : ''}`}
                    onClick={() => { setSearchMode('name'); handleClearSearch(); }}
                  >
                    البحث باسم الطالب
                  </button>
                </div>

                <form onSubmit={handleDirectSearchSubmit} className="search-input-group">
                  <span className="search-icon-right">
                    <Search size={20} />
                  </span>
                  <input 
                    type="text" 
                    placeholder={searchMode === 'seat' ? "أدخل رقم الجلوس (مثال: 2001970)" : "أدخل اسم الطالب (مثال: أحمد محمود)"}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button type="button" onClick={handleClearSearch} className="search-clear-btn" title="مسح">
                      <X size={16} />
                    </button>
                  )}
                  <button type="submit" className="search-action-btn">
                    {loading ? 'جاري البحث...' : 'عرض النتيجة'}
                  </button>
                </form>

                {error && (
                  <div className="search-error-msg">
                    ⚠️ {error}
                  </div>
                )}
              </div>

              {/* FULL EMBEDDED SEARCH RESULTS SECTION */}
              {activeQuery && (
                <div className="full-results-container">
                  <div className="results-summary-header">
                    <h3>
                      نتائج البحث عن: <span className="query-highlight">"{activeQuery}"</span>
                    </h3>
                    <span className="results-count-badge">
                      {totalResults} طالب مطبق
                    </span>
                  </div>

                  {searchResults.length === 0 && !loading ? (
                    <div className="no-results-box">
                      لم نجد أي نتائج تطابق "{activeQuery}". تأكد من كتابة الاسم أو رقم الجلوس بشكل صحيح.
                    </div>
                  ) : (
                    <div className="full-results-list">
                      {searchResults.map((st) => (
                        <div 
                          key={st.seating_no} 
                          className="result-row-card"
                          onClick={() => handleSelectStudent(st.seating_no)}
                        >
                          <div className="result-row-main">
                            <strong className="result-student-name">{st.student_name}</strong>
                            <div className="result-student-meta">
                              <span>رقم الجلوس: <strong>{st.seating_no}</strong></span>
                              <span className={`status-badge-sm ${
                                st.status.includes('ناجح') ? 'status-passed' :
                                st.status.includes('ثان') ? 'status-second' : 'status-failed'
                              }`}>
                                {st.status}
                              </span>
                            </div>
                          </div>

                          <div className="result-row-score">
                            <div className="score-badge-inline">
                              <span className="perc-num">{st.percentage}%</span>
                              <span className="score-sub">({st.total_score} / {st.max_score})</span>
                            </div>
                            <button className="btn-view-details">
                              عرض الشهادة
                              <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="pagination-bar">
                      <button 
                        disabled={currentPage === 1 || loading}
                        onClick={() => executeSearch(activeQuery, currentPage - 1)}
                        className="btn-page"
                      >
                        <ChevronRight size={18} />
                        الصفحة السابقة
                      </button>

                      <span className="page-indicator">
                        صفحة {currentPage} من {totalPages}
                      </span>

                      <button 
                        disabled={currentPage === totalPages || loading}
                        onClick={() => executeSearch(activeQuery, currentPage + 1)}
                        className="btn-page"
                      >
                        الصفحة التالية
                        <ChevronLeft size={18} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* STUDENT RESULT CARD */
            <div className="student-card">
              <div className="student-card-header">
                <button 
                  onClick={() => setSelectedStudent(null)} 
                  className="btn-back"
                >
                  <ArrowRight size={18} />
                  <span>الرجوع لنتائج البحث</span>
                </button>

                <div className={`status-badge ${
                  selectedStudent.status.includes('ناجح') ? 'status-passed' :
                  selectedStudent.status.includes('ثان') ? 'status-second' : 'status-failed'
                }`}>
                  {selectedStudent.status.includes('ناجح') && <CheckCircle2 size={18} />}
                  {selectedStudent.status.includes('ثان') && <AlertTriangle size={18} />}
                  {selectedStudent.status.includes('راسب') && <XCircle size={18} />}
                  <span>{selectedStudent.status}</span>
                </div>
              </div>

              {/* Certificate Main Details */}
              <div className="student-cert-grid">
                <div className="student-main-details">
                  <h2 className="student-name-title">
                    الأسم: {selectedStudent.student_name}
                  </h2>
                  <p className="student-sub-info">
                    حالة الطالب: <strong>{selectedStudent.status}</strong> • الشعبة: <strong>{selectedStudent.track_name || 'علمي علوم'}</strong> • رقم الجلوس: <strong>{selectedStudent.seating_no}</strong>
                  </p>

                  <div className="student-metrics-grid">
                    <div className="metric-box">
                      <span className="metric-label">الترتيب على مستوى الجمهورية</span>
                      <p className="metric-value metric-gold">
                        المرتبة #{selectedStudent.national_rank?.toLocaleString()}
                      </p>
                    </div>

                    <div className="metric-box">
                      <span className="metric-label">المستوى الأكاديمي</span>
                      <p className="metric-value metric-emerald">
                        أعلى من {selectedStudent.percentile}% من الطلاب
                      </p>
                    </div>
                  </div>
                </div>

                {/* Score Circle Gauge */}
                <div className="score-gauge-wrapper">
                  <div className="score-circle">
                    <span className="score-num">{selectedStudent.percentage}%</span>
                    <span className="score-max">{selectedStudent.total_score} من {selectedStudent.max_score}</span>
                  </div>
                </div>
              </div>

              {/* Subject Breakdown Table Matching Official Portal Layout Exactly */}
              {selectedStudent.subjects && selectedStudent.subjects.length > 0 && (
                <div className="student-subjects-section">
                  <div className="table-responsive">
                    <table className="grid-table subjects-table-official">
                      <thead>
                        <tr>
                          <th>المادة</th>
                          <th>الدرجة</th>
                          <th>النسبة المئوية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStudent.subjects.map((sub, idx) => {
                          if (!sub.isEnrolled) {
                            return (
                              <tr key={idx} className="tr-not-enrolled">
                                <td className="subject-name-cell">{sub.name}</td>
                                <td className="subject-score-cell">
                                  <span className="score-ratio">غير مقرر / {sub.max}</span>
                                </td>
                                <td>
                                  <span className="perc-dash">—</span>
                                </td>
                              </tr>
                            );
                          }
                          const perc = typeof sub.percentage === 'string' && sub.percentage.includes('%') 
                            ? sub.percentage 
                            : `${((sub.score / sub.max) * 100).toFixed(1)}%`;
                          const scoreDisplay = typeof sub.score === 'number' 
                            ? `${sub.max} / ${sub.score}` 
                            : sub.score;
                          return (
                            <tr key={idx}>
                              <td className="subject-name-cell">{sub.name}</td>
                              <td className="subject-score-cell">
                                <span className="score-ratio">{scoreDisplay}</span>
                              </td>
                              <td>
                                <span className="perc-cyan">{perc}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Dark Summary Footer Banner */}
                  <div className="official-summary-footer">
                    <div className="summary-col">
                      <span className="sum-label">النسبة المئوية الكلية</span>
                      <strong className="sum-val">% {selectedStudent.percentage}</strong>
                    </div>
                    <div className="summary-col">
                      <span className="sum-label">مجموع الدرجات</span>
                      <strong className="sum-val">{selectedStudent.max_score} / {typeof selectedStudent.total_score === 'number' ? selectedStudent.total_score.toFixed(2) : selectedStudent.total_score}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="student-actions-bar">
                <button 
                  onClick={() => window.print()}
                  className="btn-print"
                >
                  <Printer size={18} />
                  <span>تنزيل (PDF)</span>
                </button>
                <button 
                  onClick={() => alert(`تم نسخ رابط نتيجة الطالب ${selectedStudent.student_name}`)}
                  className="btn-share"
                >
                  <Share2 size={18} />
                  <span>مشاركة النتيجة</span>
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

          <div className="table-responsive">
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
                  <tr key={st.seating_no} className="table-row-clickable" onClick={() => { setActiveTab('search'); handleSelectStudent(st.seating_no); }}>
                    <td>
                      <div className={`rank-pill ${index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-other'}`}>
                        {index + 1}
                      </div>
                    </td>
                    <td><strong>{st.seating_no}</strong></td>
                    <td className="student-table-name">{st.student_name}</td>
                    <td><strong>{st.total_score}</strong> / {st.max_score}</td>
                    <td><span className="perc-highlight">{st.percentage}%</span></td>
                    <td><span className="status-badge status-passed">{st.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STATS TAB */}
      {activeTab === 'stats' && stats && (
        <div className="search-card">
          <div className="search-header">
            <h2>📊 الإحصائيات العامة والدراسات التحليلية</h2>
            <p>تقرير معتمد لنتائج امتحانات الدور الأول للثانوية العامة 2026</p>
          </div>

          <div className="stats-cards-grid">
            <div className="stat-summary-card">
              <span className="stat-label">إجمالي الطلاب</span>
              <h3 className="stat-value">{stats.total_students?.toLocaleString()}</h3>
            </div>
            <div className="stat-summary-card stat-card-passed">
              <span className="stat-label">نسبة النجاح العامة</span>
              <h3 className="stat-value">{stats.pass_rate}%</h3>
            </div>
            <div className="stat-summary-card stat-card-second">
              <span className="stat-label">طلاب الدور الثاني</span>
              <h3 className="stat-value">{stats.second_round_students?.toLocaleString()}</h3>
            </div>
            <div className="stat-summary-card stat-card-failed">
              <span className="stat-label">الراسبون</span>
              <h3 className="stat-value">{stats.failed_students?.toLocaleString()}</h3>
            </div>
          </div>

          <h3 className="bands-section-title">توزيع النسبة المئوية للدرجات:</h3>

          <div className="bands-list">
            {[
              { label: '90% إلى 100% (ممتاز مرتفع)', count: stats.range_90_100, color: '#4F46E5' },
              { label: '80% إلى 89.9% (جيد جداً)', count: stats.range_80_90, color: '#16A34A' },
              { label: '70% إلى 79.9% (جيد)', count: stats.range_70_80, color: '#2563EB' },
              { label: '60% إلى 69.9% (مقبول)', count: stats.range_60_70, color: '#0284C7' },
              { label: '50% إلى 59.9% (ضعيف)', count: stats.range_50_60, color: '#D97706' },
              { label: 'أقل من 50%', count: stats.range_below_50, color: '#DC2626' }
            ].map((band, idx) => {
              const perc = ((band.count / stats.total_students) * 100).toFixed(1);
              return (
                <div key={idx} className="band-item">
                  <div className="band-header">
                    <span>{band.label}</span>
                    <strong>{band.count?.toLocaleString()} طالب ({perc}%)</strong>
                  </div>
                  <div className="band-bar-track">
                    <div className="band-bar-fill" style={{ width: `${perc}%`, background: band.color }} />
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
