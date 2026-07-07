import { useEffect, useState } from 'react';
import { api, baht } from '../api.js';

export default function Reports() {
  const [d, setD] = useState(null);
  useEffect(() => { api('/reports/summary').then(setD).catch(() => {}); }, []);
  if (!d) return <div>กำลังโหลด...</div>;
  const maxF = Math.max(1, ...d.funnel.map(f => f.cnt));
  const maxM = Math.max(1, ...d.monthly.map(m => +m.value));
  return (
    <div>
      <h1 className="page">รายงาน</h1>
      <div className="cards">
        <div className="card"><div className="label">อัตราชนะ (Win rate)</div><div className="value">{d.win.winRate}%</div></div>
        <div className="card"><div className="label">ดีลปิดได้</div><div className="value">{d.win.won}</div></div>
        <div className="card"><div className="label">มูลค่าปิดได้</div><div className="value" style={{ fontSize: 18 }}>{baht(d.win.won_value)}</div></div>
        <div className="card"><div className="label">มูลค่าไปป์ไลน์</div><div className="value" style={{ fontSize: 18 }}>{baht(d.win.open_value)}</div></div>
      </div>
      <div className="grid2">
        <div className="panel"><h3 style={{ marginTop: 0 }}>โครงการตามขั้นไปป์ไลน์</h3>
          {d.funnel.map(f => <div className="stage" key={f.seq}><div style={{ width: 210, fontSize: 13 }}>{f.seq}. {f.name}</div><div className="bar" style={{ width: f.cnt / maxF * 200 + 20 }} /><div style={{ fontSize: 13 }}>{f.cnt} · {baht(f.value)}</div></div>)}</div>
        <div className="panel"><h3 style={{ marginTop: 0 }}>ยอดตามเดือน (วันเริ่มโครงการ)</h3>
          {d.monthly.length ? d.monthly.map(m => <div className="stage" key={m.month}><div style={{ width: 80, fontSize: 13 }}>{m.month}</div><div className="bar" style={{ width: (+m.value) / maxM * 220 + 20, background: '#4CAE4C' }} /><div style={{ fontSize: 13 }}>{m.deals} · {baht(m.value)}</div></div>) : <div className="muted">-</div>}</div>
      </div>
      <div className="panel"><h3 style={{ marginTop: 0 }}>ยอดขายตามผู้รับผิดชอบ</h3>
        <table><thead><tr><th>ผู้รับผิดชอบ</th><th>จำนวนดีล</th><th>ปิดได้ (มูลค่า)</th><th>กำลังดำเนินการ</th></tr></thead>
          <tbody>{d.byOwner.map((o, i) => <tr key={i}><td>{o.name}</td><td>{o.deals}</td><td>{baht(o.won_value)}</td><td>{baht(o.open_value)}</td></tr>)}</tbody></table></div>
      <div className="grid2">
        <div className="panel"><h3 style={{ marginTop: 0 }}>ยอดตามทีม</h3>
          <table><thead><tr><th>ทีม</th><th>ดีล</th><th>มูลค่ารวม</th></tr></thead><tbody>{d.byTeam.map((t, i) => <tr key={i}><td>{t.name}</td><td>{t.deals}</td><td>{baht(t.value)}</td></tr>)}</tbody></table></div>
        <div className="panel"><h3 style={{ marginTop: 0 }}>งานติดตามตามพนักงาน</h3>
          <table><thead><tr><th>พนักงาน</th><th>เสร็จ</th><th>รอ</th><th>เกินกำหนด</th></tr></thead><tbody>{d.activityByUser.map((u, i) => <tr key={i}><td>{u.name}</td><td>{u.done}</td><td>{u.pending}</td><td style={{ color: u.overdue ? '#D9534F' : '' }}>{u.overdue}</td></tr>)}</tbody></table></div>
      </div>
    </div>
  );
}
