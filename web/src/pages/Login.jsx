import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';

export default function Login() {
  const { login, resetPassword } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@loveandaman.com');
  const [password, setPassword] = useState('password');
  const [err, setErr] = useState('');
  const [show, setShow] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [rCur, setRCur] = useState('');
  const [rNew, setRNew] = useState('');
  const [rNew2, setRNew2] = useState('');
  const [rMsg, setRMsg] = useState('');
  async function doReset() {
    setRMsg('');
    if (!email) { setRMsg(t('กรุณากรอกอีเมลด้านบนก่อน')); return; }
    if ((rNew || '').length < 6) { setRMsg(t('รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัวอักษร')); return; }
    if (rNew !== rNew2) { setRMsg(t('รหัสผ่านใหม่ไม่ตรงกัน')); return; }
    try { await resetPassword(email, rNew); nav('/'); }
    catch (er) { setRMsg(er.message); }
  }
  async function submit(e) {
    e.preventDefault(); setErr('');
    try { await login(email, password); nav('/'); }
    catch (e) { setErr(e.message); }
  }
  return (
    <div className="login-wrap">
      <form className="login-box" onSubmit={submit}>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#1A191D' }}>SaleAgent<span style={{ color: '#FF4B26' }}>.</span>BeasyApp</div>
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
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <a onClick={() => setShowReset(v => !v)} style={{ fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>{t('เปลี่ยน / รีเซ็ตรหัสผ่านด้วยตัวเอง')}</a>
        </div>
        {showReset && <div style={{ marginTop: 10, background: 'rgba(255,75,38,.05)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '12px 13px' }}>
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 4 }}>{t('กรอกอีเมล (ช่องบน) แล้วตั้งรหัสผ่านใหม่ได้เลย (ไม่ต้องติดต่อแอดมิน)')}</div>
          <label>{t('รหัสผ่านใหม่')}</label>
          <input type="password" value={rNew} onChange={e => setRNew(e.target.value)} />
          <label>{t('ยืนยันรหัสผ่านใหม่')}</label>
          <input type="password" value={rNew2} onChange={e => setRNew2(e.target.value)} />
          <button type="button" className="btn" style={{ width: '100%', marginTop: 12, justifyContent: 'center' }} onClick={doReset}>{t('เปลี่ยนรหัสผ่าน & เข้าสู่ระบบ')}</button>
          {rMsg && <div className="err" style={{ marginTop: 8 }}>{rMsg}</div>}
        </div>}
      </form>
    </div>
  );
}
