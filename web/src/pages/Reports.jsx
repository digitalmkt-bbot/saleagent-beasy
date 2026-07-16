import { useEffect, useState } from 'react';
import { api, baht } from '../api.js';
import { useI18n } from '../i18n.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const fmtDate = s => s ? new Date(s).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-';

function Bars({ data, label, value, fmt, color = '#6366F1', onBar, active }) {
  const max = Math.max(1, ...data.map(value));
  if (!data.length) return <div className="muted" style={{ padding: '8px 0' }}>—</div>;
  return (
    <div>{data.map((x, i) => (
      <div key={i} onClick={onBar ? () => onBar(x) : undefined}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', cursor: onBar ? 'pointer' : 'default', background: active && active(x) ? 'rgba(99,102,241,.06)' : 'transparent', borderRadius: 6 }}>
        <div style={{ width: 22, textAlign: 'right', color: '#8891B0', fontSize: 12, flexShrink: 0 }}>{i + 1}</div>
        <div style={{ width: 165, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{onBar ? (active && active(x) ? '▾ ' : '▸ ') : ''}{label(x)}</div>
        <div style={{ flex: 1, background: '#EEF0F6', borderRadius: 6, height: 20, minWidth: 40 }}>
          <div style={{ width: Math.round(value(x) / max * 100) + '%', background: color, height: '100%', borderRadius: 6, minWidth: 2 }} />
        </div>
        <div style={{ width: 108, textAlign: 'right', fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(x)}</div>
      </div>
    ))}</div>
  );
}

export default function Reports() {
  const { t } = useI18n();
  const [d, setD] = useState(null);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [sales, setSales] = useState([]);
  const [agentVol, setAgentVol] = useState(null);
  const [products, setProducts] = useState(null);
  const [salesVol, setSalesVol] = useState(null);
  const [openUser, setOpenUser] = useState(null);
  const [drill, setDrill] = useState([]);
  const [rateErr, setRateErr] = useState('');
  const [modal, setModal] = useState(null);

  useEffect(() => { api('/reports/summary').then(setD).catch(() => {}); }, []);
  function loadReports() {
    const params = { from, to };
    api('/reports/sales-activity', { params }).then(r => setSales(r.rows || [])).catch(() => setSales([]));
    api('/rates/report/agent-volume', { params }).then(r => { setAgentVol(r.rows || []); setRateErr(''); }).catch(e => { setAgentVol([]); setRateErr(e.message); });
    api('/rates/report/product-volume', { params }).then(r => setProducts(r.rows || [])).catch(() => setProducts([]));
    api('/rates/report/sales-volume', { params }).then(r => setSalesVol(r.rows || [])).catch(() => setSalesVol([]));
    setOpenUser(null); setDrill([]);
  }
  useEffect(() => { loadReports(); }, []); // eslint-disable-line

  function toggleUser(u) {
    if (openUser === u.uid) { setOpenUser(null); return; }
    setOpenUser(u.uid);
    api('/reports/sales-activity/' + u.uid, { params: { from, to } }).then(r => setDrill(r.rows || [])).catch(() => setDrill([]));
  }
  const methodsStr = m => Object.entries(m || {}).map(([k, n]) => `${k}: ${n}`).join(' · ') || '-';

  if (!d) return <div>{t('กำลังโหลด...')}</div>;

  return (
    <div>
      <h1 className="page">{t('รายงาน')}</h1>

      <div className="panel" style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div><label>{t('จากวันที่')}</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 170 }} /></div>
        <div><label>{t('ถึงวันที่')}</label><input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width: 170 }} /></div>
        <button className="btn" onClick={loadReports}>{t('ดูรายงาน')}</button>
        <span className="muted" style={{ marginLeft: 'auto' }}>{fmtDate(from)} – {fmtDate(to)}</span>
      </div>

      {/* 1. เซลส์ที่ติดต่อเอเจ้นท์เยอะสุด */}
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{t('ลำดับเซลส์ที่ติดต่อ/เข้าพบเอเจ้นท์เยอะสุด')}</h3>
          {sales.length > 10 && <a onClick={() => setModal({ title: t('ลำดับเซลส์ที่ติดต่อ/เข้าพบเอเจ้นท์เยอะสุด'), cols: [t('เซลส์'), t('รวม (ครั้ง)'), t('แยกช่องทาง')], rows: sales.map((x, i) => [(i + 1) + '. ' + (x.name || '-'), x.total, methodsStr(x.methods)]) })}>{t('ดูทั้งหมด')} ({sales.length}) →</a>}
        </div>
        <div className="muted" style={{ margin: '4px 0 8px' }}>{t('นับทุกช่องทาง · คลิกแท่งเพื่อดูว่าไปเอเจ้นท์ไหนบ้าง')}</div>
        <Bars data={sales.slice(0, 10)} label={x => x.name || '-'} value={x => x.total} fmt={x => x.total + ' ' + t('ครั้ง')} color="#6366F1" onBar={toggleUser} active={x => openUser === x.uid} />
        {openUser != null && <div style={{ marginTop: 10, padding: 12, background: 'rgba(0,0,0,.02)', borderRadius: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>{t('เอเจ้นท์ที่เข้าพบ')} ({drill.length})</div>
          {drill.length ? drill.map(x => <div key={x.customer_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', borderBottom: '1px solid #f0f0ee' }}><span>{x.name || '-'}</span><span className="muted">{x.n} {t('ครั้ง')} · {t('ล่าสุด')} {fmtDate(x.last_at)}</span></div>) : <div className="muted">{t('ไม่มีข้อมูลในช่วงนี้')}</div>}
        </div>}
      </div>

      {/* 3. เอเจ้นท์ตามยอด */}
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{t('ลำดับเอเจ้นท์ตามยอดที่ส่งให้บริษัท')}</h3>
          {(agentVol || []).length > 10 && <a onClick={() => setModal({ title: t('ลำดับเอเจ้นท์ตามยอดที่ส่งให้บริษัท'), cols: [t('เอเจ้นท์'), t('จำนวนบุ๊กกิ้ง'), t('ยอดรวม')], rows: agentVol.map((x, i) => [(i + 1) + '. ' + (x.name || x.agentid), x.bookings, baht(x.revenue)]) })}>{t('ดูทั้งหมด')} ({agentVol.length}) →</a>}
        </div>
        {rateErr ? <div className="muted" style={{ marginTop: 8 }}>{t('ยังไม่ได้เชื่อมระบบ rate (ตั้ง RATE_DATABASE_URL)')}</div> :
          <div style={{ marginTop: 8 }}><Bars data={(agentVol || []).slice(0, 10)} label={x => x.name || x.agentid} value={x => +x.revenue} fmt={x => baht(x.revenue)} color="#12B981" /></div>}
      </div>

      {/* 4. Top 10 Product */}
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{t('Top 10 Product (เส้นทาง) ตามยอด')}</h3>
          {(products || []).length > 10 && <a onClick={() => setModal({ title: t('Top 10 Product (เส้นทาง) ตามยอด'), cols: [t('Product / เส้นทาง'), t('จำนวนบุ๊กกิ้ง'), t('ยอดรวม')], rows: products.map((x, i) => [(i + 1) + '. ' + (x.name || x.routeid), x.bookings, baht(x.revenue)]) })}>{t('ดูทั้งหมด')} →</a>}
        </div>
        {rateErr ? <div className="muted" style={{ marginTop: 8 }}>{t('ยังไม่ได้เชื่อมระบบ rate (ตั้ง RATE_DATABASE_URL)')}</div> :
          <div style={{ marginTop: 8 }}><Bars data={(products || []).slice(0, 10)} label={x => x.name || x.routeid || '-'} value={x => +x.revenue} fmt={x => baht(x.revenue)} color="#E0972B" /></div>}
      </div>

      {/* ── ภาพรวม CRM (กราฟ) ── */}
      <h3 style={{ margin: '24px 0 10px' }}>{t('ภาพรวม CRM')}</h3>
      <div className="cards">
        <div className="card"><div className="label">{t('อัตราชนะ (Win rate)')}</div><div className="value">{d.win.winRate}%</div></div>
        <div className="card"><div className="label">{t('ดีลปิดได้')}</div><div className="value">{d.win.won}</div></div>
        <div className="card"><div className="label">{t('มูลค่าปิดได้')}</div><div className="value" style={{ fontSize: 18 }}>{baht(d.win.won_value)}</div></div>
        <div className="card"><div className="label">{t('มูลค่าไปป์ไลน์')}</div><div className="value" style={{ fontSize: 18 }}>{baht(d.win.open_value)}</div></div>
      </div>
      <div className="grid2">
        <div className="panel"><h3 style={{ marginTop: 0 }}>{t('กลุ่มเป้าหมายตามขั้นไปป์ไลน์')}</h3>
          <Bars data={d.funnel} label={f => f.seq + '. ' + f.name} value={f => f.cnt} fmt={f => f.cnt + ' · ' + baht(f.value)} color="#3B82C4" /></div>
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{t('ยอดขายตามผู้รับผิดชอบ')}</h3>
            {(salesVol || []).length > 10 && <a onClick={() => setModal({ title: t('ยอดขายตามผู้รับผิดชอบ'), cols: [t('เซลส์'), t('จำนวนบุ๊กกิ้ง'), t('ยอดรวม')], rows: salesVol.map((x, i) => [(i + 1) + '. ' + (x.name || x.fullname || t('ไม่ระบุเซลส์')), x.bookings, baht(x.revenue)]) })}>{t('ดูทั้งหมด')} →</a>}
          </div>
          <div className="muted" style={{ margin: '4px 0 8px' }}>{t('จากยอดบุ๊กกิ้งจริงของเอเจ้นท์ที่แต่ละคนดูแล')}</div>
          {rateErr ? <div className="muted">{t('ยังไม่ได้เชื่อมระบบ rate (ตั้ง RATE_DATABASE_URL)')}</div> :
            <Bars data={(salesVol || []).slice(0, 10)} label={o => o.name || o.fullname || t('ไม่ระบุเซลส์')} value={o => +o.revenue} fmt={o => baht(o.revenue)} color="#6E6FCB" />}
        </div>
      </div>
      <div className="grid2">
        <div className="panel"><h3 style={{ marginTop: 0 }}>{t('ยอดตามเดือน (วันเริ่มกลุ่มเป้าหมาย)')}</h3>
          {d.monthly.length ? <Bars data={d.monthly} label={m => m.month} value={m => +m.value} fmt={m => baht(m.value)} color="#12B981" /> : <div className="muted">-</div>}</div>
        <div className="panel"><h3 style={{ marginTop: 0 }}>{t('งานติดตามตามพนักงาน')}</h3>
          <table><thead><tr><th>{t('พนักงาน')}</th><th>{t('เสร็จ')}</th><th>{t('รอ')}</th><th>{t('เกินกำหนด')}</th></tr></thead><tbody>{d.activityByUser.map((u, i) => <tr key={i}><td>{u.name}</td><td>{u.done}</td><td>{u.pending}</td><td style={{ color: u.overdue ? '#EF5B52' : '' }}>{u.overdue}</td></tr>)}</tbody></table></div>
      </div>

      {modal && <div className="modal-bg" onClick={() => setModal(null)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{modal.title}</h3>
          <button type="button" aria-label="close" onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: 'var(--muted)' }}>×</button>
        </div>
        <div className="panel" style={{ marginTop: 12, maxHeight: '65vh', overflow: 'auto', padding: 0 }}>
          <table><thead><tr>{modal.cols.map((c, i) => <th key={i} style={{ textAlign: i === 0 ? 'left' : 'right' }}>{c}</th>)}</tr></thead>
            <tbody>{modal.rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j} style={{ textAlign: j === 0 ? 'left' : 'right' }}>{cell}</td>)}</tr>)}</tbody></table>
        </div>
      </div></div>}
    </div>
  );
}
