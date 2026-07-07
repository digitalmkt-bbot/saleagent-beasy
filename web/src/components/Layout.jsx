import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { api } from '../api.js';

const links = [['/', 'แผงบริหาร'], ['/activities', 'งานติดตาม'], ['/customers', 'ลูกค้า'],
  ['/projects', 'โครงการ'], ['/quotations', 'ใบเสนอราคา'], ['/saleorders', 'ใบสั่งขาย'], ['/reports', 'รายงาน'], ['/settings', 'ตั้งค่า']];

export default function Layout() {
  const { user, logout } = useAuth();
  const [notif, setNotif] = useState({ rows: [], count: 0 });
  const [open, setOpen] = useState(false);
  useEffect(() => { api('/meta/notifications').then(setNotif).catch(() => {}); }, []);
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">SaleAgent<span>.</span>Beasy</div>
        <nav className="nav">{links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}</nav>
      </aside>
      <div className="main">
        <div className="topbar">
          <div className="who">บริษัท เลิฟ ไอแลนด์ จำกัด</div>
          <div className="who" style={{ display: 'flex', alignItems: 'center' }}>
            <span className="bell" onClick={() => setOpen(o => !o)}>🔔{notif.count ? <span className="badge">{notif.count}</span> : null}</span>
            <span>{user?.name} · <a onClick={logout} style={{ cursor: 'pointer' }}>ออกจากระบบ</a></span>
          </div>
        </div>
        {open && (
          <div className="notif">
            {notif.rows.length ? notif.rows.map(n => (
              <div className="item" key={n.id}><b>{n.customer_name}</b> — {n.detail}
                <div className="muted">{n.overdue ? <span className="pill red">เกินกำหนด</span> : <span className="pill orange">วันนี้</span>} {(n.due_at || '').slice(0, 10)} · {n.assignee_name}</div></div>
            )) : <div className="item muted">ไม่มีงานแจ้งเตือน</div>}
          </div>
        )}
        <div className="content"><Outlet /></div>
      </div>
    </div>
  );
}
