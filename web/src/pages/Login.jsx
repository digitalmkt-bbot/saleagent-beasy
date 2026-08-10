import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';

export default function Login() {
  const { login, resetPassword } = useAuth();
  const { t, lang, toggle } = useI18n();
  const nav = useNavigate();
  const [email, setEmail] = useState(() => { try { return localStorage.getItem('last_email') || ''; } catch (e) { return ''; } });
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [show, setShow] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [rNew, setRNew] = useState('');
  const [rNew2, setRNew2] = useState('');
  const [rMsg, setRMsg] = useState('');

  async function doReset() {
    setRMsg('');
    if (!email) { setRMsg(t('กรุณากรอกอีเมลด้านบนก่อน')); return; }
    if ((rNew || '').length < 6) { setRMsg(t('รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัวอักษร')); return; }
    if (rNew !== rNew2) { setRMsg(t('รหัสผ่านใหม่ไม่ตรงกัน')); return; }
    try { localStorage.setItem('last_email', email); await resetPassword(email, rNew); nav('/'); }
    catch (er) { setRMsg(er.message); }
  }
  async function submit(e) {
    e.preventDefault(); setErr('');
    try { try { localStorage.setItem('last_email', email); } catch (x) {} await login(email, password); nav('/'); }
    catch (e) { setErr(e.message); }
  }

  return (
    <div className="lg-root">
      <style>{`
        .lg-root{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#eceae7;padding:24px;box-sizing:border-box;font-family:inherit;}
        .lg-card{width:100%;max-width:1180px;min-height:660px;display:flex;border-radius:28px;overflow:hidden;box-shadow:0 30px 80px rgba(20,16,12,.18);background:#fff;}
        .lg-left{flex:1;position:relative;background:radial-gradient(120% 120% at 20% 10%,#3a3330 0%,#211d1b 55%,#171311 100%);color:#fff;padding:40px 44px;display:flex;flex-direction:column;overflow:hidden;}
        .lg-tag{font-size:14px;color:rgba(255,255,255,.72);max-width:360px;line-height:1.5;}
        .lg-rings{position:absolute;top:14%;left:50%;transform:translateX(-50%);width:520px;height:520px;opacity:.5;pointer-events:none;}
        .lg-head{margin-top:auto;font-size:64px;line-height:1.02;font-weight:800;letter-spacing:-1.5px;}
        .lg-head .o{color:#FF6B35;}
        .lg-mock{position:relative;margin-top:26px;align-self:flex-start;width:260px;background:linear-gradient(160deg,#26211f,#15110f);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:16px 16px 14px;box-shadow:0 20px 50px rgba(0,0,0,.4);}
        .lg-mock .wk{font-size:11px;color:rgba(255,255,255,.55);}
        .lg-mock .amt{font-size:26px;font-weight:800;margin:2px 0 12px;}
        .lg-mock .amt span{font-size:14px;color:rgba(255,255,255,.6);font-weight:600;}
        .lg-bars{display:flex;align-items:flex-end;gap:7px;height:78px;}
        .lg-bars i{flex:1;border-radius:4px 4px 0 0;background:rgba(255,255,255,.18);position:relative;overflow:hidden;}
        .lg-bars i b{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(180deg,#FF6B35,#FF2D55);border-radius:4px 4px 0 0;}
        .lg-bars span{position:absolute;bottom:-16px;left:0;right:0;text-align:center;font-size:9px;color:rgba(255,255,255,.45);}
        .lg-right{flex:1;background:#fff;padding:40px 52px;display:flex;flex-direction:column;color:#1A191D;}
        .lg-brand{display:flex;align-items:center;justify-content:space-between;}
        .lg-logo{display:flex;align-items:center;gap:10px;font-size:22px;font-weight:800;}
        .lg-logo .ring{width:26px;height:26px;border-radius:50%;background:conic-gradient(from 0deg,#FF2D55,#FF6B35,#FFD166,#FF6B35,#FF2D55);-webkit-mask:radial-gradient(circle 7px at center,transparent 98%,#000 100%);mask:radial-gradient(circle 7px at center,transparent 98%,#000 100%);}
        .lg-lang{display:flex;gap:4px;background:#f3f2f0;border-radius:999px;padding:3px;}
        .lg-lang button{border:none;background:none;cursor:pointer;font-size:12px;font-weight:700;padding:5px 11px;border-radius:999px;color:#8a8580;}
        .lg-lang button.on{background:#fff;color:#1A191D;box-shadow:0 1px 3px rgba(0,0,0,.12);}
        .lg-formwrap{margin:auto 0;width:100%;max-width:400px;align-self:center;}
        .lg-title{font-size:40px;font-weight:800;letter-spacing:-1px;margin:0 0 26px;}
        .lg-field{width:100%;box-sizing:border-box;border:1px solid #e3e0dc;border-radius:999px;padding:16px 20px;font-size:15px;outline:none;transition:border-color .15s,box-shadow .15s;background:#fff;color:#1A191D;}
        .lg-field:focus{border-color:#FF6B35;box-shadow:0 0 0 3px rgba(255,107,53,.15);}
        .lg-eye{position:absolute;right:16px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#9a948e;padding:4px;display:flex;}
        .lg-forgot{color:#FF4B26;font-size:13.5px;font-weight:600;cursor:pointer;display:inline-block;margin:14px 2px 0;}
        .lg-submit{width:100%;border:none;cursor:pointer;color:#fff;font-size:16px;font-weight:700;border-radius:999px;padding:16px;margin-top:26px;display:flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(90deg,#FF6B35 0%,#FF2D55 100%);box-shadow:0 12px 28px rgba(255,64,64,.32);transition:transform .1s,box-shadow .15s;}
        .lg-submit:hover{transform:translateY(-1px);box-shadow:0 16px 34px rgba(255,64,64,.4);}
        .lg-foot{display:flex;align-items:center;justify-content:space-between;color:#a09a94;font-size:12.5px;margin-top:26px;}
        .lg-foot a{color:#6b6560;cursor:pointer;}
        .lg-reset{margin-top:16px;background:rgba(255,75,38,.05);border:1px solid #f0e2dc;border-radius:16px;padding:14px 16px;}
        .lg-reset label{display:block;font-size:12.5px;color:#6b6560;font-weight:600;margin:8px 0 4px;}
        .lg-err{color:#e11d48;font-size:13px;margin-top:12px;}
        @media (max-width:860px){
          .lg-left{display:none;}
          .lg-card{min-height:auto;max-width:460px;}
          .lg-right{padding:32px 26px;}
          .lg-title{font-size:32px;}
        }
      `}</style>

      <div className="lg-card">
        {/* ===== ซ้าย: hero ===== */}
        <div className="lg-left">
          <div className="lg-tag">{t('ระบบบริหารงานขายครบวงจร — วางแผน ติดตาม ปิดการขาย ในที่เดียว')}</div>
          <svg className="lg-rings" viewBox="0 0 520 520" fill="none">
            {[80, 140, 200, 250].map(r => <circle key={r} cx="260" cy="260" r={r} stroke="rgba(255,255,255,.10)" strokeWidth="1" />)}
          </svg>
          <div className="lg-head">Manage<br />your <span className="o">sales</span></div>
          <div className="lg-mock">
            <div className="wk">{t('สัปดาห์นี้')}</div>
            <div className="amt">897,000<span> ฿</span></div>
            <div className="lg-bars">
              {[42, 60, 38, 74, 52, 88, 46].map((h, i) => (
                <i key={i} style={{ height: h + '%' }}><b style={{ height: (i === 5 ? 100 : 62) + '%' }} /></i>
              ))}
            </div>
          </div>
        </div>

        {/* ===== ขวา: ฟอร์ม ===== */}
        <div className="lg-right">
          <div className="lg-brand">
            <div className="lg-logo"><span className="ring" />BeasyApp</div>
            <div className="lg-lang">
              <button className={lang === 'th' ? 'on' : ''} onClick={() => { if (lang !== 'th') toggle(); }}>TH</button>
              <button className={lang === 'en' ? 'on' : ''} onClick={() => { if (lang !== 'en') toggle(); }}>EN</button>
            </div>
          </div>

          <form className="lg-formwrap" onSubmit={submit}>
            <h1 className="lg-title">{t('เข้าสู่ระบบ')}</h1>

            <input className="lg-field" type="email" name="email" autoComplete="username"
              placeholder={t('อีเมล หรือชื่อผู้ใช้')} value={email} onChange={e => setEmail(e.target.value)} />

            <div style={{ position: 'relative', marginTop: 16 }}>
              <input className="lg-field" style={{ paddingRight: 48 }} type={show ? 'text' : 'password'} name="password"
                autoComplete="current-password" placeholder={t('รหัสผ่าน')} value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" className="lg-eye" onClick={() => setShow(s => !s)}
                aria-label={show ? t('ซ่อนรหัสผ่าน') : t('แสดงรหัสผ่าน')} title={show ? t('ซ่อนรหัสผ่าน') : t('แสดงรหัสผ่าน')}>
                {show
                  ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20C5 20 2 12 2 12a18.5 18.5 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 10 8 10 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" /><path d="M9.88 9.88a3 3 0 104.24 4.24" /></svg>
                  : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z" /><circle cx="12" cy="12" r="3" /></svg>}
              </button>
            </div>

            <a className="lg-forgot" onClick={() => setShowReset(v => !v)}>{t('ลืมรหัสผ่าน?')}</a>

            <button type="submit" className="lg-submit">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" /></svg>
              {t('เข้าสู่ระบบ')}
            </button>
            {err && <div className="lg-err">{err}</div>}

            {showReset && (
              <div className="lg-reset">
                <div style={{ fontSize: 12.5, color: '#6b6560', marginBottom: 2 }}>{t('กรอกอีเมล (ช่องบน) แล้วตั้งรหัสผ่านใหม่ได้เลย (ไม่ต้องติดต่อแอดมิน)')}</div>
                <label>{t('รหัสผ่านใหม่')}</label>
                <input className="lg-field" type="password" value={rNew} onChange={e => setRNew(e.target.value)} />
                <label>{t('ยืนยันรหัสผ่านใหม่')}</label>
                <input className="lg-field" type="password" value={rNew2} onChange={e => setRNew2(e.target.value)} />
                <button type="button" className="lg-submit" style={{ marginTop: 14 }} onClick={doReset}>{t('เปลี่ยนรหัสผ่าน & เข้าสู่ระบบ')}</button>
                {rMsg && <div className="lg-err">{rMsg}</div>}
              </div>
            )}
          </form>

          <div className="lg-foot">
            <span>© 2025 Love Andaman Co., Ltd.</span>
            <span>{t('ติดต่อเรา')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
