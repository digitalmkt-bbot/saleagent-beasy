import { useEffect, useState } from 'react';
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
};
const Ic = ({ d }) => <span className="ico"><svg viewBox="0 0 24 24"><path d={d} /></svg></span>;
const sections = [
  ['เมนูหลัก', [['/', 'แผงบริหาร', 'dashboard'], ['/activities', 'งานติดตาม', 'checklist'], ['/customers', 'ลูกค้า', 'users'], ['/projects', 'โครงการ', 'briefcase']]],
  ['เอกสาร & รายงาน', [['/quotations', 'ใบเสนอราคา', 'file'], ['/saleorders', 'ใบสั่งขาย', 'cart'], ['/reports', 'รายงาน', 'chart'], ['/settings', 'ตั้งค่า', 'sliders']]],
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { t, lang, toggle } = useI18n();
  const [notif, setNotif] = useState({ rows: [], count: 0 });
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [sum, setSum] = useState(null);
  useEffect(() => { api('/meta/notifications').then(setNotif).catch(() => {}); api('/meta/dashboard').then(setSum).catch(() => {}); }, []);
  const kf = (n) => { n = Number(n) || 0; if (n >= 1e6) return '฿' + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M'; if (n >= 1e3) return '฿' + Math.round(n / 1e3) + 'K'; return '฿' + Math.round(n); };
  const totalVal = sum ? (Number(sum.projects.won_value) + Number(sum.projects.pipeline_value)) : 0;
  const initial = (user?.name || 'A').trim().charAt(0).toUpperCase();
  return (
    <div className="shell">
      <header className="tbar">
        <div className="tbar-l">
          <button className="hamburger" aria-label="menu" onClick={() => setMenu(m => !m)}>☰</button>
          <span className="tbar-logo"><span className="logo-dot"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#16262E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18l5-6 4 4 7-9" /></svg></span>SaleAgent<em>.</em>Beasy</span>
          <span className="crumb">{t('แผงบริหาร')}</span>
        </div>
        <div className="tbar-r">
          <span className="langtog">
            <button className={lang === 'th' ? 'on' : ''} onClick={() => { if (lang !== 'th') toggle(); }}>TH</button>
            <button className={lang === 'en' ? 'on' : ''} onClick={() => { if (lang !== 'en') toggle(); }}>EN</button>
          </span>
          <span className="bell" onClick={() => setOpen(o => !o)}>
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={I.bell} /></svg>
            {notif.count ? <span className="badge">{notif.count}</span> : null}</span>
          <span className="tavatar">{initial}</span>
          <span className="userbox"><a onClick={logout}>{t('ออกจากระบบ')}</a></span>
        </div>
      </header>
      {open && (
        <div className="notif">
          {notif.rows.length ? notif.rows.map(n => (
            <div className="item" key={n.id}><b>{n.customer_name}</b> — {n.detail}
              <div className="muted">{n.overdue ? <span className="pill red">{t('เกินกำหนด')}</span> : <span className="pill orange">{t('วันนี้')}</span>} {(n.due_at || '').slice(0, 10)} · {n.assignee_name}</div></div>
          )) : <div className="item muted">{t('ไม่มีงานแจ้งเตือน')}</div>}
        </div>
      )}
      <div className="body">
        <aside className={'sidebar' + (menu ? ' open' : '')}>
          <div className="side-profile"><span className="pav">LA</span><div><div className="pname">Love Andaman</div><span className="ptag">CRM</span></div></div>
          {sections.map(([title, items]) => (
            <div key={title}>
              <div className="nav-section">{t(title)}</div>
              <nav className="nav">{items.map(([to, label, icon]) =>
                <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenu(false)}><Ic d={I[icon]} />{t(label)}</NavLink>)}</nav>
            </div>
          ))}
          <div className="side-total">
            <div className="st-dots"><span style={{ background: '#5BB85B' }} /><span style={{ background: '#F2A93B' }} /><span style={{ background: '#F2637E' }} /></div>
            <div className="st-val">{kf(totalVal)}</div>
            <div className="st-lab">{t('มูลค่ารวมสะสมทั้งหมด')}</div>
          </div>
        </aside>
        {menu && <div className="overlay" onClick={() => setMenu(false)} />}
        <main className="main"><div className="content"><Outlet /></div></main>
      </div>
    </div>
  );
}
