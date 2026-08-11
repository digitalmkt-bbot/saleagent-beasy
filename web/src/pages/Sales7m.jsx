import { useEffect, useState } from 'react';
import { api, baht } from '../api.js';
import { useI18n } from '../i18n.jsx';

const PAL = ['#FF4B26', '#1A191D', '#FF9269', '#8A8790', '#FFC5AC', '#E11D48', '#F59E0B', '#5B9DF9'];
const TIER_STYLE = {
  A: { background: '#DCFCE7', color: '#15803D' },
  B: { background: '#DBEAFE', color: '#1D4ED8' },
  C: { background: '#FEF3C7', color: '#B45309' },
  D: { background: '#FFE4E6', color: '#BE123C' },
};
const compact = (n) => {
  n = +n || 0;
  if (n >= 1e6) return '฿' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '฿' + Math.round(n / 1e3) + 'K';
  return '฿' + Math.round(n).toLocaleString();
};

// horizontal bars for revenue-by-program
function TierChart({ rows, active, onSelect, t }) {
  const tiers = ['A', 'B', 'C', 'D'].map((tier) => rows.find((r) => r.tier === tier) || { tier, agents: 0, total: 0 });
  const total = tiers.reduce((sum, row) => sum + (+row.total || 0), 0) || 1;
  return (
    <div style={{ marginBottom: 16, padding: 14, border: '1px solid var(--glass-border)', borderRadius: 14, background: 'var(--glass)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>{t('สัดส่วนยอดขายตาม Tier')}</div>
        <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{t('คลิกกราฟเพื่อกรอง')}</div>
      </div>
      <div style={{ display: 'flex', height: 22, overflow: 'hidden', borderRadius: 999, background: 'var(--line)' }}>
        {tiers.map((row) => {
          const pct = (+row.total || 0) / total * 100;
          return <button key={row.tier} type="button" title={`Tier ${row.tier}: ${compact(row.total)} (${pct.toFixed(1)}%)`} onClick={() => onSelect(active === row.tier ? '' : row.tier)} style={{ width: pct + '%', minWidth: pct ? 4 : 0, padding: 0, border: 0, cursor: 'pointer', opacity: active && active !== row.tier ? .3 : 1, background: TIER_STYLE[row.tier].color, transition: 'opacity .2s' }} />;
        })}
      </div>
      <div className="s7-tier-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 10 }}>
        {tiers.map((row) => {
          const pct = (+row.total || 0) / total * 100;
          return <button key={row.tier} type="button" onClick={() => onSelect(active === row.tier ? '' : row.tier)} style={{ padding: '9px 10px', textAlign: 'left', border: active === row.tier ? `2px solid ${TIER_STYLE[row.tier].color}` : '1px solid var(--glass-border)', borderRadius: 10, cursor: 'pointer', background: TIER_STYLE[row.tier].background, color: TIER_STYLE[row.tier].color }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800 }}><span>Tier {row.tier}</span><span>{pct.toFixed(1)}%</span></div>
            <div style={{ fontSize: 15, fontWeight: 800, marginTop: 3 }}>{compact(row.total)}</div>
            <div style={{ fontSize: 10.5, marginTop: 1 }}>{(+row.agents || 0).toLocaleString()} {t('ราย')}</div>
          </button>;
        })}
      </div>
    </div>
  );
}

function ProgBars({ rows }) {
  const mx = Math.max(1, ...rows.map((r) => +r.amount));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r, i) => (
        <div key={r.program}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.program}</span>
            <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{compact(r.amount)}</span>
          </div>
          <div style={{ height: 10, borderRadius: 6, background: 'var(--line, #eee)' }}>
            <div style={{ height: '100%', width: Math.max(3, Math.round((+r.amount / mx) * 100)) + '%', borderRadius: 6, background: PAL[i % PAL.length] }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Sales7m() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [agent, setAgent] = useState('');
  const [program, setProgram] = useState('');
  const [tier, setTier] = useState('');
  const [q, setQ] = useState('');
  const [err, setErr] = useState(false);

  const load = () => {
    api('/reports/agent-sales-7m', { params: { agent, program, tier } })
      .then((d) => { setData(d); setErr(false); })
      .catch(() => setErr(true));
  };
  useEffect(() => { load(); }, [agent, program, tier]); // eslint-disable-line

  const lnk = { color: '#FF4B26', fontWeight: 700, fontSize: 12, cursor: 'pointer' };
  const seg = { background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '7px 10px', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' };

  if (err) {
    return (
      <div className="card" style={{ marginTop: 14 }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800 }}>{t('ยอดขายย้อนหลัง 7 เดือน (นำเข้า)')}</h3>
        <div style={{ color: '#8A8790', fontSize: 12.5 }}>{t('ยังไม่มีตาราง report_agent_sales_7m_2026 ในฐานข้อมูล (โปรด import ก่อน)')}</div>
      </div>
    );
  }
  if (!data) return null;

  const tot = data.total || {};
  const agents = data.topAgents || [];
  const shown = agents.slice(0, 12);

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{t('ยอดขายย้อนหลัง 7 เดือน (ม.ค.–ก.ค. 2026)')}</h3>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{t('จากไฟล์ Agency × Trip Performance ที่นำเข้า · แยกตาม agent × โปรแกรม')}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select value={program} onChange={(e) => setProgram(e.target.value)} style={seg}>
            <option value="">{t('ทุกโปรแกรม')}</option>
            {(data.programs || []).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={tier} onChange={(e) => setTier(e.target.value)} style={seg}>
            <option value="">{t('ทุก Tier')}</option>
            {(data.tierSummary || []).map((x) => <option key={x.tier} value={x.tier}>Tier {x.tier} ({x.agents})</option>)}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setAgent(q.trim()); }}
            placeholder={t('ค้นหา agent (ชื่อ/รหัส)')}
            style={{ ...seg, minWidth: 190 }}
          />
          <button className="btn" onClick={() => setAgent(q.trim())}>{t('กรอง')}</button>
          {(agent || program || tier) && <a style={lnk} onClick={() => { setAgent(''); setProgram(''); setTier(''); setQ(''); }}>{t('ล้าง')}</a>}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 14 }}>
        <div style={{ background: '#1C1B1F', color: '#fff', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 11.5, color: '#A0A0A8', fontWeight: 600 }}>{t('ยอดรวม 7 เดือน')}</div>
          <div style={{ fontSize: 24, fontWeight: 800, margin: '6px 0 0' }}>{compact(tot.total)}</div>
        </div>
        <div style={{ background: '#FF4B26', color: '#fff', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 11.5, opacity: .85, fontWeight: 600 }}>{t('จำนวน Agent')}</div>
          <div style={{ fontSize: 24, fontWeight: 800, margin: '6px 0 0' }}>{(tot.agents || 0).toLocaleString()}</div>
        </div>
        <div className="card" style={{ boxShadow: 'none', border: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>{t('จำนวนโปรแกรม')}</div>
          <div style={{ fontSize: 24, fontWeight: 800, margin: '6px 0 0' }}>{(tot.programs || 0).toLocaleString()}</div>
        </div>
      </div>

      <TierChart rows={data.tierSummary || []} active={tier} onSelect={setTier} t={t} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16 }} className="s7-grid">
        {/* by program */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>{t('ยอดตามโปรแกรม')}</div>
          <ProgBars rows={data.byProgram || []} />
        </div>
        {/* agents ranked */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{t('อันดับ Agent ตามยอด')}</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>{t('Tier A–D แบ่งตามอันดับยอดขายเป็น 4 กลุ่มเท่า ๆ กัน')}</div>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{agents.length} {t('ราย')}</div>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
            <table>
              <thead><tr>
                <th>{t('Agent')}</th>
                <th>{t('รหัส')}</th>
                <th style={{ textAlign: 'center' }}>Tier</th>
                <th style={{ textAlign: 'right' }}>{t('โปรแกรม')}</th>
                <th style={{ textAlign: 'right' }}>{t('ยอดรวม')}</th>
              </tr></thead>
              <tbody>
                {shown.map((x, i) => (
                  <tr key={x.key}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 22, height: 22, borderRadius: 7, background: i < 3 ? '#FF4B26' : 'var(--line)', color: i < 3 ? '#fff' : 'var(--muted)', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                        <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.name}</b>
                      </div>
                    </td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{x.code || '-'}</td>
                    <td style={{ textAlign: 'center' }}><span style={{ display: 'inline-flex', minWidth: 25, justifyContent: 'center', borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 800, ...(TIER_STYLE[x.tier] || {}) }}>{x.tier || '-'}</span></td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{x.programs}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{baht(x.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style>{`@media(max-width:800px){.s7-grid{grid-template-columns:1fr!important}}@media(max-width:560px){.s7-tier-grid{grid-template-columns:repeat(2,1fr)!important}}`}</style>
    </div>
  );
}
