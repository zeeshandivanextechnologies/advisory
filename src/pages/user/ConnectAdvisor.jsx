import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/layout/AppHeader';
import { Spinner, EmptyState } from '../../components/common/index';
import { advisorAPI } from '../../services/api';
import { FaHistory, FaSearch } from 'react-icons/fa';
import { FaCalendar, FaPlus, FaUser } from 'react-icons/fa6';

const CATEGORY_TABS = ['All', 'Property', 'Civil', 'Corporate', 'Tax', 'Labor'];
const SORT_OPTIONS  = ['Available', 'Rating', 'Response Time'];

const AvailableBadge = ({ available }) => (
  <span style={{
    fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
    color: available ? '#16A34A' : '#EF4444',
  }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: available ? '#16A34A' : '#EF4444', display: 'inline-block' }} />
    {available ? 'Available Now' : 'Not Available'}
  </span>
);

export default function ConnectAdvisor() {
  const navigate                    = useNavigate();
  const [advisors, setAdvisors]     = useState([]);
  const [loading,  setLoading]      = useState(true);
  const [search,   setSearch]       = useState('');
  const [category, setCategory]     = useState('All');
  const [sort,     setSort]         = useState('Available');

  const load = useCallback(() => {
    setLoading(true);
    advisorAPI.list({ search, limit: 20 })
      .then(r => setAdvisors(r.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const getInitials = (name = '') =>
    name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  const getSpecializations = (raw) => {
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw || '[]'); } catch { return []; }
  };

  // Tabs map to the specialisations advisors pick in their settings
  const CATEGORY_MATCH = {
    Property:  ['real estate', 'property'],
    Civil:     ['contract', 'compliance', 'trademark', 'civil'],
    Corporate: ['corporate', 'm&a', 'licens'],
    Tax:       ['tax'],
    Labor:     ['employment', 'labor', 'labour', 'visa'],
  };
  const inCategory = (a) => {
    if (category === 'All') return true;
    const specs = getSpecializations(a.specializations).map(s => String(s).toLowerCase());
    return (CATEGORY_MATCH[category] || []).some(k => specs.some(s => s.includes(k)));
  };
  // No response-time data is tracked yet, so that option ranks by availability then rating
  const byAvailability = (x, y) => (y.is_available === 1) - (x.is_available === 1);
  const byRating       = (x, y) => Number(y.rating || 0) - Number(x.rating || 0);
  const sorters = {
    Available:       (x, y) => byAvailability(x, y) || byRating(x, y),
    Rating:          (x, y) => byRating(x, y) || byAvailability(x, y),
    'Response Time': (x, y) => byAvailability(x, y) || byRating(x, y),
  };
  const visibleAdvisors = advisors.filter(inCategory).sort(sorters[sort] || sorters.Available);

  return (
    <>
      <AppHeader
        breadcrumb="Connect with an advisory"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="thm-btn" onClick={() => navigate('/user/consultations')}>
              <FaHistory /> <span className='session-title-hd'>My Session</span>
            </button>
            <button className="thm-btn" onClick={() => navigate('/user/book-consultation')}>
              <FaPlus /> <span className='session-title-hd'>Book New Session</span>
            </button>
          </div>
        }
      />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ fontSize: 24, fontFamily: 'var(--font-h)', fontWeight: 600, color: '#000000', marginBottom: 4 }}>
            Connect Advisory
          </h4>
          <p style={{ fontSize: 14, fontWeight: 400, color: '#4A4949' }}>Verified Qatar jurisdiction specialists</p>
        </div>


        <div className='row mb-3'>
          {/* Search */}
          {/* <div style={{ position: 'relative', flex: '0 0 220px' }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark-4)' }} width={13} height={13} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx={11} cy={11} r={8} strokeWidth={2} /><path strokeLinecap="round" strokeWidth={2} d="M21 21l-4.35-4.35" />
            </svg>
            <input
              style={{ width: '100%', padding: '7px 10px 7px 28px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', fontSize: 12, background: 'white' }}
              placeholder="Search by name & specialty"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

  
          {CATEGORY_TABS.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-h)',
                border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)',
                background: category === c ? 'var(--lt-black)' : 'white',
                color: category === c ? 'white' : 'var(--text-dark-4)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >{c}</button>
          ))} */}

         <div className='col-lg-8 mb-lg-0 mb-3'>
           <div className="case-search-box">
  <div className="ai-custom-frm-bx mb-0">
    <input
      className="form-control"
      placeholder="Search by name & specialty"
      style={{ paddingLeft: "40px" }}
      value={search}
      onChange={e => setSearch(e.target.value)}
    />

    <div className="filter-search-box">
      <span>
        <FaSearch className="filter-icon-search fz-16 text-black" />
      </span>
    </div>
  </div>

  <div className="filter-tabs">
    <div className="nav nav-pills gap-2">
      {CATEGORY_TABS.map(c => (
        <button
          key={c}
          onClick={() => setCategory(c)}
          className={`nav-link filter-nav-btn ${category === c ? 'active' : ''}`}
        >
          {c}
        </button>
      ))}
    </div>
  </div>

</div>

         </div>


          <div className='col-lg-4'>
            <div className='text-end'>
              <select
              style={{ padding: '8px 20px 8px 10px', border: '1px solid #EDEDED', borderRadius: 'var(--radius-sm)', fontSize: 14, background: '#F7F7F7', appearance: 'none', cursor: 'pointer' }}
              value={sort}
              onChange={e => setSort(e.target.value)}
            >
              {SORT_OPTIONS.map(s => <option key={s} value={s}>Sort : {s}</option>)}
            </select>
            </div>
          </div>
        </div>

        {/* Advisor Grid */}
        {loading ? <Spinner /> : visibleAdvisors.length ? (
          <div className='row'>
            {visibleAdvisors.map(a => {
              const specs    = getSpecializations(a.specializations);
              const available = a.is_available === 1;
              const initials  = getInitials(a.full_name);

              return (
                <>
                {/* <div className='col-lg-6 col-md-6 col-12'
                  key={a.id}
                  
                >
                  <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #EDEDED',
              borderRadius: 'var(--radius)',
              padding: 20,
              height: '100%',
              boxShadow : '0px 2px 6px 0px #0000000A, 0px 6px 20px 0px #0000000F',
             transition: 'box-shadow 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: '#E5E7EB', border: '2px solid var(--border-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--text-dark)',
                        flexShrink: 0,
                      }}>
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--text-dark)', marginBottom: 2 }}>
                          {a.full_name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-dark-4)', lineHeight: 1.4 }}>
                          Senior Corporate Lawyer · QFC Specialist · {a.experience_yrs || 14} year
                        </div>
                      </div>
                    </div>
                    <AvailableBadge available={available} />
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    {(specs.length ? specs : ['Incorporation', 'QFC Law', 'M&A']).slice(0, 3).map(s => (
                      <span key={s} style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', background: '#F3F4F6', color: 'var(--text-dark-3)', borderRadius: 4 }}>
                        {s}
                      </span>
                    ))}
                  </div>


                  <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                    {[
                      { label: 'rating',   value: Number(a.rating || 4.9).toFixed(1) },
                      { label: 'Cases',    value: a.total_clients || 127 },
                      { label: 'Response', value: '2h' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--text-dark)' }}>{value}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-dark-4)' }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {available ? (
                    <button
                      className="thm-btn"
                      style={{ width: '100%', fontSize: 13 }}
                      onClick={() => navigate('/user/book-consultation', { state: { advisor: a } })}
                    >
                      <FaUser /> Book Consultant
                    </button>
                  ) : (
                    <button
                      style={{
                        width: '100%', padding: '10px', fontSize: 13, fontWeight: 600,
                        fontFamily: 'var(--font-h)', border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-sm)', background: 'white',
                        color: 'var(--text-dark)', cursor: 'pointer',
                      }}
                      onClick={() => navigate('/user/book-consultation', { state: { advisor: a } })}
                    >
                      📅 Schedule Session
                    </button>
                  )}
                  </div>
                </div> */}

                <div className="col-lg-6 col-md-6 col-sm-12 mb-3" key={a.id}>
  <div
    className="professional-card"
    onMouseEnter={e => e.currentTarget.classList.add('hover')}
    onMouseLeave={e => e.currentTarget.classList.remove('hover')}
  >

    <div className="pro-card-header">
      <div className="pro-avatar">
        <span className="pro-avatar-icon">{initials}</span>
      </div>

      <div className="pro-info">
        <span className={`pro-status ${available ? 'available' : 'busy'}`}>
          {available ? '● Available Now' : 'Not Available'}
        </span>
      </div>
    </div>

    <div>
      <div className="pro-name">
        <h4>{a.full_name}</h4>
      </div>
      <div className="pro-title">
        <p>
          Senior Corporate Lawyer · QFC Specialist · {a.experience_yrs || 14} year
        </p>
      </div>
    </div>

  
    <div className="pro-cases">
      <ul className="pro-lists">
        {(specs.length ? specs : ['Incorporation', 'QFC Law', 'M&A'])
          .slice(0, 3)
          .map((s, i) => (
            <li key={i} className="pro-items">
              <span className="pro-names">{s}</span>
            </li>
          ))}
      </ul>
    </div>


    <div className="pro-stats">
      <div>
        <h6>{Number(a.rating || 4.9).toFixed(1)}</h6>
        <p>Rating</p>
      </div>

      <div>
        <h6>{a.total_clients || 127}</h6>
        <p>Cases</p>
      </div>

      <div>
        <h6>2h</h6>
        <p>Response</p>
      </div>
    </div>

    <button
      onClick={() =>
        navigate('/user/book-consultation', { state: { advisor: a } })
      }
      className={`pro-btn ${
        available ? 'thm-btn' : 'thm-btn outline'
      }`}
    >
      {available ? (
        <>
          <FaUser /> Book Consultant
        </>
      ) : (
        <>
          <FaCalendar /> Schedule Session
        </>
      )}
    </button>
  </div>
</div>

                
                </>
              );
            })}
            
          </div>
        ) : (
          <EmptyState icon="👤" title="No advisors found" text="Try a different search or category" />
        )}
      </div>
    </>
  );
}
