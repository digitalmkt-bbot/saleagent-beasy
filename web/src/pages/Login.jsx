import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';

export default function Login() {
  const { login } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@loveandaman.com');
  const [password, setPassword] = useState('password');
  const [err, setErr] = useState('');
  const [show, setShow] = useState(false);
  async function submit(e) {
    e.preventDefault(); setErr('');
    try { await login(email, password); nav('/'); }
    catch (e) { setErr(e.message); }
  }
  return (
    <div className="login-wrap">
      <form className="login-box" onSubmit={submit}>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#4338CA' }}>SaleAgent<span style={{ color: '#6366F1' }}>.</span>Beasy</div>
        <div className="muted" style={{ marginBottom: 16 }}>{t('ระบบบริหารงานขาย (Sales CRM)')}</div>
        <label>{t('อีเมล')}</label>
        <input value={email} onChange={e => setEmail(e.target.value)} />
        <label>{t('รหัสผ่าน')}</label>
        <div style={{ position: 'relative' }}>
          <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', paddingRight: 44 }} />
          <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? t('ซ่อนรหัสผ่าน') : t('แสดงรหัสผ่าน')} title={show ? t('ซ่อนรหัสผ่าน') : t('แสดงรหัสผ่าน')} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, lineHeight: 1, padding: 4, color: '#6366F1' }}>{show
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20C5 20 2 12 2 12a18.5 18.5 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 10 8 10 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" /><path d="M9.88 9.88a3 3 0 104.24 4.24" /></svg>
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z" /><circle cx="12" cy="12" r="3" /></svg>}</button>
        </div>
        <button className="btn" style={{ width: '100%', marginTop: 18, justifyContent: 'center' }}>{t('เข้าสู่ระบบ')}</button>
        {err && <div className="err">{err}</div>}
        <div className="muted" style={{ marginTop: 14 }}>{t('ทดลอง: admin@loveandaman.com / password')}</div>
      </form>
    </div>
  );
}
