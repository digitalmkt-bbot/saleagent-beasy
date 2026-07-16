import { useEffect, useState } from 'react';
import { api, baht } from '../api.js';
import { useI18n } from '../i18n.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };
const fmtDate = s => s ? new Date(s).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-';
const PAL = ['#6C5CE7', '#43C6AC', '#F178B6', '#F5A25D', '#5B9DF9', '#B6A7F5', '#EAB308', '#EF4444'];
const compact = n => { n = +n || 0; if (n >= 1e6) return '฿' + (n / 1e6).toFixed(2) + 'M'; if (n >= 1e3) return '฿' + Math.round(n / 1e3) + 'K'; return '฿' + Math.round(n).toLocaleString(); };

// ── sparkline (line + end dot + dashed tail) ──
function Spark({ vals, color }) {
  const a = (vals && vals.length ? vals : [1, 1]).map(Number);
  const W = 200, H = 44, mn = Math.min(...a), mx = Math.max(...a), rng = mx - mn || 1;
  const xs = i => (a.length === 1 ? W / 2 : i * W / (a.length - 1));
  const ys = v => 6 + (1 - (v - mn) / rng) * (H - 12);
  const pts = a.map((v, i) => [xs(i), ys(v)]);
  let dd = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) { const p1 = pts[i], p2 = pts[i + 1], mx2 = (p1[0] + p2[0]) / 2; dd += ` C ${mx2} ${p1[1]} ${mx2} ${p2[1]} ${p2[0]} ${p2[1]}`; }
  const last = pts[pts.length - 1];
  return <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 40 }} preserveAspectRatio="none">
    <path d={dd} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    <path d={`M ${last[0]} ${last[1]} C ${last[0] + 18} ${last[1]} ${last[0] + 22} ${last[1] - 8} ${W} ${last[1] - 10}`} fill="none" stroke={color} strokeWidth="2" strokeDasharray="2 4" strokeLinecap="round" opacity=".55" />
    <circle cx={last[0]} cy={last[1]} r="3.6" fill="#fff" stroke={color} strokeWidth="2.4" />
  </svg>;
}

// ── horizontal rounded bars w/ rank ──
function HBars({ data, label, value, fmt, c1, c2, onBar, active }) {
  const max = Math.max(1, ...data.map(value));
  if (!data.length) return <div style={{ color: '#9A96B6', padding: '10px 0', fontSize: 13 }}>—</div>;
  return <div>{data.map((x, i) => {
    const w = Math.max(4, Math.round(value(x) / max * 100)), on = active && active(x);
    return <div key={i} onClick={onBar ? () => onBar(x) : undefined} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '7px 6px', cursor: onBar ? 'pointer' : 'default', borderRadius: 12, background: on ? 'rgba(108,92,231,.07)' : 'transparent' }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: i < 3 ? c1 : '#F1EFFA', color: i < 3 ? '#fff' : '#9A96B6' }}>{i + 1}</span>
      <span style={{ width: 150, fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{onBar ? (on ? '▾ ' : '▸ ') : ''}{label(x)}</span>
      <span style={{ flex: 1, height: 16, background: '#F1EFFA', borderRadius: 8, overflow: 'hidden' }}><span style={{ display: 'block', width: w + '%', height: '100%', borderRadius: 8, background: `linear-gradient(90deg, ${c1}, ${c2})`, transition: 'width .5s' }} /></span>
      <span style={{ width: 104, textAlign: 'right', fontSize: 12.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(x)}</span>
    </div>;
  })}</div>;
}

// ── concentric ring chart (My assets style) ──
function Ring({ items, fmt }) {
  const top = items.slice(0, 4).filter(x => x.v > 0);
  const tot = items.reduce((a, s) => a + s.v, 0) || 1;
  const cx = 84, cy = 84, radii = [66, 52, 38, 24], sw = 10, C = 2 * Math.PI;
  const chipPos = [{ top: 4, left: 0 }, { top: 40, right: 0 }, { bottom: 30, left: 6 }, { bottom: 2, right: 10 }];
  return <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
    <div style={{ position: 'relative', width: 168, height: 168, flexShrink: 0 }}>
      <svg viewBox="0 0 168 168" style={{ width: 168, height: 168 }}>
        {top.map((s, i) => { const r = radii[i], len = C * r, arc = Math.max(.06, s.v / tot) * len;
          return <g key={i}><circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1EFFA" strokeWidth={sw} />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={PAL[i]} strokeWidth={sw} strokeDasharray={`${arc} ${len}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} /></g>; })}
        <circle cx={cx} cy={cy} r="15" fill="#F7F6FD" /><text x={cx} y={cy + 4} textAnchor="middle" fontSize="13">↻</text>
      </svg>
      {top.slice(0, 3).map((s, i) => <div key={i} style={{ position: 'absolute', ...chipPos[i], background: '#fff', boxShadow: '0 4px 14px rgba(90,74,160,.14)', borderRadius: 10, padding: '4px 8px', fontSize: 10.5, lineHeight: 1.3 }}>
        <div style={{ color: '#8E8AAB', fontWeight: 600, maxWidth: 92, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span style={{ color: PAL[i] }}>●</span> {s.name}</div>
        <div style={{ fontWeight: 800 }}>{fmt(s.v)}</div>
      </div>)}
    </div>
    <div style={{ flex: 1, minWidth: 150 }}>{top.map((s, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: '4px 0' }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: PAL[i], flexShrink: 0 }} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
      <b style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(s.v / tot * 100)}%</b>
    </div>)}</div>
  </div>;
}

// ── budget-style: total + legend + segmented bar ──
function Budget({ items, total }) {
  const top = items.slice(0, 4);
  const tot = items.reduce((a, s) => a + s.v, 0) || 1;
  return <div>
    <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.5px', margin: '2px 0 10px' }}>{compact(total)}</div>
    <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', gap: 3, marginBottom: 12 }}>
      {top.map((s, i) => <span key={i} style={{ width: (s.v / tot * 100) + '%', background: PAL[i] }} />)}
    </div>
    {top.map((s, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: '4px 0' }}>
      <b style={{ width: 38, fontVariantNumeric: 'tabular-nums' }}>{Math.round(s.v / tot * 100)}%</b>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: PAL[i] }} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
    </div>)}
  </div>;
}

// ── profit&loss style vertical pill bars ──
function PLBars({ months }) {
  const data = (months || []).slice(-6);
  const max = Math.max(1, ...data.map(m => +m.value));
  const peak = data.reduce((b, m, i) => (+m.value > +data[b].value ? i : b), 0);
  if (!data.length) return <div style={{ color: '#9A96B6' }}>—</div>;
  return <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', justifyContent: 'space-between', height: 128 }}>
    {data.map((m, i) => { const h = Math.max(8, Math.round(+m.value / max * 100)), hot = i === peak;
      return <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ width: '100%', maxWidth: 40, height: 90, background: '#F4F2FC', borderRadius: 12, display: 'flex', alignItems: 'flex-end', overflow: 'hidden', border: hot ? '2px solid #6C5CE7' : '2px solid transparent' }}>
          <div style={{ width: '100%', height: h + '%', borderRadius: 10, background: hot ? 'linear-gradient(180deg,#8B7BF0,#6C5CE7)' : '#E4E0F6' }} />
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: hot ? '#6C5CE7' : '#9A96B6' }}>{h}%</span>
        <span style={{ fontSize: 9.5, color: '#8E8AAB' }}>{(m.month || '').slice(2)}</span>
      </div>; })}
  </div>;
}

const Pill = ({ dir, children }) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: dir === 'up' ? '#E4F7F0' : dir === 'dn' ? '#FCE7F1' : '#EEECF7', color: dir === 'up' ? '#1FA97F' : dir === 'dn' ? '#E0559A' : '#8E8AAB' }}>{dir === 'up' ? '▲' : dir === 'dn' ? '▼' : '='} {children}</span>;
const Card = ({ children, style }) => <div style={{ background: '#fff', borderRadius: 20, padding: 18, boxShadow: '0 6px 26px rgba(90,74,160,.07)', ...style }}>{children}</div>;
const Head = ({ title, right }) => <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{title}</h3>{right}</div>;

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
  const [wr, setWr] = useState(null);

  useEffect(() => { api('/reports/summary').then(setD).catch(() => {}); }, []);
  function loadReports() {
    const params = { from, to };
    api('/reports/sales-activity', { params }).then(r => setSales(r.rows || [])).catch(() => setSales([]));
    api('/rates/report/agent-volume', { params }).then(r => { setAgentVol(r.rows || []); setRateErr(''); }).catch(e => { setAgentVol([]); setRateErr(e.message); });
    api('/rates/report/product-volume', { params }).then(r => setProducts(r.rows || [])).catch(() => setProducts([]));
    api('/rates/report/sales-volume', { params }).then(r => setSalesVol(r.rows || [])).catch(() => setSalesVol([]));
    api('/rates/report/winrate', { params }).then(setWr).catch(() => setWr(null));
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
  const mSeries = (d.monthly || []).map(m => +m.value);
  const mDeals = (d.monthly || []).map(m => +m.deals);
  const mValTotal = mSeries.reduce((a, b) => a + b, 0);
  const win = (!rateErr && wr && wr.total != null && wr.total > 0)
    ? { winRate: Math.round(wr.won / wr.total * 100), won: wr.won, open: Math.max(0, (wr.total || 0) - (wr.won || 0)), won_value: +wr.won_value || 0 }
    : d.win;
  const seg = { background: '#F4F2FC', borderRadius: 12, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, color: '#5b5680', display: 'flex', alignItems: 'center', gap: 8 };

  return (
    <div className="rpt">
      <style>{`.rpt{--gap:14px}.rpt input[type=date]{border:none;background:transparent;font:inherit;font-weight:700;color:#211C43;cursor:pointer}.rpt .r4{display:grid;gap:14px;grid-template-columns:repeat(4,1fr)}.rpt .r3{display:grid;gap:14px;grid-template-columns:1.15fr 1fr 1fr}.rpt .r2{display:grid;gap:14px;grid-template-columns:1.35fr 1fr}.rpt .rowm{margin-bottom:14px}.rpt a.lnk{color:#6C5CE7;font-weight:700;font-size:12px;cursor:pointer}.rpt .kl{font-size:12px;color:#8E8AAB;font-weight:600;display:flex;align-items:center;gap:7px}.rpt .ki{width:26px;height:26px;border-radius:9px;display:flex;align-items:center;justify-content:center}.rpt .kv{font-size:23px;font-weight:800;margin:8px 0 3px;letter-spacing:-.5px}.rpt .ks{font-size:11.5px;color:#8E8AAB}@media(max-width:820px){.rpt .r4,.rpt .r3,.rpt .r2{grid-template-columns:1fr 1fr}}`}</style>

      <h1 className="page" style={{ fontWeight: 800 }}>{t('รายงาน')}</h1>

      <Card style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={seg}>📅 {t('จากวันที่')} <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div style={seg}>📅 {t('ถึงวันที่')} <input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
        <button className="btn" onClick={loadReports}>{t('ดูรายงาน')}</button>
        <span style={{ marginLeft: 'auto', color: '#8E8AAB', fontSize: 12, fontWeight: 600 }}>{fmtDate(from)} – {fmtDate(to)}</span>
      </Card>

      {/* KPI row (real data) */}
      <div className="r4 rowm">
        <Card>
          <div className="kl"><span className="ki" style={{ background: '#EEEAFE' }}>💰</span>{t('ยอดส่งเข้าบริษัท (Rate)')}</div>
          <div className="kv">{compact(revTotal)}</div>
          <div className="ks">{av.length} {t('เอเจ้นท์')} · {bkTotal.toLocaleString()} {t('บุ๊กกิ้ง')}</div>
        </Card>
        <Card>
          <div className="kl"><span className="ki" style={{ background: '#E4F7F0' }}>🎯</span>{t('อัตราชนะ (Win rate)')}</div>
          <div className="kv">{win.winRate}%</div>
          <div className="ks">{win.won} {t('ปิดได้')} · {win.open} {t('เปิดอยู่')}</div>
        </Card>
        <Card>
          <div className="kl"><span className="ki" style={{ background: '#FDECF4' }}>🧾</span>{t('มูลค่าดีล (รายเดือน)')}</div>
          <div className="kv">{compact(mValTotal)}</div>
          {mSeries.length ? <Spark vals={mSeries} color="#F178B6" /> : <div className="ks">—</div>}
        </Card>
        <Card>
          <div className="kl"><span className="ki" style={{ background: '#EAF2FF' }}>📈</span>{t('จำนวนดีล')}</div>
          <div className="kv">{mDeals.reduce((a, b) => a + b, 0).toLocaleString()}</div>
          {mDeals.length ? <Spark vals={mDeals} color="#5B9DF9" /> : <div className="ks">—</div>}
        </Card>
      </div>

      {/* Profit&Loss | Budget | Win rate */}
      <div className="r3 rowm">
        <Card>
          <Head title={t('ยอดรายเดือน')} right={<Pill dir="up">YTD</Pill>} />
          <PLBars months={d.monthly} />
          <div style={{ display: 'flex', gap: 18, marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1EFFA' }}>
            <div><div style={{ fontSize: 10.5, color: '#8E8AAB', fontWeight: 700, letterSpacing: '.4px' }}>{t('เดือนล่าสุด')}</div><div style={{ fontSize: 18, fontWeight: 800 }}>{compact(+(d.monthly.slice(-1)[0]?.value || 0))}</div></div>
            <div><div style={{ fontSize: 10.5, color: '#8E8AAB', fontWeight: 700, letterSpacing: '.4px' }}>{t('รวมทั้งปี')}</div><div style={{ fontSize: 18, fontWeight: 800 }}>{compact(d.monthly.reduce((a, m) => a + (+m.value || 0), 0))}</div></div>
          </div>
        </Card>
        <Card>
          <Head title={t('ยอดขายตามผู้รับผิดชอบ')} right={<span style={{ color: '#8E8AAB', fontSize: 12 }}>%</span>} />
          {rateErr ? <div style={{ color: '#9A96B6', fontSize: 12.5, marginTop: 8 }}>{t('ยังไม่ได้เชื่อมระบบ rate (ตั้ง RATE_DATABASE_URL)')}</div> :
            <Budget items={sv.map(x => ({ name: x.name || x.fullname || t('ไม่ระบุเซลส์'), v: +x.revenue }))} total={sv.reduce((a, x) => a + (+x.revenue || 0), 0)} />}
        </Card>
        <Card style={{ background: 'linear-gradient(140deg,#7B6BF0,#A88DF7)', color: '#fff', boxShadow: '0 14px 32px rgba(108,92,231,.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' }}>{t('อัตราชนะ (Win rate)')}</h3><span style={{ background: 'rgba(255,255,255,.22)', borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{win.winRate}%</span></div>
          <div style={{ fontSize: 40, fontWeight: 800, margin: '16px 0 2px' }}>{win.winRate}<span style={{ fontSize: 20 }}>%</span></div>
          <div style={{ opacity: .85, fontSize: 12 }}>{win.won} {t('ดีลปิดได้')} · {compact(win.won_value)}</div>
          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: .9, marginBottom: 6 }}><span>{t('ปิดได้')} {win.won}</span><span>{t('เปิดอยู่')} {win.open}</span></div>
            <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: 'rgba(255,255,255,.22)' }}>
              <div style={{ width: (win.won / ((win.won + win.open) || 1) * 100) + '%', background: '#fff', borderRadius: 6 }} />
            </div>
          </div>
        </Card>
      </div>

      {/* agent bars | top product ring */}
      <div className="r2 rowm">
        <Card>
          <Head title={t('ลำดับเอเจ้นท์ตามยอดที่ส่งให้บริษัท')} right={av.length > 10 && <a className="lnk" onClick={() => setModal({ title: t('ลำดับเอเจ้นท์ตามยอดที่ส่งให้บริษัท'), cols: [t('เอเจ้นท์'), t('จำนวนบุ๊กกิ้ง'), t('ยอดรวม')], rows: av.map((x, i) => [(i + 1) + '. ' + (x.name || x.agentid), x.bookings, baht(x.revenue)]) })}>{t('ดูทั้งหมด')} ({av.length}) →</a>} />
          {rateErr ? <div style={{ color: '#9A96B6', fontSize: 12.5, marginTop: 8 }}>{t('ยังไม่ได้เชื่อมระบบ rate (ตั้ง RATE_DATABASE_URL)')}</div> :
            <HBars data={av.slice(0, 10)} label={x => x.name || x.agentid} value={x => +x.revenue} fmt={x => baht(x.revenue)} c1="#6C5CE7" c2="#A99BF5" />}
        </Card>
        <Card>
          <Head title={t('Top 10 Product (เส้นทาง) ตามยอด')} right={pv.length > 4 && <a className="lnk" onClick={() => setModal({ title: t('Top 10 Product (เส้นทาง) ตามยอด'), cols: [t('Product / เส้นทาง'), t('จำนวนบุ๊กกิ้ง'), t('ยอดรวม')], rows: pv.map((x, i) => [(i + 1) + '. ' + (x.name || x.routeid), x.bookings, baht(x.revenue)]) })}>{t('ดูทั้งหมด')} →</a>} />
          {rateErr ? <div style={{ color: '#9A96B6', fontSize: 12.5, marginTop: 8 }}>{t('ยังไม่ได้เชื่อมระบบ rate (ตั้ง RATE_DATABASE_URL)')}</div> :
            <Ring items={pv.map(x => ({ name: x.name || x.routeid, v: +x.revenue }))} fmt={compact} />}
        </Card>
      </div>

      {/* sales-visit bars | activity table */}
      <div className="r2 rowm">
        <Card>
          <Head title={t('ลำดับเซลส์ที่ติดต่อ/เข้าพบเอเจ้นท์เยอะสุด')} right={sales.length > 10 && <a className="lnk" onClick={() => setModal({ title: t('ลำดับเซลส์ที่ติดต่อ/เข้าพบเอเจ้นท์เยอะสุด'), cols: [t('เซลส์'), t('รวม (ครั้ง)'), t('แยกช่องทาง')], rows: sales.map((x, i) => [(i + 1) + '. ' + (x.name || '-'), x.total, methodsStr(x.methods)]) })}>{t('ดูทั้งหมด')} ({sales.length}) →</a>} />
          <div style={{ color: '#8E8AAB', fontSize: 11.5, margin: '2px 0 6px' }}>{t('นับทุกช่องทาง · คลิกแถวเพื่อดูว่าไปเอเจ้นท์ไหนบ้าง')}</div>
          <HBars data={sales.slice(0, 10)} label={x => x.name || '-'} value={x => x.total} fmt={x => x.total + ' ' + t('ครั้ง')} c1="#43C6AC" c2="#8FE0CE" onBar={toggleUser} active={x => openUser === x.uid} />
          {openUser != null && <div style={{ marginTop: 10, padding: 12, background: 'rgba(108,92,231,.05)', borderRadius: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>{t('เอเจ้นท์ที่เข้าพบ')} ({drill.length})</div>
            {drill.length ? drill.map(x => <div key={x.customer_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', borderBottom: '1px solid #F1EFFA' }}><span>{x.name || '-'}</span><span style={{ color: '#8E8AAB' }}>{x.n} {t('ครั้ง')} · {t('ล่าสุด')} {fmtDate(x.last_at)}</span></div>) : <div style={{ color: '#9A96B6' }}>{t('ไม่มีข้อมูลในช่วงนี้')}</div>}
          </div>}
        </Card>
        <Card>
          <Head title={t('งานติดตามตามพนักงาน')} />
          <table><thead><tr><th>{t('พนักงาน')}</th><th>{t('เสร็จ')}</th><th>{t('รอ')}</th><th>{t('เกินกำหนด')}</th></tr></thead><tbody>{d.activityByUser.map((u, i) => <tr key={i}><td>{u.name}</td><td>{u.done}</td><td>{u.pending}</td><td style={{ color: u.overdue ? '#EF5B52' : '' }}>{u.overdue}</td></tr>)}</tbody></table>
        </Card>
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
