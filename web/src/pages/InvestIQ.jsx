// B2B Sales Dashboard (InvestIQ style) — คำนวณสดจาก trip-line ของระบบ rate ผ่าน /api/reports/b2b-dashboard
// ลอจิกตาม dashboard-update/dashboard_implementation.md (windows/classify/bridge/route-shift)
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';

const CSS = `
.iq2{width:100%;color:#1E293B;font-family:"Inter","Noto Sans Thai",system-ui,sans-serif}
.iq2 .hdr{display:flex;align-items:center;gap:12px;margin-bottom:4px}
.iq2 .hdr .bar{width:7px;height:30px;border-radius:4px;background:#FF6138}
.iq2 .hdr h2{font-size:22px;font-weight:800;letter-spacing:-.4px;margin:0;color:#0F172A}
.iq2 .sub{font-size:12px;color:#94A3B8;margin:0 0 16px 19px}
.iq2 .ctl{display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:#fff;border:1px solid #F1F5F9;border-radius:18px;padding:11px 14px;box-shadow:0 1px 2px rgba(15,23,42,.04);margin-bottom:16px}
.iq2 .seg{display:inline-flex;background:#F1F5F9;border-radius:999px;padding:3px;gap:2px}
.iq2 .seg button{font:inherit;border:0;background:none;font-size:12px;font-weight:600;color:#64748B;padding:6px 14px;border-radius:999px;cursor:pointer}
.iq2 .seg button.on{background:#FF6138;color:#fff;box-shadow:0 2px 8px rgba(255,97,56,.35)}
.iq2 select,.iq2 input[type=date],.iq2 input[type=number]{font:inherit;font-size:12.5px;color:#1E293B;background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:7px 10px;width:auto}
.iq2 .thr input{width:54px;text-align:center}
.iq2 .lblx{font-size:12px;color:#94A3B8;font-weight:600}
.iq2 .exp{font:inherit;font-size:12px;font-weight:700;color:#fff;background:#FF6138;border:0;border-radius:999px;padding:8px 15px;cursor:pointer;box-shadow:0 3px 10px rgba(255,97,56,.35)}
.iq2 .exp:hover{filter:brightness(1.05)}
.iq2 .win{font-size:11.5px;color:#94A3B8;margin-left:auto}
.iq2 .win b{color:#475569;font-weight:600}
.iq2 .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:16px}
.iq2 .kcard{background:#fff;border:1px solid #F1F5F9;border-radius:20px;padding:15px 17px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.iq2 .khd{display:flex;align-items:center;justify-content:space-between;margin-bottom:2px}
.iq2 .ktl{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:#0F172A}
.iq2 .kico{display:inline-flex;align-items:center;justify-content:center;width:23px;height:23px;border-radius:99px;color:#fff;font-size:10.5px;font-weight:700;flex:none}
.iq2 .ktf{font-size:10.5px;font-weight:600;color:#94A3B8}
.iq2 .kspark{height:52px;margin:6px 0 2px}
.iq2 .kspark svg{width:100%;height:100%;overflow:visible}
.iq2 .krow{display:flex;align-items:baseline;justify-content:space-between;margin-top:6px}
.iq2 .kval{font-size:22px;font-weight:800;letter-spacing:-.5px;color:#0F172A;font-variant-numeric:tabular-nums}
.iq2 .ksub{font-size:10.5px;font-weight:500;color:#94A3B8;margin-top:2px}
.iq2 .pill{display:inline-flex;align-items:center;gap:2px;font-size:10.5px;font-weight:700;border-radius:999px;padding:2.5px 9px}
.iq2 .p-up{color:#059669;background:#ECFDF5}
.iq2 .p-dn{color:#E11D48;background:#FFF1F2}
.iq2 .p-g{color:#059669;background:#ECFDF5}
.iq2 .p-n{color:#0369A1;background:#EFF6FF}
.iq2 .p-s{color:#64748B;background:#F1F5F9}
.iq2 .p-l{color:#E11D48;background:#FFF1F2}
.iq2 .p-c{color:#B45309;background:#FEF3C7}
.iq2 .tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.iq2 .tabs button{font:inherit;border:1px solid #E2E8F0;background:#fff;font-size:12.5px;font-weight:600;color:#64748B;padding:8px 16px;border-radius:999px;cursor:pointer}
.iq2 .tabs button.on{background:#FF6138;border-color:#FF6138;color:#fff;box-shadow:0 3px 10px rgba(255,97,56,.35)}
.iq2 .card{background:#fff;border:1px solid #F1F5F9;border-radius:20px;box-shadow:0 1px 2px rgba(15,23,42,.04);padding:18px 20px;margin-bottom:16px}
.iq2 .cardhd{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.iq2 .h{font-size:14.5px;font-weight:700;color:#0F172A;margin:0}
.iq2 table{width:100%;border-collapse:collapse;font-size:12.5px}
.iq2 th{text-align:left;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.6px;padding:8px;border-bottom:1px solid #F1F5F9}
.iq2 td{padding:9px 8px;border-bottom:1px solid #F8FAFC;font-variant-numeric:tabular-nums}
.iq2 tr:last-child td{border-bottom:0}
.iq2 td.r,.iq2 th.r{text-align:right}
.iq2 tbody tr:hover{background:#F8FAFC}
.iq2 .lnk{color:#FF6138;cursor:pointer;font-weight:600}
.iq2 .lnk:hover{text-decoration:underline}
.iq2 .lnk2{color:#7C3AED;cursor:pointer;font-weight:600}
.iq2 .lnk3{color:#0369A1;cursor:pointer;font-weight:600}
.iq2 .lnk2:hover,.iq2 .lnk3:hover{text-decoration:underline}
.iq2 .neg{color:#E11D48;font-weight:700}
.iq2 .pos{color:#059669;font-weight:700}
.iq2 .neu{color:#94A3B8}
.iq2 .bridge{display:flex;align-items:stretch;gap:6px;margin-top:8px}
.iq2 .bcol{flex:1;display:flex;flex-direction:column;align-items:center;min-width:0}
.iq2 .bzone{position:relative;height:220px;width:100%;}
.iq2 .bzone i{position:absolute;left:50%;transform:translateX(-50%);width:14px;border-radius:999px;min-height:8px}
.iq2 .blab{font-size:10.5px;font-weight:700;color:#94A3B8;margin-top:8px;text-align:center;white-space:nowrap}
.iq2 .bval{font-size:11px;font-weight:700;color:#334155;font-variant-numeric:tabular-nums}
.iq2 .gline{border-top:1px dashed #E2E8F0;position:absolute;left:0;right:0}
.iq2 .sumline{font-size:12px;color:#64748B;margin-top:14px;font-weight:600}
.iq2 .gsl{display:flex;height:8px;border-radius:5px;overflow:hidden;background:#F1F5F9;min-width:110px;max-width:190px}
.iq2 .gsl i{display:block;height:100%}
.iq2 .gsl .sg{background:#00D084}.iq2 .gsl .ss{background:#CBD5E1}.iq2 .gsl .sl{background:#F43F5E}
.iq2 .gsllbl{font-size:10.5px;color:#94A3B8;margin-top:4px;white-space:nowrap}
.iq2 .chips{display:inline-flex;gap:6px;flex-wrap:wrap}
.iq2 .chips button{font:inherit;border:1px solid #E2E8F0;background:#fff;font-size:12px;font-weight:600;color:#64748B;padding:7px 14px;border-radius:999px;cursor:pointer}
.iq2 .chips button.on{background:#FF6138;border-color:#FF6138;color:#fff}
.iq2 .chips button span{opacity:.65;font-weight:500}
.iq2 .back{font-size:12.5px;color:#FF6138;cursor:pointer;display:inline-flex;gap:5px;margin-bottom:12px;font-weight:700}
.iq2 .back:hover{text-decoration:underline}
.iq2 .minis{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
.iq2 .mini{flex:1;min-width:130px;background:#F8FAFC;border-radius:14px;padding:11px 13px}
.iq2 .mini .k{font-size:10.5px;color:#94A3B8;font-weight:600}
.iq2 .mini .v{font-size:17px;font-weight:800;margin-top:2px;color:#0F172A;font-variant-numeric:tabular-nums}
.iq2 .mini .d{font-size:11px;font-weight:700;margin-top:1px}
.iq2 .mchart{display:flex;align-items:flex-end;gap:6px;height:190px;margin-top:12px;padding-bottom:4px}
.iq2 .mcol{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0}
.iq2 .mstack{width:70%;max-width:26px;display:flex;flex-direction:column-reverse;border-radius:6px;overflow:hidden}
.iq2 .mcol span{font-size:9.5px;font-weight:700;color:#94A3B8;margin-top:6px;white-space:nowrap}
.iq2 .legend{display:flex;flex-wrap:wrap;gap:10px;font-size:11px;color:#475569;margin-top:8px}
.iq2 .legend i{width:9px;height:9px;border-radius:3px;display:inline-block;margin-right:4px}
.iq2 .note{font-size:11.5px;color:#94A3B8;margin-top:10px;line-height:1.7}
.iq2 .shd{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.iq2 .shd h3{font-size:18px;font-weight:800;margin:0;color:#0F172A}
.iq2 .role{font-size:12px;color:#94A3B8}
.iq2 .loading{padding:60px;text-align:center;color:#94A3B8;font-size:13px}
@media(max-width:760px){.iq2 .win{margin-left:0;width:100%}.iq2 .bridge{overflow-x:auto}}
`;

const OWNER_COLORS = ['#FF6138', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#F43F5E', '#EAB308', '#64748B', '#EF4444'];
const ROLE = { Sopit: 'Director of Sales', SOPIT: 'Director of Sales', House: 'walk-in / no owner' };
const MODES = [
  ['week', 'Week (WoW)'], ['month', 'Month (MoM)'], ['yoyweek', 'Same week LY'],
  ['yoymonth', 'Same month LY'], ['roll12', 'Rolling 12M'],
];
const TF_LABEL = { week: 'Last 7 days', month: 'Last 30 days', yoyweek: 'Last 7 days', yoymonth: 'This month', roll12: 'Last 12 months' };
const EN_M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const D = (s) => (s ? new Date(s + 'T00:00:00') : null);
const shift = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const iso = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
const fmtDt = (d) => d.getDate() + ' ' + EN_M[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2);
const fmtC = (v) => { v = Math.round(v); const a = Math.abs(v); if (a >= 1e6) return '฿' + (v / 1e6).toFixed(2) + 'M'; if (a >= 1e5) return '฿' + Math.round(v / 1e3) + 'K'; return '฿' + v.toLocaleString(); };
const fmtF = (v) => '฿' + Math.round(v).toLocaleString();
const pct = (c, p) => (!p ? null : ((c - p) / p) * 100);
const dstr = (p) => (p === null ? '—' : (p >= 0 ? '+' : '−') + Math.abs(p).toFixed(0) + '%');
const dcls = (p) => (p === null ? 'neu' : p >= 0 ? 'pos' : 'neg');
const classOf = (c, p, T) => { if (p <= 0 && c > 0) return 'new'; if (c <= 0 && p > 0) return 'churn'; const g = pct(c, p); if (g === null) return 'stable'; if (g > T) return 'growth'; if (g < -T) return 'loss'; return 'stable'; };
const BADGE = { growth: ['p-g', 'Growth'], new: ['p-n', 'New'], loss: ['p-l', 'Loss'], churn: ['p-c', 'Churned'], stable: ['p-s', 'Stable'] };

function windows(mode, refStr) {
  const ref = D(refStr); let cs, ce, ps, pe;
  if (mode === 'yoymonth') {
    cs = new Date(ref.getFullYear(), ref.getMonth(), 1); ce = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    ps = new Date(ref.getFullYear() - 1, ref.getMonth(), 1); pe = new Date(ref.getFullYear() - 1, ref.getMonth() + 1, 0);
    return { cs, ce, ps, pe };
  }
  const len = mode === 'week' || mode === 'yoyweek' ? 7 : mode === 'roll12' ? 365 : 30;
  ce = ref; cs = shift(ref, -(len - 1));
  if (mode === 'yoyweek') { ps = shift(cs, -364); pe = shift(ce, -364); }
  else { pe = shift(cs, -1); ps = shift(pe, -(len - 1)); }
  return { cs, ce, ps, pe };
}

function sparkPath(series, w = 200, h = 44) {
  if (!series.length) return '';
  const max = Math.max(...series, 1);
  const pts = series.map((v, i) => [series.length === 1 ? w : (i / (series.length - 1)) * w, h - 4 - (v / max) * (h - 10)]);
  let d = 'M ' + pts[0][0] + ' ' + pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1][0] + pts[i][0]) / 2;
    d += ` Q ${pts[i - 1][0]} ${pts[i - 1][1]} ${mx} ${(pts[i - 1][1] + pts[i][1]) / 2}`;
  }
  d += ` L ${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`;
  return d;
}

export default function InvestIQ() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [basis, setBasis] = useState('bd');
  const [mode, setMode] = useState('month');
  const [ref, setRef] = useState(iso(new Date()));
  const [thr, setThr] = useState(10);
  const [screen, setScreen] = useState({ kind: 'tab', tab: 'ov' });
  const [stack, setStack] = useState([]);
  const [trip, setTrip] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    api('/reports/b2b-dashboard')
      .then((d) => setRows(d.rows.map((r) => { const o = {}; d.cols.forEach((c, i) => { o[c] = r[i]; }); return o; })))
      .catch((e) => setErr(e.message));
  }, []);

  const go = (s) => { setStack((st) => [...st, screen]); setScreen(s); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const back = () => { setStack((st) => { if (!st.length) return st; setScreen(st[st.length - 1]); return st.slice(0, -1); }); };
  const setTab = (t) => { setStack([]); setScreen({ kind: 'tab', tab: t }); };

  const M = useMemo(() => {
    if (!rows) return null;
    const w = windows(mode, ref);
    const inW = (r, a, b) => { const s = r[basis]; if (!s) return false; const d = D(s); return d >= a && d <= b; };
    const cur = {}, prev = {}, meta = {};
    for (const r of rows) {
      const k = r.agid;
      if (!meta[k]) meta[k] = { k, ag: r.ag, code: r.code, own: r.own, mkt: r.mkt };
      if (inW(r, w.cs, w.ce)) cur[k] = (cur[k] || 0) + r.rev;
      if (inW(r, w.ps, w.pe)) prev[k] = (prev[k] || 0) + r.rev;
    }
    const cls = [...new Set([...Object.keys(cur), ...Object.keys(prev)])].map((k) => {
      const c = cur[k] || 0, p = prev[k] || 0;
      return { ...meta[k], cur: c, prev: p, d: c - p, g: pct(c, p), cls: classOf(c, p, thr) };
    });
    const curTot = cls.reduce((s, r) => s + r.cur, 0), prevTot = cls.reduce((s, r) => s + r.prev, 0);
    const curLines = rows.filter((r) => inW(r, w.cs, w.ce)), prevLines = rows.filter((r) => inW(r, w.ps, w.pe));
    const curPax = curLines.reduce((s, r) => s + r.pax, 0), prevPax = prevLines.reduce((s, r) => s + r.pax, 0);
    const nA = cls.filter((r) => r.cur > 0).length, nP = cls.filter((r) => r.prev > 0).length;
    // อนุกรมรายวันในช่วงปัจจุบัน สำหรับ sparkline (rev / agents สะสม / pax)
    const days = Math.min(120, Math.round((w.ce - w.cs) / 864e5) + 1);
    const revD = Array(days).fill(0), paxD = Array(days).fill(0), agD = Array(days).fill(0);
    const seen = new Set(); const byDay = {};
    for (const r of curLines) { const i = Math.round((D(r[basis]) - w.cs) / 864e5); if (i >= 0 && i < days) { revD[i] += r.rev; paxD[i] += r.pax; (byDay[i] = byDay[i] || []).push(r.agid); } }
    for (let i = 0; i < days; i++) { (byDay[i] || []).forEach((a) => seen.add(a)); agD[i] = seen.size; }
    const counts = {
      grow: cls.filter((r) => r.cls === 'growth' || r.cls === 'new').length,
      loss: cls.filter((r) => r.cls === 'loss' || r.cls === 'churn').length,
      stab: cls.filter((r) => r.cls === 'stable').length,
    };
    return { w, inW, cls, curTot, prevTot, curPax, prevPax, nA, nP, revD, paxD, agD, counts };
  }, [rows, basis, mode, ref, thr]);

  const monthly = (pred) => {
    const mm = {};
    for (const r of rows) {
      const s = r[basis]; if (!s || (pred && !pred(r))) continue;
      const k = s.slice(0, 7); if (!/^\d{4}-\d{2}$/.test(k)) continue;
      (mm[k] = mm[k] || { rev: 0, byOwner: {} }).rev += r.rev;
      mm[k].byOwner[r.own] = (mm[k].byOwner[r.own] || 0) + r.rev;
    }
    return mm;
  };
  const mlab = (k) => { const [y, m] = k.split('-'); return EN_M[+m - 1] + ' ' + String(+y).slice(2); };

  const exportCSV = () => {
    const tables = rootRef.current ? rootRef.current.querySelectorAll('table') : [];
    if (!tables.length) { alert('No table on this screen to export'); return; }
    let csv = '﻿';
    tables.forEach((t, ti) => {
      if (ti) csv += '\n';
      t.querySelectorAll('tr').forEach((tr) => {
        csv += [...tr.children].map((td) => { let v = td.textContent.replace(/\s+/g, ' ').trim(); if (/[",\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"'; return v; }).join(',') + '\n';
      });
    });
    const tag = screen.kind === 'tab' ? screen.tab : screen.kind + '_' + screen.id;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = ('LA_B2B_' + tag + '_' + ref + '.csv').replace(/[^\w.\-]/g, '_');
    a.click(); URL.revokeObjectURL(a.href);
  };

  const Badge = ({ cls }) => <span className={'pill ' + BADGE[cls][0]}>{BADGE[cls][1]}</span>;
  const Dcell = ({ r }) => r.cls === 'churn' ? <span className="neg">churned</span> : r.cls === 'new' ? <span className="pos">new</span> : <span className={dcls(r.g)}>{dstr(r.g)}</span>;
  const AgLink = ({ r }) => <span className="lnk" onClick={() => go({ kind: 'agent', id: r.k })}>{r.ag}</span>;
  const OwnLink = ({ o }) => <span className="lnk2" onClick={() => go({ kind: 'staff', id: o })}>{o}</span>;
  const MktLink = ({ m }) => <span className="lnk3" onClick={() => go({ kind: 'market', id: m })}>{m}</span>;
  const Gsl = ({ c }) => { const t = c.g + c.s + c.l || 1; return (
    <div>
      <div className="gsl"><i className="sg" style={{ width: (c.g / t) * 100 + '%' }} /><i className="ss" style={{ width: (c.s / t) * 100 + '%' }} /><i className="sl" style={{ width: (c.l / t) * 100 + '%' }} /></div>
      <div className="gsllbl"><b style={{ color: '#059669' }}>{c.g}</b> grow · <b style={{ color: '#64748B' }}>{c.s}</b> stable · <b style={{ color: '#E11D48' }}>{c.l}</b> down</div>
    </div>); };
  const cnt = (sub) => ({ g: sub.filter((r) => r.cls === 'growth' || r.cls === 'new').length, s: sub.filter((r) => r.cls === 'stable').length, l: sub.filter((r) => r.cls === 'loss' || r.cls === 'churn').length });
  const MiniChart = ({ pred }) => {
    const mm = monthly(pred); const months = Object.keys(mm).sort(); const max = Math.max(...months.map((m) => mm[m].rev), 1);
    return (
      <div className="mchart" style={{ height: 150 }}>
        {months.map((m) => (
          <div className="mcol" key={m}>
            <div style={{ width: '70%', maxWidth: 24, height: (mm[m].rev / max) * 130 + 4, background: '#FF6138', borderRadius: 6 }} title={fmtF(mm[m].rev)} />
            <span>{mlab(m)}</span>
          </div>
        ))}
      </div>); };

  if (err) return <div className="iq2"><style>{CSS}</style><div className="card"><div className="note">โหลดข้อมูลจากระบบ rate ไม่ได้: {err}</div></div></div>;
  if (!rows || !M) return <div className="iq2"><style>{CSS}</style><div className="loading">Loading live data from rate system…</div></div>;

  const { w, cls, curTot, prevTot, curPax, prevPax, nA, nP } = M;
  const avg = nA ? curTot / nA : 0, avgP = nP ? prevTot / nP : 0, dn = nA - nP;
  const avgD = M.revD.map((v, i) => (M.agD[i] ? v / M.agD[i] : 0));
  const KPI = [
    { t: 'B2B revenue', l: 'R', bg: '#FF6138', v: fmtC(curTot), d: pct(curTot, prevTot), sub: 'vs ' + fmtC(prevTot) + ' last period', s: M.revD },
    { t: 'Active agents', l: 'A', bg: '#3B82F6', v: String(nA), d: nP ? (dn / nP) * 100 : null, dTxt: (dn >= 0 ? '+' : '−') + Math.abs(dn), sub: 'vs ' + nP + ' last period', s: M.agD },
    { t: 'Pax', l: 'P', bg: '#F59E0B', v: curPax.toLocaleString(), d: pct(curPax, prevPax), sub: 'vs ' + prevPax.toLocaleString() + ' last period', s: M.paxD },
    { t: 'Avg / agent', l: 'B', bg: '#8B5CF6', v: fmtC(avg), d: pct(avg, avgP), sub: 'vs ' + fmtC(avgP) + ' last period', s: avgD },
  ];
  const warn = cls.every((r) => r.prev === 0) ? <div className="note">⚠ ไม่มีข้อมูลในช่วงเทียบ (ประวัติเริ่ม ธ.ค. 2025) — YoY จะสมบูรณ์เมื่อสะสมครบปี</div> : null;

  // ---------- tab bodies ----------
  const body = (() => {
    if (screen.kind === 'agent') return <AgentDetail id={screen.id} />;
    if (screen.kind === 'staff') return <StaffDetail id={screen.id} />;
    if (screen.kind === 'market') return <MarketDetail id={screen.id} />;
    const t = screen.tab;
    if (t === 'ov') return <Overview />;
    if (t === 'staff') return <ByStaff />;
    if (t === 'trip') return <ByTrip />;
    if (t === 'mkt') return <ByMarket />;
    const map = { grow: [['growth', 'new'], 'Growth', 'push further — allotment / rate incentives'], loss: [['loss', 'churn'], 'Loss', 'win-back / find cause — compare product & competitor rates'], stab: [['stable'], 'Stable', 'maintain service · look for upsell'] };
    const [which, title, action] = map[t];
    return <ClsList which={which} title={title} action={action} />;
  })();

  function Overview() {
    const gr = cls.filter((r) => r.cls === 'growth'), nw = cls.filter((r) => r.cls === 'new'), st = cls.filter((r) => r.cls === 'stable'), ls = cls.filter((r) => r.cls === 'loss'), ch = cls.filter((r) => r.cls === 'churn');
    const S = (a, f) => a.reduce((s, r) => s + f(r), 0);
    const gD = S(gr, (r) => r.d), nD = S(nw, (r) => r.cur), sD = S(st, (r) => r.d), lD = S(ls, (r) => r.prev - r.cur), cD = S(ch, (r) => r.prev);
    const P = prevTot;
    const seq = [
      ['Prev', 0, P, '#CBD5E1', fmtC(P)],
      ['+Growth', P, P + gD, '#FF6138', fmtC(gD)],
      ['+New', P + gD, P + gD + nD, '#FF6138', fmtC(nD)],
      ['±Stable', P + gD + nD + Math.min(sD, 0), P + gD + nD + Math.max(sD, 0), '#94A3B8', fmtC(sD)],
      ['−Loss', P + gD + nD + sD - lD, P + gD + nD + sD, '#1E293B', '−' + fmtC(lD)],
      ['−Churn', P + gD + nD + sD - lD - cD, P + gD + nD + sD - lD, '#1E293B', '−' + fmtC(cD)],
      ['Now', 0, curTot, '#475569', fmtC(curTot)],
    ];
    const max = Math.max(...seq.map((s) => Math.max(s[1], s[2])), 1);
    const watch = [...ls, ...ch].sort((a, b) => (b.prev - b.cur) - (a.prev - a.cur)).slice(0, 10);
    return (<>
      <div className="card">
        <div className="h">Revenue bridge — who drove the change</div>
        <div className="bridge">
          {seq.map((s) => {
            const bot = (Math.min(s[1], s[2]) / max) * 210, ht = Math.max((Math.abs(s[2] - s[1]) / max) * 210, 8);
            return (
              <div className="bcol" key={s[0]}>
                <div className="bzone">
                  {[0.25, 0.5, 0.75].map((f) => <div className="gline" key={f} style={{ top: 220 * f }} />)}
                  <i style={{ bottom: bot, height: ht, background: s[3] }} />
                </div>
                <div className="blab">{s[0]}<br /><span className="bval">{s[4]}</span></div>
              </div>);
          })}
        </div>
        <div className="sumline">Gained <span className="pos">{fmtC(gD + nD)}</span> · Lost <span className="neg">−{fmtC(lD + cD)}</span> · Net <span className={curTot - P >= 0 ? 'pos' : 'neg'}>{(curTot - P >= 0 ? '' : '−') + fmtC(Math.abs(curTot - P))}</span></div>
        {warn}
      </div>
      <div className="card">
        <div className="h">Watchlist — top 10 agents by revenue lost</div>
        <table><thead><tr><th>Agent</th><th>Sales</th><th>Market</th><th className="r">Prev</th><th className="r">Current</th><th className="r">Lost</th><th className="r">Δ</th><th>Class</th></tr></thead>
          <tbody>{watch.map((r) => (
            <tr key={r.k}><td><AgLink r={r} /></td><td><OwnLink o={r.own} /></td><td><MktLink m={r.mkt} /></td>
              <td className="r">{fmtF(r.prev)}</td><td className="r">{fmtF(r.cur)}</td>
              <td className="r neg">−{Math.round(r.prev - r.cur).toLocaleString()}</td>
              <td className="r"><Dcell r={r} /></td><td><Badge cls={r.cls} /></td></tr>))}
          </tbody></table>
        {!watch.length && <div className="note">No agents losing revenue in this window 🎉</div>}
      </div>
    </>);
  }

  function ByStaff() {
    const totByOwn = {}; rows.forEach((r) => { totByOwn[r.own] = (totByOwn[r.own] || 0) + r.rev; });
    const owners = Object.keys(totByOwn).sort((a, b) => totByOwn[b] - totByOwn[a]);
    const oc = {}; owners.forEach((o, i) => { oc[o] = OWNER_COLORS[i % OWNER_COLORS.length]; });
    const list = owners.map((o) => { const sub = cls.filter((r) => r.own === o); return { o, cur: sub.reduce((s, r) => s + r.cur, 0), prev: sub.reduce((s, r) => s + r.prev, 0), na: sub.filter((r) => r.cur > 0).length, c: cnt(sub) }; }).sort((a, b) => b.cur - a.cur);
    const mm = monthly(); const months = Object.keys(mm).sort(); const max = Math.max(...months.map((m) => mm[m].rev), 1);
    return (<>
      <div className="card">
        <div className="h">Monthly performance ({basis === 'bd' ? 'booking date' : 'travel date'})</div>
        <div className="mchart">
          {months.map((m) => (
            <div className="mcol" key={m}>
              <div className="mstack" style={{ height: (mm[m].rev / max) * 165 + 3 }}>
                {owners.map((o) => { const v = mm[m].byOwner[o] || 0; return v ? <div key={o} style={{ height: (v / mm[m].rev) * 100 + '%', background: oc[o] }} title={o + ': ' + fmtF(v)} /> : null; })}
              </div>
              <span>{mlab(m)}</span>
            </div>))}
        </div>
        <div className="legend">{owners.map((o) => <span key={o}><i style={{ background: oc[o] }} />{o}</span>)}</div>
      </div>
      <div className="card">
        <div className="h">By sales owner (click a name for detail)</div>
        <table><thead><tr><th>Owner</th><th className="r">Agents</th><th className="r">Rev</th><th className="r">Δ</th><th>G / S / L</th></tr></thead>
          <tbody>{list.map((r) => (
            <tr key={r.o}><td><OwnLink o={r.o} /></td><td className="r">{r.na}</td><td className="r">{fmtF(r.cur)}</td>
              <td className={'r ' + dcls(pct(r.cur, r.prev))}>{dstr(pct(r.cur, r.prev))}</td><td><Gsl c={r.c} /></td></tr>))}
          </tbody></table>
        <div className="note">G/S/L bar: green = growing · grey = stable · red = declining (threshold ±{thr}%)</div>
        {warn}
      </div>
    </>);
  }

  function ByTrip() {
    const fam = {}, famTot = {}, agAll = {};
    for (const r of rows) {
      const iC = M.inW(r, w.cs, w.ce), iP = M.inW(r, w.ps, w.pe); if (!iC && !iP) continue;
      if (!agAll[r.agid]) agAll[r.agid] = { cur: 0, prev: 0 };
      if (iC) agAll[r.agid].cur += r.rev; if (iP) agAll[r.agid].prev += r.rev;
      const f = r.fam; fam[f] = fam[f] || {}; famTot[f] = famTot[f] || { cur: 0, prev: 0, pax: 0 };
      const a = fam[f][r.agid] = fam[f][r.agid] || { k: r.agid, ag: r.ag, code: r.code, own: r.own, mkt: r.mkt, cur: 0, prev: 0 };
      if (iC) { a.cur += r.rev; famTot[f].cur += r.rev; famTot[f].pax += r.pax; }
      if (iP) { a.prev += r.rev; famTot[f].prev += r.rev; }
    }
    const order = ['Phi Phi', 'Similan', 'Surin', 'Krabi', 'อื่นๆ'];
    const fams = order.filter((f) => famTot[f] && (famTot[f].cur || famTot[f].prev));
    if (!fams.length) return <div className="card"><div className="note">No trips in this window</div></div>;
    const F = trip && fams.includes(trip) ? trip : fams[0];
    const ft = famTot[F];
    const list = Object.values(fam[F]).map((a) => { const aa = agAll[a.k] || { cur: 0, prev: 0 }; return { ...a, cls: classOf(a.cur, a.prev, thr), g: pct(a.cur, a.prev), og: pct(aa.cur, aa.prev) }; }).sort((x, y) => y.cur - x.cur || y.prev - x.prev);
    const sig = (r) => {
      if (r.cls === 'loss' || r.cls === 'churn') return r.og !== null && r.og > -thr ? <span className="pill p-c">↘ this route · moved elsewhere</span> : <span className="pill p-l">↘ whole portfolio down</span>;
      if (r.cls === 'growth' && r.og !== null && r.og <= thr) return <span className="pill p-n">↗ shifting into this route</span>;
      return null;
    };
    return (<>
      <div style={{ marginBottom: 14 }}>
        <span className="lblx" style={{ marginRight: 8 }}>Trip</span>
        <span className="chips">{fams.map((f) => <button key={f} className={f === F ? 'on' : ''} onClick={() => setTrip(f)}>{f} <span>{fmtC(famTot[f].cur)}</span></button>)}</span>
      </div>
      <div className="card">
        <div className="shd"><h3>{F}</h3><span className="role">{fmtC(ft.cur)} · {dstr(pct(ft.cur, ft.prev))} · {list.filter((r) => r.cur > 0).length} agents · {ft.pax.toLocaleString()} pax</span></div>
        <div style={{ marginTop: 8 }}><Gsl c={cnt(list)} /></div>
      </div>
      <div className="card">
        <div className="h">All agents on this route ({list.length}) — ranked by revenue</div>
        <table><thead><tr><th>#</th><th>Agent</th><th>Sales</th><th>Market</th><th className="r">Rev</th><th className="r">Δ route</th><th>Class</th><th>Signal</th></tr></thead>
          <tbody>{list.map((r, i) => (
            <tr key={r.k}><td style={{ color: '#94A3B8' }}>{i + 1}</td><td><AgLink r={r} /></td><td><OwnLink o={r.own} /></td><td><MktLink m={r.mkt} /></td>
              <td className="r">{fmtF(r.cur)}</td><td className="r"><Dcell r={r} /></td><td><Badge cls={r.cls} /></td><td>{sig(r)}</td></tr>))}
          </tbody></table>
        <div className="note">Class + Δ are <b>route-specific</b>. Signal compares to whole portfolio: amber = moved to another route · red = genuinely declining · blue = pulling volume into this route.</div>
        {warn}
      </div>
    </>);
  }

  function ByMarket() {
    const groups = {}; cls.forEach((r) => { const g = r.mkt || '—'; (groups[g] = groups[g] || []).push(r); });
    const list = Object.entries(groups).map(([g, sub]) => [g, sub.filter((r) => r.cur > 0).length, sub.reduce((s, r) => s + r.cur, 0), sub.reduce((s, r) => s + r.prev, 0)]).sort((a, b) => b[2] - a[2]);
    return (
      <div className="card">
        <div className="h">Markets (click a name for detail)</div>
        <table><thead><tr><th>Market</th><th className="r">Agents</th><th className="r">Rev</th><th className="r">Δ</th><th className="r">% total</th></tr></thead>
          <tbody>{list.map((r) => (
            <tr key={r[0]}><td><MktLink m={r[0]} /></td><td className="r">{r[1]}</td><td className="r">{fmtF(r[2])}</td>
              <td className={'r ' + dcls(pct(r[2], r[3]))}>{dstr(pct(r[2], r[3]))}</td><td className="r">{(curTot ? (r[2] / curTot) * 100 : 0).toFixed(0)}%</td></tr>))}
          </tbody></table>
        {warn}
      </div>);
  }

  function ClsList({ which, title, action }) {
    const list = cls.filter((r) => which.includes(r.cls)).sort((a, b) => b.cur - a.cur || b.prev - a.prev);
    const delta = list.reduce((s, r) => s + (r.cls === 'loss' || r.cls === 'churn' ? r.prev - r.cur : r.cls === 'new' ? r.cur : r.d), 0);
    const lbl = title === 'Loss' ? '−' + fmtC(delta) : title === 'Growth' ? '+' + fmtC(delta) : '±' + fmtC(Math.abs(delta));
    return (
      <div className="card">
        <div className="h">{title} · {list.length} agents · {lbl}</div>
        <table><thead><tr><th>Agent</th><th>Sales</th><th>Market</th><th className="r">Rev</th><th className="r">Δ</th><th>Class</th></tr></thead>
          <tbody>{list.map((r) => (
            <tr key={r.k}><td><AgLink r={r} /></td><td><OwnLink o={r.own} /></td><td><MktLink m={r.mkt} /></td>
              <td className="r">{fmtF(r.cur)}</td><td className="r"><Dcell r={r} /></td><td><Badge cls={r.cls} /></td></tr>))}
          </tbody></table>
        <div className="note">Action: {action}</div>
        {warn}
      </div>);
  }

  function AgentDetail({ id }) {
    const all = rows.filter((r) => r.agid === id);
    if (!all.length) return <div className="card"><div className="note">Agent not found</div></div>;
    const name = all[0].ag, code = all[0].code, own = all[0].own, mkt = all[0].mkt;
    const curL = all.filter((r) => M.inW(r, w.cs, w.ce)), prevL = all.filter((r) => M.inW(r, w.ps, w.pe));
    const cRev = curL.reduce((s, r) => s + r.rev, 0), pRev = prevL.reduce((s, r) => s + r.rev, 0);
    const cPax = curL.reduce((s, r) => s + r.pax, 0), cclass = classOf(cRev, pRev, thr);
    const fm = {};
    curL.forEach((r) => { (fm[r.fam] = fm[r.fam] || { cur: 0, prev: 0, pax: 0, n: 0 }); fm[r.fam].cur += r.rev; fm[r.fam].pax += r.pax; fm[r.fam].n++; });
    prevL.forEach((r) => { (fm[r.fam] = fm[r.fam] || { cur: 0, prev: 0, pax: 0, n: 0 }).prev += r.rev; });
    const famRows = Object.entries(fm).sort((a, b) => b[1].cur - a[1].cur);
    const recent = curL.slice().sort((a, b) => String(b[basis] || '').localeCompare(String(a[basis] || ''))).slice(0, 30);
    return (<>
      <div className="back" onClick={back}>‹ Back</div>
      <div className="card">
        <div className="shd"><h3>{name}</h3><Badge cls={cclass} /><span className="role">code {code} · sales <OwnLink o={own} /> · market <MktLink m={mkt} /></span></div>
        <div className="minis">
          <div className="mini"><div className="k">Revenue</div><div className="v">{fmtC(cRev)}</div><div className={'d ' + dcls(pct(cRev, pRev))}>{dstr(pct(cRev, pRev))}</div></div>
          <div className="mini"><div className="k">Pax</div><div className="v">{cPax.toLocaleString()}</div></div>
          <div className="mini"><div className="k">Bookings</div><div className="v">{curL.length}</div></div>
          <div className="mini"><div className="k">Routes sent</div><div className="v">{Object.keys(fm).length}</div></div>
        </div>
      </div>
      <div className="card"><div className="h">Monthly revenue ({basis === 'bd' ? 'booking date' : 'travel date'})</div><MiniChart pred={(r) => r.agid === id} /></div>
      <div className="card">
        <div className="h">Routes they send (in selected window)</div>
        <table><thead><tr><th>Trip</th><th className="r">Bookings</th><th className="r">Pax</th><th className="r">Rev</th><th className="r">Δ</th><th>Class</th></tr></thead>
          <tbody>{famRows.map(([f, v]) => { const cc = classOf(v.cur, v.prev, thr); return (
            <tr key={f}><td>{f}</td><td className="r">{v.n}</td><td className="r">{v.pax.toLocaleString()}</td><td className="r">{fmtF(v.cur)}</td>
              <td className="r"><Dcell r={{ cls: cc, g: pct(v.cur, v.prev) }} /></td><td><Badge cls={cc} /></td></tr>); })}
          </tbody></table>
      </div>
      <div className="card">
        <div className="h">Recent bookings ({recent.length})</div>
        <table><thead><tr><th>Booked</th><th>Travel</th><th>Trip</th><th className="r">Pax</th><th className="r">฿</th></tr></thead>
          <tbody>{recent.map((r, i) => <tr key={i}><td>{r.bd || '—'}</td><td>{r.td || '—'}</td><td>{r.fam}</td><td className="r">{r.pax}</td><td className="r">{fmtF(r.rev)}</td></tr>)}</tbody></table>
        {!recent.length && <div className="note">No bookings in the selected window</div>}
      </div>
    </>);
  }

  function StaffDetail({ id }) {
    const sub = cls.filter((r) => r.own === id);
    const cur = sub.reduce((s, r) => s + r.cur, 0), prev = sub.reduce((s, r) => s + r.prev, 0);
    const paxCur = rows.filter((r) => r.own === id && M.inW(r, w.cs, w.ce)).reduce((s, r) => s + r.pax, 0);
    const na = sub.filter((r) => r.cur > 0).length, share = curTot ? (cur / curTot) * 100 : 0;
    const ags = sub.slice().sort((a, b) => b.cur - a.cur || b.prev - a.prev);
    return (<>
      <div className="back" onClick={back}>‹ Back</div>
      <div className="card">
        <div className="shd"><h3>{id}</h3><span className="role">{ROLE[id] || 'Sales Executive'}</span></div>
        <div className="minis">
          <div className="mini"><div className="k">Revenue</div><div className="v">{fmtC(cur)}</div><div className={'d ' + dcls(pct(cur, prev))}>{dstr(pct(cur, prev))}</div></div>
          <div className="mini"><div className="k">Active agents</div><div className="v">{na}</div></div>
          <div className="mini"><div className="k">Pax</div><div className="v">{paxCur.toLocaleString()}</div></div>
          <div className="mini"><div className="k">Share of team</div><div className="v">{share.toFixed(0)}%</div></div>
        </div>
        <div style={{ marginTop: 10 }}><Gsl c={cnt(sub)} /></div>
      </div>
      <div className="card"><div className="h">Monthly revenue</div><MiniChart pred={(r) => r.own === id} /></div>
      <div className="card">
        <div className="h">Agents in portfolio ({ags.length})</div>
        <table><thead><tr><th>Agent</th><th>Market</th><th className="r">Rev</th><th className="r">Δ</th><th>Class</th></tr></thead>
          <tbody>{ags.map((r) => (
            <tr key={r.k}><td><AgLink r={r} /></td><td><MktLink m={r.mkt} /></td><td className="r">{fmtF(r.cur)}</td>
              <td className="r"><Dcell r={r} /></td><td><Badge cls={r.cls} /></td></tr>))}
          </tbody></table>
        {warn}
      </div>
    </>);
  }

  function MarketDetail({ id }) {
    const sub = cls.filter((r) => r.mkt === id);
    const cur = sub.reduce((s, r) => s + r.cur, 0), prev = sub.reduce((s, r) => s + r.prev, 0);
    const paxCur = rows.filter((r) => r.mkt === id && M.inW(r, w.cs, w.ce)).reduce((s, r) => s + r.pax, 0);
    const na = sub.filter((r) => r.cur > 0).length, share = curTot ? (cur / curTot) * 100 : 0;
    const ags = sub.slice().sort((a, b) => b.cur - a.cur || b.prev - a.prev);
    return (<>
      <div className="back" onClick={back}>‹ Back</div>
      <div className="card">
        <div className="shd"><h3>{id}</h3><span className="role">market</span></div>
        <div className="minis">
          <div className="mini"><div className="k">Revenue</div><div className="v">{fmtC(cur)}</div><div className={'d ' + dcls(pct(cur, prev))}>{dstr(pct(cur, prev))}</div></div>
          <div className="mini"><div className="k">Active agents</div><div className="v">{na}</div></div>
          <div className="mini"><div className="k">Pax</div><div className="v">{paxCur.toLocaleString()}</div></div>
          <div className="mini"><div className="k">Share of total</div><div className="v">{share.toFixed(0)}%</div></div>
        </div>
        <div style={{ marginTop: 10 }}><Gsl c={cnt(sub)} /></div>
      </div>
      <div className="card"><div className="h">Monthly revenue</div><MiniChart pred={(r) => r.mkt === id} /></div>
      <div className="card">
        <div className="h">Agents in this market ({ags.length})</div>
        <table><thead><tr><th>#</th><th>Agent</th><th>Sales</th><th className="r">Rev</th><th className="r">Δ</th><th>Class</th></tr></thead>
          <tbody>{ags.map((r, i) => (
            <tr key={r.k}><td style={{ color: '#94A3B8' }}>{i + 1}</td><td><AgLink r={r} /></td><td><OwnLink o={r.own} /></td>
              <td className="r">{fmtF(r.cur)}</td><td className="r"><Dcell r={r} /></td><td><Badge cls={r.cls} /></td></tr>))}
          </tbody></table>
        {warn}
      </div>
    </>);
  }

  return (
    <div className="iq2" ref={rootRef}>
      <style>{CSS}</style>
      <div className="hdr"><div className="bar" /><h2>B2B Sales Dashboard</h2></div>
      <p className="sub">computed live from system bookings · confirmed only</p>

      <div className="ctl">
        <span className="seg">
          <button className={basis === 'bd' ? 'on' : ''} onClick={() => setBasis('bd')}>Booking date</button>
          <button className={basis === 'td' ? 'on' : ''} onClick={() => setBasis('td')}>Travel date</button>
        </span>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>{MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <input type="date" value={ref} onChange={(e) => setRef(e.target.value)} />
        <span className="thr"><span className="lblx">Threshold ± </span><input type="number" min="1" max="50" value={thr} onChange={(e) => { let v = +e.target.value; if (isNaN(v) || v < 1) v = 1; if (v > 50) v = 50; setThr(v); }} /> <span className="lblx">%</span></span>
        <button className="exp" onClick={exportCSV}>⬇ Export CSV</button>
        <span className="win">Period <b>{fmtDt(w.cs)} – {fmtDt(w.ce)}</b> vs {fmtDt(w.ps)} – {fmtDt(w.pe)}</span>
      </div>

      <div className="kpis">
        {KPI.map((k) => (
          <div className="kcard" key={k.t}>
            <div className="khd"><span className="ktl"><span className="kico" style={{ background: k.bg }}>{k.l}</span>{k.t}</span><span className="ktf">{TF_LABEL[mode]}</span></div>
            <div className="kspark">
              <svg viewBox="0 0 200 44" preserveAspectRatio="none">
                <defs><linearGradient id={'kg' + k.l} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF6138" stopOpacity=".22" /><stop offset="100%" stopColor="#FF6138" stopOpacity="0" /></linearGradient></defs>
                <path d={sparkPath(k.s) + ' L 200 44 L 0 44 Z'} fill={'url(#kg' + k.l + ')'} />
                <path d={sparkPath(k.s)} fill="none" stroke="#FF6138" strokeWidth="2" strokeLinecap="round" />
                <circle cx="200" cy={(() => { const m = Math.max(...k.s, 1); return 40 - (k.s[k.s.length - 1] / m) * 34; })()} r="3.5" fill="#FF6138" />
              </svg>
            </div>
            <div className="krow">
              <span className="kval">{k.v}</span>
              <span className={'pill ' + (k.d === null ? 'p-s' : k.d >= 0 ? 'p-up' : 'p-dn')}>{k.d === null ? '—' : (k.d >= 0 ? '↗ ' : '↘ ') + (k.dTxt || dstr(k.d).replace('−', '−'))}</span>
            </div>
            <div className="ksub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {[['ov', 'Overview'], ['staff', 'By staff'], ['trip', 'By trip'], ['mkt', 'By market'],
          ['grow', `Growth (${M.counts.grow})`], ['loss', `Loss (${M.counts.loss})`], ['stab', `Stable (${M.counts.stab})`]].map(([t, l]) => (
          <button key={t} className={screen.kind === 'tab' && screen.tab === t ? 'on' : ''} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {body}
    </div>
  );
}
