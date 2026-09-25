import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppHeader from '../../components/layout/AppHeader';
import { showToast } from '../../components/common/index';
import { advisorAPI, userAPI, caseAPI, documentAPI } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';

const DAYS   = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const TIMES  = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// "10:00 AM" on a given day → Date
const slotDate = (day, label) => {
  const [h, rest] = label.split(':');
  const [min, ampm] = rest.split(' ');
  let hour = parseInt(h, 10);
  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  const dt = new Date(day);
  dt.setHours(hour, parseInt(min, 10), 0, 0);
  return dt;
};

const parseSpecs = (raw) => {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw || '[]'); } catch { return []; }
};

const SESSION_TYPES = [
  { label: 'Video Consultation (60 min)', medium: 'video', duration: 60 },
  { label: 'Discovery Call — Video (45 min)', medium: 'video', duration: 45 },
  { label: 'Video Consultation (90 min)', medium: 'video', duration: 90 },
  { label: 'Phone Consultation (30 min)', medium: 'phone', duration: 30 },
  { label: 'Phone Consultation (60 min)', medium: 'phone', duration: 60 },
  { label: 'In-Person Meeting (60 min)',  medium: 'in_person', duration: 60 },
];

function CalendarPicker({ selectedDate, onSelect }) {
  const [viewDate, setViewDate] = useState(new Date());
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMon = new Date(year, month + 1, 0).getDate();
  const offset    = (firstDay + 6) % 7;

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMon; d++) cells.push(d);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16  }}>
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}> <MdChevronLeft /> </button>
        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--text-dark)' }}>
          {MONTHS[month]} {year}
        </span>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}><MdChevronRight />
</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8,  }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-dark-4)', letterSpacing: '0.05em' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const cellDate = new Date(year, month, d); cellDate.setHours(0,0,0,0);
          const isPast     = cellDate < today;
          const isToday    = cellDate.getTime() === today.getTime();
          const isSelected = selectedDate && cellDate.getTime() === selectedDate.getTime();
          return (
            <button
                key={i}
                onClick={() => !isPast && onSelect(cellDate)}
                disabled={isPast}
                className={`advisor-calendar-btn 
                  ${isToday ? 'today' : ''} 
                  ${isSelected ? 'selected' : ''} 
                  ${isPast ? 'past' : ''}`}
              >
                {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function BookConsultation() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { currency } = useSettings();
  const preAdvisor  = location.state?.advisor || location.state?.followUp?.advisor;

  const [advisors,  setAdvisors]  = useState([]);
  const [cases,     setCases]     = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading,   setLoading]   = useState(false);

  const [form, setForm] = useState({
    advisor_id:    preAdvisor?.id || '',
    session_type:  SESSION_TYPES[0].label,
    related_case:  '',
    document_id:   '',
    session_brief: '',
  });

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    advisorAPI.list({ limit: 100 }).then(r => setAdvisors(r.data.data || [])).catch(console.error);
    caseAPI.list({ limit: 50 })
      .then(r => setCases((r.data.data || []).filter(c => !['closed', 'cancelled'].includes(c.status))))
      .catch(console.error);
    documentAPI.list({ limit: 100 }).then(r => setDocuments(r.data.data || [])).catch(console.error);
  }, []);

  const selectedAdvisor   = advisors.find(a => a.id === Number(form.advisor_id))
    || (preAdvisor && Number(preAdvisor.id) === Number(form.advisor_id) ? preAdvisor : null);
  const selectedSessionType = SESSION_TYPES.find(s => s.label === form.session_type) || SESSION_TYPES[0];
  const advisorUnavailable  = selectedAdvisor && selectedAdvisor.is_available !== undefined && selectedAdvisor.is_available !== 1;

  // Slots already in the past (today) can't be booked
  const isPastSlot = (label) => !selectedDate || slotDate(selectedDate, label) <= new Date();

  // Picking another day clears a time that is no longer valid
  useEffect(() => {
    if (selectedTime && isPastSlot(selectedTime)) setSelectedTime('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Same formula as the backend: hourly rate × duration
  const rate = Number(selectedAdvisor?.hourly_rate || 0);
  const fee  = rate > 0 ? Math.round(rate * selectedSessionType.duration / 60 * 100) / 100 : 0;

  const formatBookDate = () => {
    if (!selectedDate) return '—';
    return `${MONTHS[selectedDate.getMonth()].substring(0,3)} ${selectedDate.getDate()} · ${selectedTime || '—'}`;
  };

  const handleBook = async () => {
    if (!form.advisor_id) return showToast('Please select an advisor', 'error');
    if (!selectedDate || !selectedTime) return showToast('Please select a date and time', 'error');
    if (advisorUnavailable) return showToast('This advisor is not accepting bookings right now', 'error');
    const dt = slotDate(selectedDate, selectedTime);
    if (dt <= new Date()) {
      setSelectedTime('');
      return showToast('That time has already passed. Please pick a later slot.', 'error');
    }
    setLoading(true);
    try {

      await userAPI.bookConsultation({
        advisor_id:   Number(form.advisor_id),
        scheduled_at: dt.toISOString(),
        duration_min: selectedSessionType.duration,
        medium:       selectedSessionType.medium,
        user_notes:   form.session_brief,
        case_id:      form.related_case || undefined,
        document_id:  form.document_id || undefined,
      });

      showToast('Consultation booked! Check your email for confirmation.');
      navigate('/user/consultations');
    } catch (err) {
      showToast(err.response?.data?.message || 'Booking failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const advisorSpecialization = parseSpecs(selectedAdvisor?.specializations)[0] || null;

  return (
    <>
      <AppHeader breadcrumb="Book Consultation" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ fontSize: 24, fontFamily: 'var(--font-h)', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 0 }}>
            Book a Consultation
          </h4>
          {selectedAdvisor && (
            <p className='mb-0' style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-dark-3)' }}>
              {selectedAdvisor.full_name}
              {advisorSpecialization ? ` · ${advisorSpecialization}` : ''}
            </p>
          )}
        </div>

        <div className='row'>
          <div className='col-lg-9 col-md-12 col-sm-12 mb-lg-0 mb-3'>
            <div className='advisor-consultation-cards mb-3'>
            <h3 style={{ fontSize: 14, fontFamily: 'var(--font-h)', fontWeight: 700, color: 'var(--text-dark)', marginBottom: 18 }}>
              Session Details
            </h3>

            <div className='consultation-book-form'>
              <div className="form-group">
                <label className="form-label">Advisor</label>
                <select className="form-select" value={form.advisor_id} onChange={e => set('advisor_id', e.target.value)}>
                  <option value="">Select advisor</option>
                  {advisors.map(a => (
                    <option key={a.id} value={a.id} disabled={a.is_available !== 1}>
                      {a.full_name}{a.is_available !== 1 ? ' (not available)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Session Type</label>
                <select className="form-select" value={form.session_type} onChange={e => set('session_type', e.target.value)}>
                  {SESSION_TYPES.map(s => <option key={s.label}>{s.label}</option>)}
                </select>
              </div>
            </div>

            <div className='consultation-book-form'>
              <div className="form-group">
                <label className="form-label">Related Case</label>
                <select className="form-select" value={form.related_case} onChange={e => set('related_case', e.target.value)}>
                  <option value="">Select case (optional)</option>
                  {cases.map(c => <option key={c.id} value={c.id}>{c.case_number} · {c.title?.substring(0, 25)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Related Document</label>
                <select className="form-select" value={form.document_id} onChange={e => set('document_id', e.target.value)}>
                  <option value="">Select document (optional)</option>
                  {documents.map(d => <option key={d.id} value={d.id}>{d.original_name?.substring(0, 30)}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Session Brief</label>
              <textarea
                className="form-textarea"
                value={form.session_brief}
                onChange={e => set('session_brief', e.target.value)}
                placeholder="Describe what you need help with in this session…"
                rows={3}
              />
            </div>

            
          </div>

          <div className='advisor-consultation-cards'>

          <CalendarPicker selectedDate={selectedDate} onSelect={setSelectedDate} />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              {TIMES.map(t => (
                <button
                key={t}
                onClick={() => setSelectedTime(t)}
                disabled={isPastSlot(t)}
                title={!selectedDate ? 'Select a date first' : isPastSlot(t) ? 'This time has passed' : ''}
                style={isPastSlot(t) ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                className={`advisor-time-btn ${selectedTime === t ? 'active' : ''}`}
              >
                {t}
              </button>
              ))}
            </div>
          
          </div>

          </div>

          {/* Book Summary */}
          <div className='col-lg-3 col-md-12 col-sm-12'>
          <div className='advisor-consultation-cards'>
            <h3 style={{ fontSize: 14, fontFamily: 'var(--font-h)', fontWeight: 700, color: 'var(--text-dark)', marginBottom: 18 }}>
              Book Summary
            </h3>
            {[
              { label: 'Consultant', value: selectedAdvisor?.full_name || '—' },
              { label: 'Date & Time', value: formatBookDate() },
              { label: 'Duration',   value: `${selectedSessionType.duration} minutes` },
              { label: 'Type',       value: selectedSessionType.medium.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) },
              { label: 'Case',       value: cases.find(c => c.id === Number(form.related_case))?.title?.substring(0, 20) || '—' },
              { label: 'Fee',        value: fee > 0 ? `${currency} ${fee.toLocaleString()}` : 'Contact advisor' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: 12, fontWeight: 400, color: '#4A4949' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#000000', textAlign: 'right',  }}>{value}</span>
              </div>
            ))}
            <button
              className="ai-thm-btn"
              style={{ width: '100%', marginTop: 20 }}
              onClick={handleBook}
              disabled={loading || !selectedDate || !selectedTime || !form.advisor_id || advisorUnavailable}
            >
              {loading ? 'Booking…' : 'Confirm & Book'}
            </button>
          </div></div>
        </div>
      </div>
    </>
  );
}
