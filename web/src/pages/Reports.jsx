import { useEffect, useState } from 'react';
import { api, baht } from '../api.js';
import { useI18n } from '../i18n.jsx';

const rtry = (fn, n = 3, ms = 1200) => new Promise((res, rej) => {
  const go = (i) => fn().then(res).catch(e => i >= n ? rej(e) : setTimeout(() => go(i + 1), ms));
  go(0);
});

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const yearStart = () => new Date().getFullYear() + '-01-01';
const fmtDate = s => s ? new Date(s).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-';
const PAL = ['#FF4B26', '#1A191D', '#FF9269', '#8A8790', '#FFC5AC', '#E11D48', '#F59E0B', '#5B9DF9'];
const compact = n => { n = +n || 0; if (n >= 1e6) return '฿' + (n / 1e6).toFixed(2) + 'M'; if (n >= 1e3) return '฿' + Math.round(n / 1e3) + 'K'; return '฿' + Math.round(n).toLocaleString(); };

// ── dark-card spline (line + gradient + dashed tail) ──
function Spline({ vals }) {
  const a = (vals && vals.length ? vals : [1, 1]).map(Number);
  const W = 200, H = 64, mn = Math.min(...a), mx = Math.max(...a), rng = mx - mn || 1;
  const xs = i => (a.length === 1 ? W / 2 : i * W / (a.length - 1));
  const ys = v => 8 + (1 - (v - mn) / rng) * (H - 16);
  const pts = a.map((v, i) => [xs(i), ys(v)]);
  let dd = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) { const p1 = pts[i], p2 = pts[i + 1], m = (p1[0] + p2[0]) / 2; dd += ` C ${m} ${p1[1]} ${m} ${p2[1]} ${p2[0]} ${p2[1]}`; }
  const last = pts[pts.length - 1];
  return <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 56 }} preserveAspectRatio="none">
    <defs><linearGradient id="spg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".18" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient></defs>
    <path d={`${dd} L ${last[0]} ${H} L ${pts[0][0]} ${H} Z`} fill="url(#spg)" />
    <path d={dd} fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    <path d={`M ${last[0]} ${last[1]} C ${last[0] + 16} ${last[1]} ${last[0] + 20} ${last[1] - 6} ${W} ${last[1] - 8}`} fill="none" stroke="#fff" strokeWidth="1.6" strokeDasharray="2 4" opacity=".5" />
    <circle cx={last[0]} cy={last[1]} r="3.6" fill="#fff" />
  </svg>;
}

// ── light-card weekly mini bars ──
function MiniBars({ vals }) {
  const a = (vals && vals.length ? vals : [1]).map(Number).slice(-7);
  const mx = Math.max(1, ...a), peak = a.reduce((b, v, i) => v > a[b] ? i : b, 0);
  return <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 5, height: 52 }}>
    {a.map((v, i) => <div key={i} style={{ flex: '1 1 0', maxWidth: 18, height: Math.max(8, Math.round(v / mx * 100)) + '%', borderRadius: 4, background: i === peak ? '#FF4B26' : 'rgba(26,25,29,.18)' }} />)}
  </div>;
}

// ── orange-card dual segmented bar (win vs open) ──
function SegBar({ won, open }) {
  const tot = (won + open) || 1, wp = Math.round(won / tot * 100);
  return <div>
    <div style={{ height: 38, background: 'rgba(0,0,0,.18)', borderRadius: 10, display: 'flex', alignItems: 'center', padding: 6, gap: 4 }}>
      <div style={{ height: '100%', background: '#fff', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', width: wp + '%', minWidth: 34 }}><span style={{ fontSize: 10, fontWeight: 800, color: '#1A191D' }}>{wp}%</span></div>
      <div style={{ height: '100%', background: '#1A191D', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}><span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{100 - wp}%</span></div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, marginTop: 8, color: 'rgba(255,255,255,.9)' }}><span>● ปิดได้ {won}</span><span>● เปิดอยู่ {open}</span></div>
  </div>;
}

// ── striped monthly bar chart (income striped + profit solid, hover tooltip) ──
function StripedChart({ rows }) {
  const [hv, setHv] = useState(null);
  const data = (rows || []).slice(-12);
  const max = Math.max(1, ...data.map(r => +r.value));
  if (!data.length) return <div style={{ color: '#8A8790', padding: 20 }}>—</div>;
  const peak = data.reduce((b, r, i) => +r.value > +data[b].value ? i : b, 0);
  const gap = data.length > 7 ? 8 : 16;
  return <div>
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap, height: 260, borderBottom: '2px solid #ECEAEF' }}>
      {data.map((r, i) => { const total = Math.max(9, Math.round(+r.value / max * 100)), hot = i === peak, on = hv === i;
        return <div key={i} onMouseEnter={() => setHv(i)} onMouseLeave={() => setHv(null)} style={{ flex: '1 1 0', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
          {on && <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', background: '#1A191D', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 9px', borderRadius: 9, whiteSpace: 'nowrap', zIndex: 5, boxShadow: '0 4px 12px rgba(0,0,0,.18)' }}>{compact(+r.value)}</div>}
          <div style={{ width: '100%', maxWidth: 100, height: total + '%', minHeight: 9, display: 'flex', flexDirection: 'column', transition: 'height .2s' }}>
            <div style={{ height: '32%', borderRadius: '6px 6px 0 0', backgroundColor: (hot || on) ? 'rgba(255,75,38,.12)' : '#F1EFF3', backgroundImage: (hot || on) ? 'repeating-linear-gradient(45deg,rgba(255,75,38,.5) 0 3px,transparent 3px 7px)' : 'repeating-linear-gradient(45deg,rgba(26,25,29,.26) 0 3px,transparent 3px 7px)' }} />
            <div style={{ height: '68%', minHeight: 5, borderRadius: '0 0 3px 3px', background: (hot || on) ? 'linear-gradient(180deg,#FF7A4D,#FF4B26)' : '#1A191D' }} />
          </div>
        </div>; })}
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', gap, marginTop: 8 }}>
      {data.map((r, i) => <span key={i} style={{ flex: '1 1 0', minWidth: 0, textAlign: 'center', fontSize: 11, color: '#8A8790', fontWeight: 600 }}>{(r.month || '').slice(2)}</span>)}
    </div>
  </div>;
}

// ── segmented stripe donut (Top categories style) ──
function StripeDonut({ items, fmt }) {
  const [hv, setHv] = useState(null);
  const top = items.slice(0, 5).filter(x => x.v > 0);
  const tot = items.reduce((a, s) => a + s.v, 0) || 1;
  const R = 38, C = 2 * Math.PI * R; let off = 0;
  const segs = top.map((s, i) => { const len = s.v / tot * C, o = -off; off += len; return { ...s, i, dash: `${len} ${C - len}`, off: o }; });
  const cur = hv != null ? top[hv] : top[0];
  return <div>
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', margin: '6px 0 14px' }}>
      <svg width="168" height="168" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <defs><pattern id="stp" width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="0" y2="4" stroke="#FF4B26" strokeWidth="1.4" /></pattern></defs>
        {segs.map((s, i) => <circle key={i} cx="50" cy="50" r={R} fill="transparent" stroke={i === 2 ? 'url(#stp)' : PAL[i % PAL.length]} strokeWidth="11" strokeDasharray={s.dash} strokeDashoffset={s.off} onMouseEnter={() => setHv(i)} onMouseLeave={() => setHv(null)} style={{ cursor: 'pointer', transition: 'opacity .2s', opacity: hv == null || hv === i ? 1 : .45 }} />)}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700 }}>สัดส่วน</span>
        <span style={{ fontSize: 20, fontWeight: 800 }}>{cur ? Math.round(cur.v / tot * 100) : 0}%</span>
        <span style={{ fontSize: 10, color: 'var(--muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cur ? cur.name : ''}</span>
      </div>
    </div>
    <div>{top.map((s, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '4px 0' }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: i === 2 ? '#FF4B26' : PAL[i % PAL.length], flexShrink: 0 }} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
      <b style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(s.v)}</b></div>)}</div>
  </div>;
}

// ── vertical bars (sales-by-country style) ──
function VBars({ rows, label, value, fmt, onBar, active }) {
  const max = Math.max(1, ...rows.map(value));
  if (!rows.length) return <div style={{ color: '#8A8790', padding: 10 }}>—</div>;
  return <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, height: 150 }}>
    {rows.map((r, i) => { const h = Math.max(6, Math.round(value(r) / max * 100)), on = active && active(r);
      return <div key={i} onClick={onBar ? () => onBar(r) : undefined} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end', cursor: onBar ? 'pointer' : 'default', minWidth: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink-2)' }}>{fmt(r)}</span>
        <div style={{ width: '100%', maxWidth: 34, flex: 1, display: 'flex', alignItems: 'flex-end' }}><div style={{ width: '100%', height: h + '%', borderRadius: '8px 8px 4px 4px', background: on ? 'linear-gradient(180deg,#FF7A4D,#FF4B26)' : '#1A191D', transition: 'background .2s' }} /></div>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{label(r)}</span>
      </div>; })}
  </div>;
}

const Head = ({ title, right }) => <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{title}</h3>{right}</div>;

export default function Reports() {
  const { t } = useI18n();
  const [d, setD] = useState(null);
  const [from, setFrom] = useState(yearStart());
  const [to, setTo] = useState(today());
  const [sales, setSales] = useState([]);
  const [agentVol, setAgentVol] = useState(null);
  const [products, setProducts] = useState(null);
  const [salesVol, setSalesVol] = useState(null);
  const [openUser, setOpenUser] = useState(null);
  const [drill, setDrill] = useState([]);
  const [rateErr, setRateErr] = useState('');
  const [modal, setModal] = useState(null);
  const [wr, setWr] = useState(null);
  const [monthly, setMonthly] = useState(null);

  useEffect(() => { api('/reports/summary').then(setD).catch(() => {}); }, []);
  function loadReports() {
    const params = { from, to };
    rtry(() => api('/reports/sales-activity', { params })).then(r => setSales(r.rows || [])).catch(() => setSales([]));
    rtry(() => api('/rates/report/agent-volume', { params })).then(r => { setAgentVol(r.rows || []); setRateErr(''); }).catch(e => { setAgentVol([]); setRateErr(e.message); });
    rtry(() => api('/rates/report/product-volume', { params })).then(r => setProducts(r.rows || [])).catch(() => setProducts([]));
    rtry(() => api('/rates/report/sales-volume', { params })).then(r => setSalesVol(r.rows || [])).catch(() => setSalesVol([]));
    rtry(() => api('/rates/report/winrate', { params })).then(setWr).catch(() => setWr(null));
    rtry(() => api('/rates/report/monthly', { params })).then(r => setMonthly(r.rows || [])).catch(() => setMonthly(null));
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

  const av = agentVol || [], pv = products || [], sv = salesVol || [];
  const revTotal = av.reduce((a, x) => a + (+x.revenue || 0), 0);
  const bkTotal = av.reduce((a, x) => a + (+x.bookings || 0), 0);
  const mrows = (!rateErr && monthly && monthly.length) ? monthly : (d.monthly || []);
  const mSeries = mrows.map(m => +m.value);
  const mDeals = mrows.map(m => +m.deals);
  const mValTotal = mSeries.reduce((a, b) => a + b, 0);
  const win = (!rateErr && wr && wr.total != null && wr.total > 0)
    ? { winRate: Math.round(wr.won / wr.total * 100), won: wr.won, open: Math.max(0, (wr.total || 0) - (wr.won || 0)), won_value: +wr.won_value || 0 }
    : { winRate: d.win.winRate, won: d.win.won, open: d.win.open, won_value: +d.win.won_value || 0 };
  const seg = { background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '8px 12px', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 8 };
  const lnk = { color: '#FF4B26', fontWeight: 700, fontSize: 12, cursor: 'pointer' };

  return (
    <div className="rr">
      <style>{`.rr .rr-grid{display:grid;grid-template-columns:2.6fr 1fr;gap:14px}.rr .rr-left,.rr .rr-right{display:flex;flex-direction:column;gap:14px;min-width:0}.rr .rr-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}.rr .rr-3>*{min-width:0}@media(max-width:1000px){.rr .rr-grid{grid-template-columns:1fr}}@media(max-width:640px){.rr .rr-3{grid-template-columns:1fr}}`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div><h1 className="page" style={{ fontWeight: 800, margin: 0 }}>{t('รายงาน')}</h1><div className="page-sub" style={{ marginBottom: 8 }}>{t('ภาพรวมยอดจาก booking จริง')} · {fmtDate(from)} – {fmtDate(to)}</div></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={seg}>📅 <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ border: 'none', background: 'transparent', font: 'inherit', fontWeight: 700, width: 'auto', minWidth: 0, padding: 0, color: 'var(--ink)' }} /></div>
          <div style={seg}>→ <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ border: 'none', background: 'transparent', font: 'inherit', fontWeight: 700, width: 'auto', minWidth: 0, padding: 0, color: 'var(--ink)' }} /></div>
          <button className="btn" onClick={loadReports}>{t('ดูรายงาน')}</button>
        </div>
      </div>

      <div className="rr-grid" style={{ marginTop: 14 }}>
        <div className="rr-left">
          {/* 3 hero metric cards */}
          <div className="rr-3">
            <div style={{ background: '#1C1B1F', color: '#fff', borderRadius: 20, padding: 18, boxShadow: '0 10px 30px rgba(28,27,35,.18)' }}>
              <div style={{ fontSize: 12, color: '#A0A0A8', fontWeight: 600 }}>{t('ยอดส่งเข้าบริษัท')}</div>
              <div style={{ fontSize: 25, fontWeight: 800, margin: '8px 0 2px' }}>{compact(revTotal)}</div>
              <div style={{ fontSize: 11, color: '#A0A0A8' }}>{av.length} {t('เอเจ้นท์')} · {bkTotal.toLocaleString()} {t('บุ๊กกิ้ง')}</div>
              <div style={{ marginTop: 10 }}><Spline vals={mSeries} /></div>
            </div>
            <div style={{ background: '#FF4B26', color: '#fff', borderRadius: 20, padding: 18, boxShadow: '0 12px 30px rgba(255,75,38,.28)' }}>
              <div style={{ fontSize: 12, opacity: .85, fontWeight: 600 }}>{t('อัตราชนะ (Win rate)')}</div>
              <div style={{ fontSize: 25, fontWeight: 800, margin: '8px 0 2px' }}>{win.winRate}%</div>
              <div style={{ fontSize: 11, opacity: .82 }}>{win.won} {t('ปิดได้')} · {compact(win.won_value)}</div>
              <div style={{ marginTop: 14 }}><SegBar won={win.won} open={win.open} /></div>
            </div>
            <div className="card">
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{t('มูลค่าดีล (รายเดือน)')}</div>
              <div style={{ fontSize: 25, fontWeight: 800, margin: '8px 0 2px' }}>{compact(mValTotal)}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{mDeals.reduce((a, b) => a + b, 0).toLocaleString()} {t('ดีล')}</div>
              <div style={{ marginTop: 14 }}><MiniBars vals={mSeries} /></div>
            </div>
          </div>

          {/* striped monthly chart */}
          <div className="card">
            <Head title={t('ยอดรายเดือน')} right={<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#1A191D', marginRight: 5 }} />{t('ยอดขายจริง')}</span>} />
            <StripedChart rows={mrows} />
          </div>

          {/* agent table */}
          <div className="card">
            <Head title={t('ลำดับเอเจ้นท์ตามยอดที่ส่งให้บริษัท')} right={av.length > 8 && <a style={lnk} onClick={() => setModal({ title: t('ลำดับเอเจ้นท์ตามยอดที่ส่งให้บริษัท'), cols: [t('เอเจ้นท์'), t('จำนวนบุ๊กกิ้ง'), t('ยอดรวม')], rows: av.map((x, i) => [(i + 1) + '. ' + (x.name || x.agentid), x.bookings, baht(x.revenue)]) })}>{t('ดูทั้งหมด')} ({av.length}) →</a>} />
            {rateErr ? <div style={{ color: '#8A8790', fontSize: 12.5 }}>{t('ยังไม่ได้เชื่อมระบบ rate (ตั้ง RATE_DATABASE_URL)')}</div> :
              <div style={{ overflowX: 'auto' }}><table><thead><tr><th>{t('เอเจ้นท์')}</th><th style={{ textAlign: 'right' }}>{t('บุ๊กกิ้ง')}</th><th style={{ textAlign: 'right' }}>{t('ยอดรวม')}</th></tr></thead>
                <tbody>{av.slice(0, 8).map((x, i) => <tr key={i}><td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 24, height: 24, borderRadius: 8, background: i < 3 ? '#FF4B26' : 'var(--line)', color: i < 3 ? '#fff' : 'var(--muted)', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span><b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.name || x.agentid}</b></div></td><td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{x.bookings}</td><td style={{ textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{baht(x.revenue)}</td></tr>)}</tbody></table></div>}
          </div>

          {/* sales-visit vertical bars + drill */}
          <div className="card">
            <Head title={t('ลำดับเซลส์ที่ติดต่อ/เข้าพบเอเจ้นท์เยอะสุด')} right={sales.length > 6 && <a style={lnk} onClick={() => setModal({ title: t('ลำดับเซลส์ที่ติดต่อ/เข้าพบเอเจ้นท์เยอะสุด'), cols: [t('เซลส์'), t('รวม (ครั้ง)'), t('แยกช่องทาง')], rows: sales.map((x, i) => [(i + 1) + '. ' + (x.name || '-'), x.total, methodsStr(x.methods)]) })}>{t('ดูทั้งหมด')} ({sales.length}) →</a>} />
            <div style={{ color: 'var(--muted)', fontSize: 11.5, marginBottom: 8 }}>{t('คลิกแท่งเพื่อดูว่าไปเอเจ้นท์ไหนบ้าง')}</div>
            <VBars rows={sales.slice(0, 6)} label={x => x.name || '-'} value={x => x.total} fmt={x => x.total} onBar={toggleUser} active={x => openUser === x.uid} />
            {openUser != null && <div style={{ marginTop: 12, padding: 12, background: 'rgba(255,75,38,.06)', borderRadius: 12 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>{t('เอเจ้นท์ที่เข้าพบ')} ({drill.length})</div>
              {drill.length ? drill.map(x => <div key={x.customer_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', borderBottom: '1px solid var(--line-soft)' }}><span>{x.name || '-'}</span><span style={{ color: 'var(--muted)' }}>{x.n} {t('ครั้ง')} · {fmtDate(x.last_at)}</span></div>) : <div style={{ color: '#8A8790' }}>{t('ไม่มีข้อมูลในช่วงนี้')}</div>}
            </div>}
          </div>
        </div>

        <div className="rr-right">
          {/* Top Product stripe donut */}
          <div className="card">
            <Head title={t('Top 10 Product (เส้นทาง) ตามยอด')} right={pv.length > 0 && <a style={lnk} onClick={() => setModal({ title: t('Top 10 Product (เส้นทาง) ตามยอด'), cols: [t('Product / เส้นทาง'), t('จำนวนบุ๊กกิ้ง'), t('ยอดรวม')], rows: pv.map((x, i) => [(i + 1) + '. ' + (x.name || x.routeid), x.bookings, baht(x.revenue)]) })}>→</a>} />
            {rateErr ? <div style={{ color: '#8A8790', fontSize: 12.5 }}>{t('ยังไม่ได้เชื่อมระบบ rate (ตั้ง RATE_DATABASE_URL)')}</div> :
              <StripeDonut items={pv.map(x => ({ name: x.name || x.routeid, v: +x.revenue }))} fmt={compact} />}
          </div>

          {/* owner vertical bars */}
          <div className="card">
            <Head title={t('ยอดขายตามผู้รับผิดชอบ')} right={sv.length > 5 && <a style={lnk} onClick={() => setModal({ title: t('ยอดขายตามผู้รับผิดชอบ'), cols: [t('เซลส์'), t('จำนวนบุ๊กกิ้ง'), t('ยอดรวม')], rows: sv.map((x, i) => [(i + 1) + '. ' + (x.name || x.fullname || t('ไม่ระบุเซลส์')), x.bookings, baht(x.revenue)]) })}>→</a>} />
            {rateErr ? <div style={{ color: '#8A8790', fontSize: 12.5 }}>{t('ยังไม่ได้เชื่อมระบบ rate (ตั้ง RATE_DATABASE_URL)')}</div> :
              <VBars rows={sv.slice(0, 5)} label={x => x.name || x.fullname || t('ไม่ระบุ')} value={x => +x.revenue} fmt={x => compact(x.revenue)} />}
          </div>

          {/* activity table */}
          <div className="card">
            <Head title={t('งานติดตามตามพนักงาน')} />
            <table><thead><tr><th>{t('พนักงาน')}</th><th style={{ textAlign: 'right' }}>{t('เสร็จ')}</th><th style={{ textAlign: 'right' }}>{t('รอ')}</th><th style={{ textAlign: 'right' }}>{t('เกิน')}</th></tr></thead><tbody>{d.activityByUser.map((u, i) => <tr key={i}><td>{u.name}</td><td style={{ textAlign: 'right' }}>{u.done}</td><td style={{ textAlign: 'right' }}>{u.pending}</td><td style={{ textAlign: 'right', color: u.overdue ? '#E11D48' : '' }}>{u.overdue}</td></tr>)}</tbody></table>
          </div>
        </div>
      </div>

      {modal && <div className="modal-bg" onClick={() => setModal(null)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0 }}>{modal.title}</h3><button type="button" aria-label="close" onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: 'var(--muted)' }}>×</button></div>
        <div className="panel" style={{ marginTop: 12, maxHeight: '65vh', overflow: 'auto', padding: 0 }}>
          <table><thead><tr>{modal.cols.map((c, i) => <th key={i} style={{ textAlign: i === 0 ? 'left' : 'right' }}>{c}</th>)}</tr></thead><tbody>{modal.rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j} style={{ textAlign: j === 0 ? 'left' : 'right' }}>{cell}</td>)}</tr>)}</tbody></table>
        </div>
      </div></div>}
    </div>
  );
}
