import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { api } from '../api.js';

const I = {
  dashboard: 'M4 4h6v6H4z M14 4h6v6h-6z M14 14h6v6h-6z M4 14h6v6H4z',
  checklist: 'M8 6h12M8 12h12M8 18h12M3 6l1.4 1.4L7 5M3 12l1.4 1.4L7 11M3 18l1.4 1.4L7 17',
  users: 'M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  briefcase: 'M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2 M2 12h20',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M9 13h6 M9 17h6',
  cart: 'M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M20 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M1 2h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6',
  chart: 'M3 20h18 M7 20v-5 M12 20V8 M17 20v-9',
  sliders: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 0 1-3.4 0',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
  price: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z M7 7h.01',
  pin: 'M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
};
const Ic = ({ d }) => <span className="ico"><svg viewBox="0 0 24 24"><path d={d} /></svg></span>;

const sections = [
  ['เมนูหลัก', [['/', 'แผงบริหาร', 'dashboard'], ['/activities', 'งานติดตาม', 'checklist'], ['/checkin', 'เช็คอินเอเจ้นท์', 'pin'], ['/customers', 'เอเจ้นท์', 'users'], ['/projects', 'กลุ่มเป้าหมาย', 'briefcase']]],
  ['เอกสาร & รายงาน', [['/rates', 'สัญญา', 'file'], ['/reports', 'รายงาน', 'chart'], ['/settings', 'ตั้งค่า', 'sliders']]],
  ['แดชบอร์ด', [['/b2b-dashboard', 'B2B Dashboard', 'chart'], ['/investiq', 'InvestIQ', 'dashboard']]],
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, lang, toggle } = useI18n();
  const [notif, setNotif] = useState({ rows: [], count: 0 });
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('theme') === 'dark'; } catch (e) { return false; } });
  useEffect(() => { document.body.classList.toggle('dark', dark); try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {} }, [dark]);
  useEffect(() => { api('/meta/notifications').then(setNotif).catch(() => {}); }, []);
  const initial = (user?.name || 'A').trim().charAt(0).toUpperCase();
  const avKey = 'avatar_' + ((user && (user.id || user.email)) || '');
  const [avatar, setAvatar] = useState(() => { try { return localStorage.getItem(avKey) || ''; } catch (e) { return ''; } });
  const fileRef = useRef(null);
  function pickAvatar() { if (fileRef.current) fileRef.current.click(); }
  function onAvatarFile(e) {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const S = 160, c = document.createElement('canvas'); c.width = S; c.height = S;
        const ctx = c.getContext('2d');
        const scale = Math.max(S / img.width, S / img.height), w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
        const data = c.toDataURL('image/jpeg', 0.85);
        setAvatar(data);
        try { localStorage.setItem(avKey, data); } catch (err) {}
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(f); e.target.value = '';
  }
  const Av = () => <span className="avatar" onClick={pickAvatar} title={t('เปลี่ยนรูปโปรไฟล์')} style={{ cursor: 'pointer', overflow: 'hidden' }}>{avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}</span>;
  const logoKey = 'brand_logo';
  const [logo, setLogo] = useState(() => { try { return localStorage.getItem(logoKey) || ''; } catch (e) { return ''; } });
  const logoRef = useRef(null);
  function pickLogo() { if (logoRef.current) logoRef.current.click(); }
  function onLogoFile(e) {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const S = 128, c = document.createElement('canvas'); c.width = S; c.height = S;
        const ctx = c.getContext('2d');
        const scale = Math.min(S / img.width, S / img.height), w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
        const data = c.toDataURL('image/png');
        setLogo(data);
        try { localStorage.setItem(logoKey, data); } catch (err) {}
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(f); e.target.value = '';
  }
  return (
    <div className="app">
      <input type="file" accept="image/*" ref={fileRef} onChange={onAvatarFile} style={{ display: 'none' }} />
      <input type="file" accept="image/*" ref={logoRef} onChange={onLogoFile} style={{ display: 'none' }} />
      <aside className={'sidebar' + (menu ? ' open' : '')}>
        <div className="brand"><span className="logo" onClick={pickLogo} title={t('เปลี่ยนโลโก้บริษัท')} style={{ cursor: 'pointer', overflow: 'hidden' }}>{logo ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round"><path d="M12 2l9 6-9 14L3 8z" /></svg>}</span><span className="bt">{(user && user.name) || t('ผู้ใช้')}<span className="dot">.</span>BeasyApp</span></div>
        {[...sections, ...(['admin', 'executive'].includes(String((user && user.role) || '').toLowerCase()) ? [['ผู้ดูแลระบบ', [['/users', 'จัดการผู้ใช้', 'shield']]]] : [])].map(([title, items]) => (
          <div key={title}>
            <div className="nav-section">{t(title)}</div>
            <nav className="nav">{items.map(([to, label, icon]) =>
              <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenu(false)}><Ic d={I[icon]} />{t(label)}</NavLink>)}</nav>
          </div>
        ))}
        <div className="side-foot">
          <a className="side-theme" onClick={() => setDark(d => !d)}>
            {dark
              ? <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4" /></svg>
              : <svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" /></svg>}
            <span>{dark ? t('โหมดสว่าง') : t('โหมดมืด')}</span>
          </a>
          <span className="side-user"><Av /><span className="side-uname">{user?.name}</span></span>
          <a className="side-logout" onClick={logout}>{t('ออกจากระบบ')}</a>
        </div>
      </aside>
      {menu && <div className="overlay" onClick={() => setMenu(false)} />}
      <div className="main">
        <div className="topbar">
          <div className="who" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <button className="hamburger" aria-label="menu" onClick={() => setMenu(m => !m)}>☰</button>
            <span className="company">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18 M5 21V7l8-4v18 M19 21V11l-6-3 M9 9v.01 M9 12v.01 M9 15v.01" /></svg>
              {t('บริษัท เลิฟ ไอแลนด์ จำกัด')}
            </span>
          </div>
          <div className="who" style={{ display: 'flex', alignItems: 'center' }}>
            <span className="langtog">
              <button className={lang === 'th' ? 'on' : ''} onClick={() => { if (lang !== 'th') toggle(); }}>TH</button>
              <button className={lang === 'en' ? 'on' : ''} onClick={() => { if (lang !== 'en') toggle(); }}>EN</button>
            </span>
            <span className="bell" onClick={() => setOpen(o => !o)}>
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={I.bell} /></svg>
              {notif.count ? <span className="badge">{notif.count}</span> : null}
            </span>
            <span className="userbox"><Av />{user?.name} · <a onClick={logout}>{t('ออกจากระบบ')}</a></span>
          </div>
        </div>
        {open && (
          <div className="notif">
            {notif.rows.length ? notif.rows.map(n => (
              <div className="item" key={n.id}><b>{n.customer_name}</b> — {n.detail}
                <div className="muted">{n.overdue ? <span className="pill red">{t('เกินกำหนด')}</span> : <span className="pill orange">{t('วันนี้')}</span>} {(n.due_at || '').slice(0, 10)} · {n.assignee_name}</div></div>
            )) : <div className="item muted">{t('ไม่มีงานแจ้งเตือน')}</div>}
          </div>
        )}
        <div className="content"><Outlet /></div>
      </div>
    </div>
  );
}
