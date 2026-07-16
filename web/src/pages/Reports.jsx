import { useEffect, useState } from 'react';
import { api, baht } from '../api.js';
import { useI18n } from '../i18n.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const fmtDate = s => s ? new Date(s).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-';

export default function Reports() {
  const { t } = useI18n();
  const [d, setD] = useState(null);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [sales, setSales] = useState([]);
  const [agentVol, setAgentVol] = useState(null);
  const [products, setProducts] = useState(null);
  const [openUser, setOpenUser] = useState(null);
  const [drill, setDrill] = useState([]);
  const [rateErr, setRateErr] = useState('');

  useEffect(() => { api('/reports/summary').then(setD).catch(() => {}); }, []);
  function loadReports() {
    const params = { from, to };
    api('/reports/sales-activity', { params }).then(r => setSales(r.rows || [])).catch(() => setSales([]));
    api('/rates/report/agent-volume', { params }).then(r => { setAgentVol(r.rows || []); setRateErr(''); }).catch(e => { setAgentVol([]); setRateErr(e.message); });
    api('/rates/report/product-volume', { params }).then(r => setProducts(r.rows || [])).catch(() => setProducts([]));
    setOpenUser(null); setDrill([]);
  }
  useEffect(() => { loadReports(); }, []); // eslint-disable-line

  function toggleUser(u) {
    if (openUser === u.uid) { setOpenUser(null); return; }
    setOpenUser(u.uid);
    api('/reports/sales-activity/' + u.uid, { params: { from, to } }).then(r => setDrill(r.rows || [])).catch(() => setDrill([]));
  }

  if (!d) return <div>{t('กำลังโหลด...')}</div>;
  const maxF = Math.max(1, ...d.funnel.map(f => f.cnt));
  const maxM = Math.max(1, ...d.monthly.map(m => +m.value));
  const maxAg = Math.max(1, ...((agentVol || []).map(x => +x.revenue)));
  const maxPr = Math.max(1, ...((products || []).map(x => +x.revenue)));

  return (
    <div>
      <h1 className="page">{t('รายงาน')}</h1>

      <div className="panel" style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div><label>{t('จากวันที่')}</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 170 }} /></div>
        <div><label>{t('ถึงวันที่')}</label><input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width: 170 }} /></div>
        <button className="btn" onClick={loadReports}>{t('ดูรายงาน')}</button>
        <span className="muted" style={{ marginLeft: 'auto' }}>{fmtDate(from)} – {fmtDate(to)}</span>
      </div>

      <div className="panel"><h3 style={{ marginTop: 0 }}>{t('ลำดับเซลส์ที่ติดต่อ/เข้าพบเอเจ้นท์เยอะสุด')}</h3>
        <div className="muted" style={{ marginBottom: 8 }}>{t('นับทุกช่องทาง: โทร/อีเมล/เข้าพบ/LINE/ประชุมออนไลน์ · คลิกชื่อเพื่อดูว่าไปเอเจ้นท์ไหนบ้าง')}</div>
        <table><thead><tr><th>#</th><th>{t('เซลส์')}</th><th>{t('รวม (ครั้ง)')}</th><th>{t('แยกช่องทาง')}</th></tr></thead>
          <tbody>{sales.length ? sales.map((u, i) => (
            <>
              <tr key={u.uid} style={{ cursor: 'pointer' }} onClick={() => toggleUser(u)}>
                <td>{i + 1}</td>
                <td><b>{openUser === u.uid ? '▾ ' : '▸ '}{u.name || '-'}</b></td>
                <td><b>{u.total}</b></td>
                <td className="muted" style={{ fontSize: 12.5 }}>{Object.entries(u.methods).map(([m, n]) => `${m}: ${n}`).join(' · ') || '-'}</td>
              </tr>
              {openUser === u.uid && <tr key={u.uid + '_d'}><td></td><td colSpan="3" style={{ background: 'rgba(0,0,0,.02)' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, margin: '4px 0' }}>{t('เอเจ้นท์ที่เข้าพบ')} ({drill.length})</div>
                {drill.length ? drill.map(x => <div key={x.customer_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', borderBottom: '1px solid #f0f0ee' }}><span>{x.name || '-'}</span><span className="muted">{x.n} {t('ครั้ง')} · {t('ล่าสุด')} {fmtDate(x.last_at)}</span></div>) : <div className="muted">{t('ไม่มีข้อมูลในช่วงนี้')}</div>}
              </td></tr>}
            </>
          )) : <tr><td colSpan="4" className="muted">{t('ไม่มีข้อมูลในช่วงนี้')}</td></tr>}</tbody></table>
      </div>

      <div className="panel"><h3 style={{ marginTop: 0 }}>{t('ลำดับเอเจ้นท์ตามยอดที่ส่งให้บริษัท')}</h3>
        {rateErr ? <div className="muted">{t('ยังไม่ได้เชื่อมระบบ rate (ตั้ง RATE_DATABASE_URL)')}</div> :
          <table><thead><tr><th>#</th><th>{t('เอเจ้นท์')}</th><th>{t('จำนวนบุ๊กกิ้ง')}</th><th>{t('ยอดรวม')}</th><th></th></tr></thead>
            <tbody>{(agentVol || []).length ? agentVol.map((x, i) => <tr key={x.agentid || i}><td>{i + 1}</td><td><b>{x.name || x.agentid}</b>{x.code && <span className="muted"> · {x.code}</span>}</td><td>{x.bookings}</td><td><b>{baht(x.revenue)}</b></td><td style={{ width: 160 }}><span className="bartrack" style={{ maxWidth: 150 }}><span className="bar" style={{ width: Math.round(x.revenue / maxAg * 100) + '%' }} /></span></td></tr>) : <tr><td colSpan="5" className="muted">{t('ไม่มีข้อมูลในช่วงนี้')}</td></tr>}</tbody></table>}
      </div>

      <div className="panel"><h3 style={{ marginTop: 0 }}>{t('Top 10 Product (เส้นทาง) ตามยอด')}</h3>
        {rateErr ? <div className="muted">{t('ยังไม่ได้เชื่อมระบบ rate (ตั้ง RATE_DATABASE_URL)')}</div> :
          <table><thead><tr><th>#</th><th>{t('Product / เส้นทาง')}</th><th>{t('จำนวนบุ๊กกิ้ง')}</th><th>{t('ยอดรวม')}</th><th></th></tr></thead>
            <tbody>{(products || []).length ? products.map((x, i) => <tr key={x.routeid || i}><td>{i + 1}</td><td><b>{x.name || x.routeid || '-'}</b></td><td>{x.bookings}</td><td><b>{baht(x.revenue)}</b></td><td style={{ width: 160 }}><span className="bartrack" style={{ maxWidth: 150 }}><span className="bar" style={{ width: Math.round(x.revenue / maxPr * 100) + '%' }} /></span></td></tr>) : <tr><td colSpan="5" className="muted">{t('ไม่มีข้อมูลในช่วงนี้')}</td></tr>}</tbody></table>}
      </div>

      <h3 style={{ margin: '24px 0 10px' }}>{t('ภาพรวม CRM')}</h3>
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
