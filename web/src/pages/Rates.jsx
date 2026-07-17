import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';

const ZONES = [['PK', 'ภูเก็ต (PK)'], ['KL', 'เขาหลัก (KL)'], ['NoTransfer', 'ไม่รับส่ง']];
const PAX = [
  ['adult_thai', 'ผู้ใหญ่ (ไทย)'], ['adult_fr', 'ผู้ใหญ่ (ต่างชาติ)'],
  ['child_thai', 'เด็ก (ไทย)'], ['child_fr', 'เด็ก (ต่างชาติ)'],
  ['infant_thai', 'ทารก (ไทย)'], ['infant_fr', 'ทารก (ต่างชาติ)'],
];
const baht = n => '฿' + Number(n || 0).toLocaleString('th-TH');

export default function Rates() {
  const { t } = useI18n();
  const [ready, setReady] = useState(null);
  const [agents, setAgents] = useState([]);
  const [scope, setScope] = useState(null);
  const [aid, setAid] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [zone, setZone] = useState('PK');
  const [route, setRoute] = useState('');
  const [qty, setQty] = useState({});

  useEffect(() => {
    api('/rates/status').then(s => {
      setReady(s.ready);
      if (s.ready) api('/rates/agents').then(d => { setAgents(d.rows || []); setScope(d.scope || null); }).catch(() => {});
    }).catch(() => setReady(false));
  }, []);
  useEffect(() => {
    if (!aid) { setData(null); return; }
    api('/rates/agent/' + aid).then(d => {
      setData(d);
      const routes = Object.keys(d.rateType.seatRates || {});
      setRoute(routes[0] || '');
      setQty({});
    }).catch(() => setData(null));
  }, [aid]);

  const sr = data && data.rateType.seatRates;
  const routeKeys = sr ? Object.keys(sr) : [];
  const lines = useMemo(() => {
    if (!sr || !route) return [];
    const cell = sr[route][zone] || {};
    return PAX.map(([k, label]) => {
      const n = +(qty[k] || 0), price = Number(cell[k] || 0);
      return { k, label, n, price, sub: n * price };
    }).filter(l => l.n > 0);
  }, [sr, route, zone, qty]);
  const total = lines.reduce((s, l) => s + l.sub, 0);
  const ql = q.trim().toLowerCase();
  const shownAgents = ql ? agents.filter(a => ((a.name || '') + ' ' + (a.code || '') + ' ' + (a.rate_type_name || '')).toLowerCase().includes(ql)) : agents;

  if (ready === false) return (
    <div>
      <h1 className="page">{t('เรตราคา')} 💵</h1>
      <div className="card">
        <p style={{ marginTop: 0 }}>{t('ยังไม่ได้เชื่อมต่อระบบ rate')}</p>
        <div className="muted" style={{ lineHeight: 1.7 }}>
          {t('ตั้งค่าใน Railway')} → บริการ backend (server) → แท็บ <b>Variables</b> → เพิ่ม<br />
          <code>RATE_DATABASE_URL</code> = <span className="muted">(connection string ของ DB ระบบ rate)</span><br />
          {t('แล้ว deploy ใหม่ หน้านี้จะทำงานทันที')}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="page">{t('เรตราคา')} 💵</h1>
      <div className="page-sub">{t('ดูแพ็กเกจราคาของเอเจ้นท์ และคำนวณราคาตามจำนวนผู้โดยสาร (อ่านจากระบบ rate โดยตรง)')}</div>

      <div className="card">
        <label>{t('ค้นหาเอเจ้นท์')}</label>
        <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder={t('พิมพ์ชื่อ หรือรหัสเอเจ้นท์...')} style={{ marginBottom: 10 }} />
        <label>{t('เลือกเอเจ้นท์')}</label>
        <select value={aid} onChange={e => setAid(e.target.value)}>
          <option value="">{t('- เลือกเอเจ้นท์ -')} ({shownAgents.length}{ql ? ' / ' + agents.length : ''})</option>
          {shownAgents.map(a => <option key={a.id} value={a.id}>{a.name} · {a.code}{a.rate_type_name ? ' — ' + a.rate_type_name : ''}</option>)}
        </select>
        {ql && shownAgents.length === 0 && <div className="muted" style={{ marginTop: 6, fontSize: 12.5 }}>{t('ไม่พบเอเจ้นท์ที่ตรงกับคำค้น')} "{q}"</div>}
        {scope && !scope.all && scope.code && <div className="muted" style={{ marginTop: 6, fontSize: 12.5 }}>👤 {t('แสดงเฉพาะเอเจ้นท์ที่คุณดูแล')} — {scope.name}</div>}
        {scope && !scope.all && !scope.code && <div className="err" style={{ marginTop: 8 }}>{t('ไม่พบเซลส์ที่ตรงกับอีเมลของคุณในระบบ rate')}{scope.email ? ' (' + scope.email + ')' : ''} — {t('ให้แอดมินตั้งอีเมลให้ตรงกัน')}</div>}
        {data && <div style={{ marginTop: 10 }}>
          <span className="pill blue">{t('แพ็กเกจ')}: {data.rateType.name || '-'}</span>{' '}
          {data.rateType.code && <span className="pill">{data.rateType.code}</span>}{' '}
          {(data.rateType.validfrom || data.rateType.validto) && <span className="muted">{t('ใช้ได้')} {data.rateType.validfrom || '?'} → {data.rateType.validto || '?'}</span>}
        </div>}
      </div>

      {data && <>
        <div className="card">
          <div className="panel-head" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>{t('ตารางราคาที่นั่ง')}</h3>
            <span style={{ display: 'flex', gap: 6 }}>{ZONES.map(([z, lb]) =>
              <span key={z} className={'dirbtn' + (zone === z ? ' on' : '')} style={{ padding: '6px 12px' }} onClick={() => setZone(z)}>{lb}</span>)}</span>
          </div>
          <div className="panel" style={{ overflowX: 'auto', marginTop: 10 }}>
            <table>
              <thead><tr><th>{t('เส้นทาง')}</th>{PAX.map(([k, l]) => <th key={k} style={{ textAlign: 'right' }}>{l}</th>)}</tr></thead>
              <tbody>{routeKeys.map(rk => {
                const cell = sr[rk][zone] || {};
                return <tr key={rk}>
                  <td><b>{rk.toUpperCase()}</b><div className="muted">{sr[rk].route_name || ''}</div></td>
                  {PAX.map(([k]) => <td key={k} style={{ textAlign: 'right' }}>{Number(cell[k]) ? baht(cell[k]) : '-'}</td>)}
                </tr>;
              })}</tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="panel-head"><h3 style={{ margin: 0 }}>{t('เครื่องคิดราคา')} 🧮</h3></div>
          <div className="row" style={{ marginTop: 10 }}>
            <div><label>{t('เส้นทาง')}</label>
              <select value={route} onChange={e => setRoute(e.target.value)}>
                {routeKeys.map(rk => <option key={rk} value={rk}>{rk.toUpperCase()} — {sr[rk].route_name || ''}</option>)}
              </select></div>
            <div><label>{t('โซนรับส่ง')}</label>
              <select value={zone} onChange={e => setZone(e.target.value)}>{ZONES.map(([z, lb]) => <option key={z} value={z}>{lb}</option>)}</select></div>
          </div>
          <div className="row" style={{ marginTop: 6 }}>
            {PAX.map(([k, label]) => {
              const price = route ? Number((sr[route][zone] || {})[k] || 0) : 0;
              return <div key={k} style={{ minWidth: 150 }}>
                <label>{label} <span className="muted">({baht(price)})</span></label>
                <input type="number" min="0" value={qty[k] || ''} onChange={e => setQty(q => ({ ...q, [k]: e.target.value.replace(/[^0-9]/g, '') }))} placeholder="0" />
              </div>;
            })}
          </div>
          {lines.length > 0 && <div style={{ marginTop: 14, borderTop: '1px solid var(--line, #eee)', paddingTop: 12 }}>
            {lines.map(l => <div key={l.k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '2px 0' }}>
              <span>{l.label} × {l.n} @ {baht(l.price)}</span><b>{baht(l.sub)}</b></div>)}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 18, fontWeight: 800 }}>
              <span>{t('รวมทั้งหมด')}</span><span style={{ color: 'var(--brand-text, #0B7355)' }}>{baht(total)}</span></div>
          </div>}
        </div>
      </>}
    </div>
  );
}
