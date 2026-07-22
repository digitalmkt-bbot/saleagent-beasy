import { useEffect, useRef, useState } from 'react';

// สไตล์เฉพาะหน้านี้ (prefix iq- กันชนกับ styles.css)
const CSS = `
.iq-page{max-width:1160px;margin:0 auto;color:#1E293B;font-family:"Inter","Noto Sans Thai",system-ui,sans-serif}
.iq-hd{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.iq-hl{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.iq-hl h2{font-size:23px;font-weight:800;margin:0;letter-spacing:-.4px;color:#0F172A}
.iq-aib{font-size:10px;font-weight:700;color:#059669;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:999px;padding:3px 9px}
.iq-cop{font:inherit;display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#fff;background:#00D084;border:0;border-radius:999px;padding:8px 15px;cursor:pointer;box-shadow:0 3px 10px rgba(0,208,132,.35)}
.iq-cop:hover{filter:brightness(1.05)}
.iq-hr{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.iq-srch{position:relative}
.iq-srch input{font:inherit;font-size:12px;background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:8px 12px 8px 30px;width:160px;color:#1E293B}
.iq-srch:before{content:'⌕';font-size:14px;position:absolute;left:10px;top:50%;transform:translateY(-52%);color:#94A3B8}
.iq-ico{font:inherit;background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:7px 10px;cursor:pointer;font-size:13px}
.iq-ico:hover{background:#F8FAFC}
.iq-date{display:inline-flex;align-items:center;gap:7px;background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:8px 13px;font-size:12px;font-weight:500;color:#334155}
.iq-card{background:#fff;border:1px solid #F1F5F9;border-radius:20px;box-shadow:0 1px 2px rgba(15,23,42,.04);padding:18px 20px;margin-bottom:16px}
.iq-cardhd{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
.iq-h{font-size:15px;font-weight:700;color:#0F172A;margin:0}
.iq-grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-bottom:16px}
.iq-mcard{background:#fff;border:1px solid #F1F5F9;border-radius:20px;padding:16px 18px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.iq-mhd{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}
.iq-mtl{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#0F172A}
.iq-mico{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:99px;color:#fff;font-size:11px;font-weight:700;flex:none}
.iq-tf{font-size:11px;font-weight:600;color:#94A3B8}
.iq-spark{height:58px;margin:8px 0}
.iq-spark svg{width:100%;height:100%;overflow:visible}
.iq-mrow{display:flex;align-items:baseline;justify-content:space-between;margin-top:8px}
.iq-val{font-size:23px;font-weight:800;letter-spacing:-.5px;color:#0F172A}
.iq-sub{font-size:11px;font-weight:500;color:#94A3B8;margin-top:3px}
.iq-pill{display:inline-flex;align-items:center;gap:2px;font-size:10.5px;font-weight:700;border-radius:999px;padding:2px 8px;font-style:normal}
.iq-up{color:#059669;background:#ECFDF5}
.iq-dn{color:#E11D48;background:#FFF1F2}
.iq-ghost{font:inherit;font-size:11.5px;font-weight:600;color:#059669;background:#fff;border:1px solid #A7F3D0;border-radius:999px;padding:6px 12px;cursor:pointer}
.iq-ghost:hover{background:#ECFDF5}
.iq-cash{display:grid;grid-template-columns:1fr 290px;gap:24px;align-items:start}
.iq-bwrap{position:relative;height:176px;margin-top:10px}
.iq-yl{position:absolute;left:0;font-size:10px;font-weight:600;color:#94A3B8}
.iq-gl{position:absolute;left:34px;right:0;border-top:1px dashed #E2E8F0}
.iq-gl.iq-solid{border-top:1px solid #CBD5E1}
.iq-bars{position:absolute;left:46px;right:12px;top:0;display:flex;justify-content:space-between}
.iq-bcol{display:flex;flex-direction:column;align-items:center}
.iq-bt{height:88px;display:flex;align-items:flex-end}
.iq-bt i{display:block;width:14px;border-radius:99px;background:linear-gradient(to top,#10B981,#00D084)}
.iq-bb{height:52px;margin-top:4px}
.iq-bb i{display:block;width:14px;border-radius:99px;background:#1E293B}
.iq-bcol span{font-size:11px;font-weight:700;color:#94A3B8;margin-top:8px}
.iq-side{background:#F8FAFC;border:1px solid #EEF2F6;border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:12px}
.iq-sel{display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:9px 12px;cursor:pointer;font-size:12px;font-weight:700;color:#0F172A}
.iq-sel>span:first-child{display:inline-flex;align-items:center;gap:8px}
.iq-mbox{display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:13px 14px}
.iq-ml{display:flex;align-items:center;gap:10px}
.iq-mic{width:36px;height:36px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:15px;flex:none}
.iq-mtx span{display:block;font-size:11px;font-weight:600;color:#94A3B8}
.iq-mtx b{font-size:15px;font-weight:800;color:#0F172A}
.iq-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.iq-grid2 .iq-card{margin-bottom:0}
.iq-perf{position:relative;height:230px;padding:8px 0 24px 34px;margin-top:6px}
.iq-py{position:absolute;left:0;top:8px;bottom:24px;display:flex;flex-direction:column;justify-content:space-between;font-size:10px;font-weight:600;color:#94A3B8}
.iq-perf svg{width:100%;height:100%;overflow:visible}
.iq-tip{position:absolute;top:19%;left:56%;transform:translateX(-50%);background:#fff;border:1px solid #E2E8F0;border-radius:999px;box-shadow:0 4px 12px rgba(15,23,42,.12);color:#059669;font-size:10px;font-weight:700;padding:3px 10px;z-index:2}
.iq-dash{position:absolute;top:31%;left:56%;bottom:24px;border-left:1px dashed #CBD5E1}
.iq-px{position:absolute;left:34px;right:0;bottom:0;display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:#94A3B8}
.iq-frow{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px;border-radius:14px}
.iq-frow:hover{background:#F8FAFC}
.iq-fc1{width:64px}
.iq-fc1 b{display:block;font-size:12px;color:#0F172A}
.iq-fc1 span{font-size:10px;color:#94A3B8}
.iq-fc span{display:block;font-size:10px;color:#94A3B8;font-weight:500}
.iq-fc b{font-size:12px;color:#0F172A;display:flex;align-items:center;gap:5px}
.iq-fc.r{text-align:right}
.iq-fc.r b{justify-content:flex-end}
.iq-toast{position:fixed;top:18px;right:18px;z-index:99;background:#0F172A;color:#fff;font-size:12px;font-weight:600;padding:10px 14px;border-radius:12px;box-shadow:0 8px 24px rgba(15,23,42,.35)}
@media(max-width:860px){.iq-cash{grid-template-columns:1fr}.iq-grid2{grid-template-columns:1fr}}
`;

const MKT = [
  { t: 'S&P 500', l: 'S', bg: '#FBBF24', tf: 'Last 30 days', v: '$9.562,31', ch: '21%', pos: true, lp: 'vs 8.734,00 Last Period', col: '#10B981', p: 'M 0 35 Q 25 30 40 18 T 80 25 T 120 10 T 160 5 T 200 8', ex: 200, ey: 8 },
  { t: 'Dow Jones', l: 'D', bg: '#3B82F6', tf: 'Last 30 days', v: '$6.229,00', ch: '18%', pos: true, lp: 'vs 5.871,00 Last Period', col: '#10B981', p: 'M 0 28 Q 30 20 60 25 T 110 18 T 160 12 T 200 6', ex: 200, ey: 6 },
  { t: 'NASDAQ', l: 'N', bg: '#EAB308', tf: 'Last 30 days', v: '$3.670,09', ch: '14%', pos: false, lp: 'vs 5.430,51 Last Period', col: '#EF4444', p: 'M 0 10 Q 30 5 60 18 T 110 12 T 160 28 T 200 22', ex: 200, ey: 22 },
];
const BARS = [
  { m: 'May', t: 70, b: 25 }, { m: 'Jun', t: 35, b: 30 }, { m: 'Jul', t: 50, b: 40 },
  { m: 'Aug', t: 45, b: 20 }, { m: 'Sep', t: 65, b: 32 }, { m: 'Nov', t: 58, b: 28 }, { m: 'Des', t: 40, b: 35 },
];
const FUND = [
  { k: 'P/E', sub: 'Price to', price: '$124.09', ch: '1.25', pct: '18%', pos: true, cur: '$2056.18' },
  { k: 'EPS', sub: 'Earnings', price: '$118.21', ch: '1.17', pct: '14%', pos: true, cur: '$1827.36' },
  { k: 'DVD', sub: 'Dividend', price: '$112.59', ch: '0.14', pct: '12%', pos: true, cur: '$1653.41' },
  { k: 'ROA', sub: 'Return on', price: '$109.48', ch: '0.8', pct: '8%', pos: false, cur: '$1034.21' },
];

export default function InvestIQ() {
  const [q, setQ] = useState('');
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const ping = (msg) => { setToast(msg); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(null), 2200); };
  const fund = FUND.filter(f => (f.k + ' ' + f.sub).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="iq-page">
      <style>{CSS}</style>
      {toast && <div className="iq-toast">✓ {toast}</div>}

      <div className="iq-hd">
        <div className="iq-hl">
          <h2>Dashboard</h2>
          <span className="iq-aib">AI Powered</span>
          <button className="iq-cop" onClick={() => ping('InvestIQ AI Copilot — demo')}>✦ InvestIQ AI Copilot</button>
        </div>
        <div className="iq-hr">
          <span className="iq-srch"><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search metrics..." /></span>
          <button className="iq-ico" onClick={() => ping('No new notifications')}>🔔</button>
          <button className="iq-ico" onClick={() => ping('Messages inbox empty')}>✉️</button>
          <span className="iq-date">🗓 18 Dec 2024 - 18 Jan 2025 <span style={{ color: '#94A3B8' }}>▾</span></span>
        </div>
      </div>

      <div className="iq-grid3">
        {MKT.map((m, i) => (
          <div className="iq-mcard" key={m.t}>
            <div className="iq-mhd">
              <span className="iq-mtl"><span className="iq-mico" style={{ background: m.bg }}>{m.l}</span>{m.t}</span>
              <span className="iq-tf">{m.tf}</span>
            </div>
            <div className="iq-spark">
              <svg viewBox="0 0 200 40" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={'iqg' + i} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={m.col} stopOpacity=".25" />
                    <stop offset="100%" stopColor={m.col} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={m.p + ' L 200 40 L 0 40 Z'} fill={'url(#iqg' + i + ')'} />
                <path d={m.p} fill="none" stroke={m.col} strokeWidth="2" strokeLinecap="round" />
                <circle cx={m.ex} cy={m.ey} r="3.5" fill={m.col} />
                <circle cx={m.ex} cy={m.ey} r="6" fill={m.col} fillOpacity=".3" />
              </svg>
            </div>
            <div className="iq-mrow">
              <span className="iq-val">{m.v}</span>
              <span className={'iq-pill ' + (m.pos ? 'iq-up' : 'iq-dn')}>{m.pos ? '↗' : '↘'} {m.ch}</span>
            </div>
            <div className="iq-sub">{m.lp}</div>
          </div>
        ))}
      </div>

      <div className="iq-card">
        <div className="iq-cardhd">
          <div className="iq-h">Portfolio Cashflow</div>
          <button className="iq-ghost" onClick={() => ping('AI Cashflow Advisory — demo')}>✦ AI Cashflow Advisory</button>
        </div>
        <div className="iq-cash">
          <div className="iq-bwrap">
            <span className="iq-yl" style={{ top: -4 }}>$5k</span>
            <span className="iq-yl" style={{ top: 84 }}>$0k</span>
            <span className="iq-yl" style={{ top: 140 }}>$3k</span>
            <div className="iq-gl" style={{ top: 2 }} />
            <div className="iq-gl iq-solid" style={{ top: 90 }} />
            <div className="iq-gl" style={{ top: 146 }} />
            <div className="iq-bars">
              {BARS.map(b => (
                <div className="iq-bcol" key={b.m}>
                  <div className="iq-bt"><i style={{ height: b.t }} /></div>
                  <div className="iq-bb"><i style={{ height: b.b }} /></div>
                  <span>{b.m}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="iq-side">
            <div className="iq-sel" onClick={() => ping('Index selector — demo')}>
              <span><span className="iq-mico" style={{ background: '#FBBF24', width: 20, height: 20, fontSize: 10 }}>S</span>S&P 500</span>
              <span style={{ color: '#94A3B8' }}>▾</span>
            </div>
            <div className="iq-mbox">
              <span className="iq-ml">
                <span className="iq-mic" style={{ background: '#10B981' }}>↗</span>
                <span className="iq-mtx"><span>Income</span><b>$15.891,04</b></span>
              </span>
              <span className="iq-pill iq-up">↗ 21%</span>
            </div>
            <div className="iq-mbox">
              <span className="iq-ml">
                <span className="iq-mic" style={{ background: '#1E293B' }}>↘</span>
                <span className="iq-mtx"><span>Expense</span><b>$7.509,61</b></span>
              </span>
              <span className="iq-pill iq-dn">↘ 14%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="iq-grid2">
        <div className="iq-card">
          <div className="iq-h">Stock Performance</div>
          <div className="iq-perf">
            <div className="iq-py"><span>500k</span><span>100k</span><span>50k</span><span>0</span></div>
            <div className="iq-tip">$300</div>
            <div className="iq-dash" />
            <svg viewBox="0 0 300 120" preserveAspectRatio="none">
              <path d="M 10 90 Q 50 60 90 85 T 180 80 T 270 100" fill="none" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 10 75 Q 40 60 80 80 T 160 30 T 270 95" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="162" cy="30" r="4" fill="#10B981" />
              <circle cx="162" cy="30" r="7" fill="#10B981" fillOpacity=".25" />
            </svg>
            <div className="iq-px"><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span></div>
          </div>
        </div>
        <div className="iq-card">
          <div className="iq-cardhd">
            <div className="iq-h">Data fundamental</div>
            <button className="iq-ghost" onClick={() => ping('AI Deep Audit — demo')}>✦ AI Deep Audit</button>
          </div>
          <div>
            {fund.map(f => (
              <div className="iq-frow" key={f.k}>
                <div className="iq-fc1"><b>{f.k}</b><span>{f.sub}</span></div>
                <div className="iq-fc"><span>Price</span><b>{f.price}</b></div>
                <div className="iq-fc"><span>Change</span><b>{f.ch} <i className={'iq-pill ' + (f.pos ? 'iq-up' : 'iq-dn')}>{f.pos ? '↗' : '↘'} {f.pct}</i></b></div>
                <div className="iq-fc r"><span>Current Value</span><b>{f.cur}</b></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
