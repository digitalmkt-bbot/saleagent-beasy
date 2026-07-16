import { useEffect, useState } from 'react';
import { api, baht } from '../api.js';
import { useI18n } from '../i18n.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const fmtDate = s => s ? new Date(s).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-';
const PALETTE = ['#6366F1', '#12B981', '#E0972B', '#3B82C4', '#EC4899', '#8B5CF6', '#14B8A6', '#F97316', '#EF4444', '#06B6D4'];
const smooth = pts => { if (pts.length < 2) return ''; let d = `M ${pts[0][0]} ${pts[0][1]}`; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2; d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`; } return d; };

// ── กราฟแท่งไล่เฉด (แนวนอน) ──
function GBars({ data, label, value, fmt, c1 = '#6366F1', c2 = '#A5B4FC', onBar, active }) {
  const max = Math.max(1, ...data.map(value));
  if (!data.length) return <div className="muted" style={{ padding: '8px 0' }}>—</div>;
  return <div>{data.map((x, i) => (
    <div key={i} onClick={onBar ? () => onBar(x) : undefined}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', cursor: onBar ? 'pointer' : 'default', background: active && active(x) ? 'rgba(99,102,241,.06)' : 'transparent', borderRadius: 8 }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: i < 3 ? c1 : '#EEF0F6', color: i < 3 ? '#fff' : '#8891B0', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
      <div style={{ width: 160, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{onBar ? (active && active(x) ? '▾ ' : '▸ ') : ''}{label(x)}</div>
      <div style={{ flex: 1, background: '#F1F3F9', borderRadius: 8, height: 18, minWidth: 40, overflow: 'hidden' }}>
        <div style={{ width: Math.max(2, Math.round(value(x) / max * 100)) + '%', background: `linear-gradient(90deg, ${c1}, ${c2})`, height: '100%', borderRadius: 8, transition: 'width .5s' }} />
      </div>
      <div style={{ width: 108, textAlign: 'right', fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(x)}</div>
    </div>
  ))}</div>;
}

// ── โดนัท + legend ──
function Donut({ items, fmt }) {
  const top = items.slice(0, 7);
  const restV = items.slice(7).reduce((a, s) => a + s.v, 0);
  const segs = restV > 0 ? [...top, { name: 'อื่นๆ', v: restV }] : top;
  const tot = segs.reduce((a, s) => a + s.v, 0) || 1;
  const R = 62, r = 40, cx = 74, cy = 74; let ang = -Math.PI / 2; const arcs = [];
  segs.forEach((s, i) => {
    const frac = s.v / tot, a1 = ang + frac * 2 * Math.PI, lg = frac > 0.5 ? 1 : 0;
    const x0 = cx + R * Math.cos(ang), y0 = cy + R * Math.sin(ang), x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    const xi1 = cx + r * Math.cos(a1), yi1 = cy + r * Math.sin(a1), xi0 = cx + r * Math.cos(ang), yi0 = cy + r * Math.sin(ang);
    if (frac > 0.0001) arcs.push(<path key={i} d={`M ${x0} ${y0} A ${R} ${R} 0 ${lg} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${r} ${r} 0 ${lg} 0 ${xi0} ${yi0} Z`} fill={PALETTE[i % PALETTE.length]} />);
    ang = a1;
  });
  return <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
    <svg viewBox="0 0 148 148" style={{ width: 148, height: 148, flexShrink: 0 }}>{arcs}
      <text x="74" y="72" textAnchor="middle" fontSize="15" fontWeight="800" fill="#1E293B">{fmt(tot)}</text>
      <text x="74" y="90" textAnchor="middle" fontSize="10" fill="#8891B0">รวม</text></svg>
    <div style={{ flex: 1, minWidth: 180 }}>{segs.map((s, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: '3px 0' }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
        <b style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(s.v / tot * 100)}%</b>
        <span className="muted" style={{ width: 90, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(s.v)}</span>
      </div>))}</div>
  </div>;
}

// ── กราฟเส้น + พื้นที่ไล่เฉด ──
function Area({ data, label, value, fmt, color = '#12B981' }) {
  if (!data.length) return <div className="muted">-</div>;
  const W = 460, H = 150, pl = 8, pr = 8, pt = 14, pb = 24, mx = Math.max(1, ...data.map(value));
  const xs = i => pl + (data.length === 1 ? (W - pl - pr) / 2 : i * (W - pl - pr) / (data.length - 1));
  const ys = v => pt + (1 - v / mx) * (H - pt - pb);
  const pts = data.map((x, i) => [xs(i), ys(value(x))]);
  const ln = smooth(pts), ar = `${ln} L ${xs(data.length - 1)} ${H - pb} L ${xs(0)} ${H - pb} Z`;
  const peak = data.reduce((b, x, i) => value(x) > value(data[b]) ? i : b, 0);
  return <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%' }}>
    <defs><linearGradient id={'ag' + color.slice(1)} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".28" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
    <path d={ar} fill={`url(#ag${color.slice(1)})`} /><path d={ln} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === peak ? 4 : 3} fill="#fff" stroke={color} strokeWidth="2" />)}
    {data.map((x, i) => <text key={i} x={xs(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="#8891B0">{label(x)}</text>)}
  </svg>;
}

// ── ฟันเนล (แท่งจัดกึ่งกลาง) ──
function Funnel({ data }) {
  const max = Math.max(1, ...data.map(f => f.cnt));
  return <div>{data.map((f, i) => { const w = Math.max(6, Math.round(f.cnt / max * 100)); return (
    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '3px 0' }}>
      <div style={{ width: 150, fontSize: 12, textAlign: 'right', color: '#5F5E5A' }}>{f.seq}. {f.name.length > 18 ? f.name.slice(0, 17) + '…' : f.name}</div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: w + '%', height: 24, borderRadius: 6, background: `linear-gradient(90deg, ${PALETTE[i % PALETTE.length]}, ${PALETTE[(i + 1) % PALETTE.length]})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, minWidth: 30 }}>{f.cnt}</div>
      </div>
      <div style={{ width: 90, fontSize: 11.5, textAlign: 'right' }} className="muted">{baht(f.value)}</div>
    </div>); })}</div>;
}

// ── เกจครึ่งวงกลม ──
function Gauge({ value, label }) {
  const v = Math.max(0, Math.min(100, value)), cx = 90, cy = 84, R = 66;
  const a = deg => (180 - deg * 1.8) * Math.PI / 180, pt = (deg, rr) => [cx + rr * Math.cos(a(deg)), cy - rr * Math.sin(a(deg))];
  const arc = (d0, d1, rr) => { const [x0, y0] = pt(d0, rr), [x1, y1] = pt(d1, rr); return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${rr} ${rr} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
  const [nx, ny] = pt(v, R - 10);
  return <div style={{ textAlign: 'center' }}><svg viewBox="0 0 180 100" style={{ width: '100%', maxWidth: 220 }}>
    <defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#EF4444" /><stop offset="0.5" stopColor="#E0972B" /><stop offset="1" stopColor="#12B981" /></linearGradient></defs>
    <path d={arc(0, 100, R)} fill="none" stroke="#EEF0F6" strokeWidth="12" strokeLinecap="round" />
    <path d={arc(0, v, R)} fill="none" stroke="url(#gg)" strokeWidth="12" strokeLinecap="round" />
    <line x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)} stroke="#1E293B" strokeWidth="3" strokeLinecap="round" /><circle cx={cx} cy={cy} r="4" fill="#1E293B" />
    <text x={cx} y={cy - 18} textAnchor="middle" fontSize="22" fontWeight="800" fill="#1E293B">{v}%</text></svg>
    <div className="muted" style={{ fontSize: 12 }}>{label}</div></div>;
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

      <div className="grid-2-1">
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{t('ลำดับเซลส์ที่ติดต่อ/เข้าพบเอเจ้นท์เยอะสุด')}</h3>
            {sales.length > 10 && <a onClick={() => setModal({ title: t('ลำดับเซลส์ที่ติดต่อ/เข้าพบเอเจ้นท์เยอะสุด'), cols: [t('เซลส์'), t('รวม (ครั้ง)'), t('แยกช่องทาง')], rows: sales.map((x, i) => [(i + 1) + '. ' + (x.name || '-'), x.total, methodsStr(x.methods)]) })}>{t('ดูทั้งหมด')} ({sales.length}) →</a>}
          </div>
          <div className="muted" style={{ margin: '4px 0 8px' }}>{t('นับทุกช่องทาง · คลิกแท่งเพื่อดูว่าไปเอเจ้นท์ไหนบ้าง')}</div>
          <GBars data={sales.slice(0, 10)} label={x => x.name || '-'} value={x => x.total} fmt={x => x.total + ' ' + t('ครั้ง')} c1="#6366F1" c2="#A5B4FC" onBar={toggleUser} active={x => openUser === x.uid} />
          {openUser != null && <div style={{ marginTop: 10, padding: 12, background: 'rgba(0,0,0,.02)', borderRadius: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>{t('เอเจ้นท์ที่เข้าพบ')} ({drill.length})</div>
            {drill.length ? drill.map(x => <div key={x.customer_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', borderBottom: '1px solid #f0f0ee' }}><span>{x.name || '-'}</span><span className="muted">{x.n} {t('ครั้ง')} · {t('ล่าสุด')} {fmtDate(x.last_at)}</span></div>) : <div className="muted">{t('ไม่มีข้อมูลในช่วงนี้')}</div>}
          </div>}
        </div>
        <div className="panel"><h3 style={{ marginTop: 0 }}>{t('อัตราชนะ (Win rate)')}</h3>
          <Gauge value={d.win.winRate} label={`${d.win.won} ${t('ดีลปิดได้')} · ${baht(d.win.won_value)}`} />
        </div>
      </div>

      <div className="grid2">
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{t('ลำดับเอเจ้นท์ตามยอดที่ส่งให้บริษัท')}</h3>
            {(agentVol || []).length > 10 && <a onClick={() => setModal({ title: t('ลำดับเอเจ้นท์ตามยอดที่ส่งให้บริษัท'), cols: [t('เอเจ้นท์'), t('จำนวนบุ๊กกิ้ง'), t('ยอดรวม')], rows: agentVol.map((x, i) => [(i + 1) + '. ' + (x.name || x.agentid), x.bookings, baht(x.revenue)]) })}>{t('ดูทั้งหมด')} ({agentVol.length}) →</a>}
          </div>
          {rateErr ? <div className="muted" style={{ marginTop: 8 }}>{t('ยังไม่ได้เชื่อมระบบ rate (ตั้ง RATE_DATABASE_URL)')}</div> :
            <div style={{ marginTop: 8 }}><GBars data={(agentVol || []).slice(0, 10)} label={x => x.name || x.agentid} value={x => +x.revenue} fmt={x => baht(x.revenue)} c1="#12B981" c2="#6EE7B7" /></div>}
        </div>
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{t('Top 10 Product (เส้นทาง) ตามยอด')}</h3>
            {(products || []).length > 10 && <a onClick={() => setModal({ title: t('Top 10 Product (เส้นทาง) ตามยอด'), cols: [t('Product / เส้นทาง'), t('จำนวนบุ๊กกิ้ง'), t('ยอดรวม')], rows: products.map((x, i) => [(i + 1) + '. ' + (x.name || x.routeid), x.bookings, baht(x.revenue)]) })}>{t('ดูทั้งหมด')} →</a>}
          </div>
          {rateErr ? <div className="muted" style={{ marginTop: 8 }}>{t('ยังไม่ได้เชื่อมระบบ rate (ตั้ง RATE_DATABASE_URL)')}</div> :
            <div style={{ marginTop: 8 }}><GBars data={(products || []).slice(0, 10)} label={x => x.name || x.routeid || '-'} value={x => +x.revenue} fmt={x => baht(x.revenue)} c1="#E0972B" c2="#FCD34D" /></div>}
        </div>
      </div>

      <div className="grid2">
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{t('ยอดขายตามผู้รับผิดชอบ')}</h3>
            {(salesVol || []).length > 8 && <a onClick={() => setModal({ title: t('ยอดขายตามผู้รับผิดชอบ'), cols: [t('เซลส์'), t('จำนวนบุ๊กกิ้ง'), t('ยอดรวม')], rows: salesVol.map((x, i) => [(i + 1) + '. ' + (x.name || x.fullname || t('ไม่ระบุเซลส์')), x.bookings, baht(x.revenue)]) })}>{t('ดูทั้งหมด')} →</a>}
          </div>
          <div className="muted" style={{ margin: '4px 0 8px' }}>{t('จากยอดบุ๊กกิ้งจริงของเอเจ้นท์ที่แต่ละคนดูแล')}</div>
          {rateErr ? <div className="muted">{t('ยังไม่ได้เชื่อมระบบ rate (ตั้ง RATE_DATABASE_URL)')}</div> :
            <Donut items={(salesVol || []).map(x => ({ name: x.name || x.fullname || t('ไม่ระบุเซลส์'), v: +x.revenue }))} fmt={baht} />}
        </div>
        <div className="panel"><h3 style={{ marginTop: 0 }}>{t('ยอดตามเดือน (วันเริ่มกลุ่มเป้าหมาย)')}</h3>
          {d.monthly.length ? <Area data={d.monthly} label={m => (m.month || '').slice(2)} value={m => +m.value} fmt={baht} color="#3B82C4" /> : <div className="muted">-</div>}
        </div>
      </div>

      <div className="panel"><h3 style={{ marginTop: 0 }}>{t('งานติดตามตามพนักงาน')}</h3>
        <table><thead><tr><th>{t('พนักงาน')}</th><th>{t('เสร็จ')}</th><th>{t('รอ')}</th><th>{t('เกินกำหนด')}</th></tr></thead><tbody>{d.activityByUser.map((u, i) => <tr key={i}><td>{u.name}</td><td>{u.done}</td><td>{u.pending}</td><td style={{ color: u.overdue ? '#EF5B52' : '' }}>{u.overdue}</td></tr>)}</tbody></table></div>

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
