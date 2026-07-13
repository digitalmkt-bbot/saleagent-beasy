import { useEffect, useState } from 'react';
import { api, baht } from '../api.js';
import { useI18n } from '../i18n.jsx';

export default function Reports() {
  const { t } = useI18n();
  const [d, setD] = useState(null);
  useEffect(() => { api('/reports/summary').then(setD).catch(() => {}); }, []);
  if (!d) return <div>{t('กำลังโหลด...')}</div>;
  const maxF = Math.max(1, ...d.funnel.map(f => f.cnt));
  const maxM = Math.max(1, ...d.monthly.map(m => +m.value));
  return (
    <div>
      <h1 className="page">{t('รายงาน')}</h1>
      <div className="cards">
        <div className="card"><div className="label">{t('อัตราชนะ (Win rate)')}</div><div className="value">{d.win.winRate}%</div></div>
        <div className="card"><div className="label">{t('ดีลปิดได้')}</div><div className="value">{d.win.won}</div></div>
        <div className="card"><div className="label">{t('มูลค่าปิดได้')}</div><div className="value" style={{ fontSize: 18 }}>{baht(d.win.won_value)}</div></div>
        <div className="card"><div className="label">{t('มูลค่าไปป์ไลน์')}</div><div className="value" style={{ fontSize: 18 }}>{baht(d.win.open_value)}</div></div>
      </div>
      <div className="grid2">
        <div className="panel"><h3 style={{ marginTop: 0 }}>{t('กลุ่มเป้าหมายตามขั้นไปป์ไลน์')}</h3>
          {d.funnel.map(f => <div className="stage" key={f.seq}><div style={{ width: 210, fontSize: 13 }}>{f.seq}. {f.name}</div><span className="bartrack" style={{ maxWidth: 200 }}><span className="bar" style={{ width: Math.round(f.cnt / maxF * 100) + '%' }} /></span><div style={{ fontSize: 13 }}>{f.cnt} · {baht(f.value)}</div></div>)}</div>
        <div className="panel"><h3 style={{ marginTop: 0 }}>{t('ยอดตามเดือน (วันเริ่มกลุ่มเป้าหมาย)')}</h3>
          {d.monthly.length ? d.monthly.map(m => <div className="stage" key={m.month}><div style={{ width: 80, fontSize: 13 }}>{m.month}</div><span className="bartrack" style={{ maxWidth: 200 }}><span className="bar" style={{ width: Math.round((+m.value) / maxM * 100) + '%' }} /></span><div style={{ fontSize: 13 }}>{m.deals} · {baht(m.value)}</div></div>) : <div className="muted">-</div>}</div>
      </div>
      <div className="panel"><h3 style={{ marginTop: 0 }}>{t('ยอดขายตามผู้รับผิดชอบ')}</h3>
        <table><thead><tr><th>{t('ผู้รับผิดชอบ')}</th><th>{t('จำนวนดีล')}</th><th>{t('ปิดได้ (มูลค่า)')}</th><th>{t('กำลังดำเนินการ')}</th></tr></thead>
          <tbody>{d.byOwner.map((o, i) => <tr key={i}><td>{o.name}</td><td>{o.deals}</td><td>{baht(o.won_value)}</td><td>{baht(o.open_value)}</td></tr>)}</tbody></table></div>
      <div className="grid2">
        <div className="panel"><h3 style={{ marginTop: 0 }}>{t('ยอดตามทีม')}</h3>
          <table><thead><tr><th>{t('ทีม')}</th><th>{t('ดีล')}</th><th>{t('มูลค่ารวม')}</th></tr></thead><tbody>{d.byTeam.map((x, i) => <tr key={i}><td>{x.name}</td><td>{x.deals}</td><td>{baht(x.value)}</td></tr>)}</tbody></table></div>
        <div className="panel"><h3 style={{ marginTop: 0 }}>{t('งานติดตามตามพนักงาน')}</h3>
          <table><thead><tr><th>{t('พนักงาน')}</th><th>{t('เสร็จ')}</th><th>{t('รอ')}</th><th>{t('เกินกำหนด')}</th></tr></thead><tbody>{d.activityByUser.map((u, i) => <tr key={i}><td>{u.name}</td><td>{u.done}</td><td>{u.pending}</td><td style={{ color: u.overdue ? '#EF5B52' : '' }}>{u.overdue}</td></tr>)}</tbody></table></div>
      </div>
    </div>
  );
}
