import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { userAPI } from '../../services/api';
import { showToast } from '../../components/common/index';

const ControlBtn = ({ icon, onClick, danger, active, title }) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      width: 44, height: 44, borderRadius: '50%',
      background: danger ? '#EF4444' : active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
      border: `1px solid ${danger ? 'transparent' : 'rgba(255,255,255,0.2)'}`,
      cursor: 'pointer', fontSize: 18,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.2s',
    }}
  >
    {icon}
  </button>
);

export default function VideoCall() {
  const location     = useLocation();
  const navigate     = useNavigate();
  const { id }       = useParams();
  const consultation = location.state?.consultation;

  const jitsiContainer = useRef(null);
  const jitsiApi       = useRef(null);

  const [joinInfo,   setJoinInfo]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [tab,        setTab]        = useState('Chat');
  const [message,    setMessage]    = useState('');
  const [messages,   setMessages]   = useState([]);
  const [elapsed,    setElapsed]    = useState(0);
  const [jitsiReady, setJitsiReady] = useState(false);
  const [noteText,   setNoteText]   = useState('');

  const consultationId = id || consultation?.id;

  useEffect(() => {
    if (!consultationId) {
      setError('No consultation ID provided');
      setLoading(false);
      return;
    }
    userAPI.getConsultationJoin(consultationId)
      .then(r => { setJoinInfo(r.data.data); setLoading(false); })
      .catch(() => { setError('Unable to fetch session details. Please try again.'); setLoading(false); });
  }, [consultationId]);

  const initJitsi = useCallback((domain, roomName) => {
    if (!jitsiContainer.current || !window.JitsiMeetExternalAPI) return;
    if (jitsiApi.current) { jitsiApi.current.dispose(); jitsiApi.current = null; }

    const options = {
      roomName,
      parentNode: jitsiContainer.current,
      width: '100%',
      height: '100%',
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        disableDeepLinking: true,
        enableWelcomePage: false,
        prejoinPageEnabled: false,
        toolbarButtons: ['microphone', 'camera', 'chat', 'tileview', 'hangup', 'raisehand', 'settings'],
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_BRAND_WATERMARK: false,
        DEFAULT_REMOTE_DISPLAY_NAME: 'Participant',
        APP_NAME: 'AunAdvisory',
        HIDE_INVITE_MORE_HEADER: true,
      },
    };

    try {
      jitsiApi.current = new window.JitsiMeetExternalAPI(domain, options);
      setJitsiReady(true);

      jitsiApi.current.addEventListeners({
        readyToClose: () => {
          userAPI.updateConsultation(consultationId, { status: 'completed' }).catch(() => {});
          navigate('/user/consultations');
        },
        videoConferenceLeft: () => { navigate('/user/consultations'); },
        incomingMessage: ({ from, message: msg }) => {
          setMessages(p => [...p, {
            id: Date.now(), from: 'remote',
            name: from?.substring(0, 2)?.toUpperCase() || '??',
            text: msg,
          }]);
        },
      });
    } catch (err) {
      setError('Failed to initialize video call: ' + err.message);
    }
  }, [consultationId, navigate]);

  useEffect(() => {
    if (!joinInfo) return;
    const domain   = joinInfo.jitsi_domain || 'meet.jit.si';
    const scriptId = 'jitsi-api-script';

    if (document.getElementById(scriptId)) {
      initJitsi(domain, joinInfo.room_name);
      return;
    }
    const script     = document.createElement('script');
    script.id        = scriptId;
    script.src       = `https://${domain}/external_api.js`;
    script.onload    = () => initJitsi(domain, joinInfo.room_name);
    script.onerror   = () => setError('Failed to load Jitsi. Check your internet connection.');
    document.head.appendChild(script);
  }, [joinInfo, initJitsi]); // FIX: initJitsi in deps array

  // FIX: Timer only starts when Jitsi is actually connected — not on page load
  useEffect(() => {
    if (!jitsiReady) return;
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [jitsiReady]);

  useEffect(() => {
    return () => { if (jitsiApi.current) jitsiApi.current.dispose(); };
  }, []);

  const formatElapsed = (s) => {
    const h   = Math.floor(s / 3600);
    const m   = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    if (jitsiApi.current) jitsiApi.current.executeCommand('sendChatMessage', message);
    setMessages(p => [...p, { id: Date.now(), from: 'user', name: 'ME', text: message }]);
    setMessage('');
  };

  const handleEndCall = () => {
    if (jitsiApi.current) {
      jitsiApi.current.executeCommand('hangup');
    } else {
      userAPI.updateConsultation(consultationId, { status: 'completed' }).catch(() => {});
      navigate('/user/consultations');
    }
  };

  const saveNotes = () => {
    userAPI.updateConsultation(consultationId, { advisor_notes: noteText })
      .then(() => showToast('Notes saved'))
      .catch(() => showToast('Failed to save notes', 'error'));
  };

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1A1A1A' }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>📹</div>
        <div style={{ fontSize: 16 }}>Preparing your session…</div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1A1A1A' }}>
      <div style={{ textAlign: 'center', color: 'white', maxWidth: 400 }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 16, marginBottom: 8 }}>{error}</div>
        <button onClick={() => navigate('/user/consultations')}
          style={{ padding: '10px 24px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
          Back to Consultations
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1A1A1A' }}>
      {/* Top Bar */}
      <div style={{ height: 52, background: '#111', borderBottom: '1px solid #2F343A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontFamily: 'sans-serif', fontSize: 14, fontWeight: 700, color: 'white' }}>🏢 AunAdvisory</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {jitsiReady
              ? <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', background: 'rgba(22,163,74,0.2)', color: '#16A34A', borderRadius: 4 }}>● Live Session</span>
              : <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', background: 'rgba(234,179,8,0.2)', color: '#EAB308', borderRadius: 4 }}>● Connecting…</span>
            }
          </div>
        </div>
        {/* FIX: Timer only shows when jitsiReady */}
        {jitsiReady && (
          <span style={{ fontSize: 13, color: '#BDC3C7', fontFamily: 'monospace', fontWeight: 600 }}>
            {formatElapsed(elapsed)}
          </span>
        )}
        <ControlBtn icon="📞" danger onClick={handleEndCall} title="End Call" />
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', overflow: 'hidden' }}>
        <div style={{ position: 'relative', background: '#222', overflow: 'hidden' }}>
          <div ref={jitsiContainer} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Chat / Notes Panel */}
        <div style={{ background: 'white', borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
            {['Chat', 'Notes'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '14px', fontSize: 13, fontWeight: 600,
                background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t ? '#111' : '#9CA3AF',
                borderBottom: tab === t ? '2px solid #111' : '2px solid transparent',
                marginBottom: -1,
              }}>{t}</button>
            ))}
          </div>

          {tab === 'Chat' ? (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {messages.length === 0
                  ? <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, marginTop: 40 }}>💬 Messages will appear here</div>
                  : messages.map(m => (
                    <div key={m.id} style={{ display: 'flex', gap: 10, flexDirection: m.from === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: m.from !== 'user' ? '#E0E7FF' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                        {m.name}
                      </div>
                      <div style={{ maxWidth: '75%', padding: '10px 12px', borderRadius: 10, background: m.from === 'user' ? '#111' : '#F3F4F6', color: m.from === 'user' ? 'white' : '#111', fontSize: 12, lineHeight: 1.6 }}>
                        {m.text}
                      </div>
                    </div>
                  ))
                }
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 8, flexShrink: 0 }}>
                <input
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 20, fontSize: 13, outline: 'none' }}
                  placeholder="Type a message…"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                />
                <button onClick={sendMessage} style={{ width: 36, height: 36, borderRadius: '50%', background: '#111', border: 'none', cursor: 'pointer', color: 'white', fontSize: 14 }}>→</button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#111', margin: 0 }}>Session Notes</h4>
              <textarea
                style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: 8, padding: 12, fontSize: 13, resize: 'none', outline: 'none', minHeight: 300 }}
                placeholder="Add session notes here…"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
              />
              <button onClick={saveNotes} style={{ padding: '8px 16px', background: '#111', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                Save Notes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
