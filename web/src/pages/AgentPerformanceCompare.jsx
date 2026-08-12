import { useEffect, useMemo, useState } from 'react';
import { api, baht } from '../api.js';
import { useI18n } from '../i18n.jsx';

const money = n => '฿' + Math.round(+n || 0).toLocaleString('th-TH');
const pct = n => n == null ? 'New' : `${n > 0 ? '+' : ''}${(+n).toFixed(1)}%`;

const pill = { background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '7px 11px', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 6 };
const pillInput = { border: 'none', background: 'transparent', font: 'inherit', fontWeight: 700, width: 'auto', minWidth: 0, padding: 0, color: 'var(--ink)' };

// Pairs of months to compare, anchored to the newest month that actually has data.
function monthPresets(months) {
  if (months.length < 2) return [];
  const back = n => months.at(-1 - n) || '';
  const last = months.at(-1);
  const [y, m] = last.split('-').map(Number);
  const sameMonthLastYear = `${y - 1}-${String(m).padStart(2, '0')}`;
  const list = [
    ['เดือนล่าสุด', back(1), last],
    ['เดือนก่อน', back(2), back(1)],
    ['3 เดือนล่าสุด', back(3), last],
  ];
  if (months.includes(sameMonthLastYear)) list.push(['ปีก่อน (เดือนเดียวกัน)', sameMonthLastYear, last]);
  return list.filter(([, a, b]) => a && b && a !== b);
}

export default function AgentPerformanceCompare() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [monthA, setMonthA] = useState('');
  const [monthB, setMonthB] = useState('');
  const [draftA, setDraftA] = useState('');
  const [draftB, setDraftB] = useState('');
  const [program, setProgram] = useState('');
  const [owner, setOwner] = useState('');
  const [agentInput, setAgentInput] = useState('');
  const [agent, setAgent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api('/reports/agent-performance-monthly', { params: { monthA, monthB, program, owner, agent } })
      .then(r => {
        setData(r); setError('');
        // The API falls back to its own months when a requested one has no data — follow it.
        if (r.monthA && r.monthA !== monthA) { setMonthA(r.monthA); setDraftA(r.monthA); }
        if (r.monthB && r.monthB !== monthB) { setMonthB(r.monthB); setDraftB(r.monthB); }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [monthA, monthB, program, owner, agent]);

  const rows = data?.rows || [];
  const max = useMemo(() => Math.max(1, ...rows.map(r => Math.max(+r.amount_a || 0, +r.amount_b || 0))), [rows]);
  const summary = data?.summary || {};
  const diffColor = +summary.difference >= 0 ? '#15803D' : '#BE123C';
  const control = { background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '8px 10px', color: 'var(--ink)', fontSize: 12.5, fontWeight: 600 };
  const months = data?.months || [];
  const apply = (a = draftA, b = draftB) => {
    if (!a || !b) return;
    const [from, to] = a <= b ? [a, b] : [b, a];
    setDraftA(from); setDraftB(to); setMonthA(from); setMonthB(to);
  };

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{t('เปรียบเทียบ Agent × โปรแกรม × เดือน')}</h3>
          <div style={{ color: 'var(--muted)', fontSize: 11.5, marginTop: 3 }}>{t('กรองตามเซลส์ผู้รับผิดชอบ เช่น IRIS แล้วเปรียบเทียบยอดของ Agent A / Agent B')}</div>
        </div>
        {loading && <span style={{ color: 'var(--muted)', fontSize: 12 }}>{t('กำลังโหลด...')}</span>}
      </div>

      <div style={{ margin: '14px 0 10px' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>{t('ช่วงเดือนเปรียบเทียบ')}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={pill}>📅 <input type="month" value={draftA} min={months[0]} max={months.at(-1)} onChange={e => setDraftA(e.target.value)} style={pillInput} /></div>
          <div style={pill}>→ <input type="month" value={draftB} min={months[0]} max={months.at(-1)} onChange={e => setDraftB(e.target.value)} style={pillInput} /></div>
          <button className="btn" onClick={() => apply()}>{t('ดูข้อมูล')}</button>
          {monthPresets(months).map(([lb, a, b]) => { const on = monthA === a && monthB === b; return <button key={lb} onClick={() => apply(a, b)} style={{ padding: '7px 12px', borderRadius: 999, border: '1px solid var(--glass-border)', background: on ? 'var(--ink)' : 'var(--glass)', color: on ? '#fff' : 'var(--ink)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>{t(lb)}</button>; })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: 'var(--muted)' }}>{t('โปรแกรม')}<br />
          <select value={program} onChange={e => setProgram(e.target.value)} style={{ ...control, maxWidth: 190 }}>
            <option value="">{t('ทุกโปรแกรม')}</option>
            {(data?.programs || []).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 11, color: 'var(--muted)' }}>{t('เซลส์ผู้รับผิดชอบ')}<br />
          <select value={owner} onChange={e => setOwner(e.target.value)} style={{ ...control, maxWidth: 240 }}>
            <option value="">{t('ทุกเซลส์')}</option>
            {(data?.owners || []).map(o => <option key={o.id} value={o.id}>{o.display_name}{o.assigned_agents != null ? ` (${o.assigned_agents})` : ''}</option>)}
            <option value="unassigned">Unassigned</option>
          </select>
        </label>
        <label style={{ fontSize: 11, color: 'var(--muted)', flex: '1 1 210px' }}>{t('ค้นหา Agent')}<br />
          <span style={{ display: 'flex', gap: 6 }}>
            <input value={agentInput} onChange={e => setAgentInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && setAgent(agentInput.trim())} placeholder="Agent name / ID" style={{ ...control, width: '100%' }} />
            <button className="btn" onClick={() => setAgent(agentInput.trim())}>{t('กรอง')}</button>
          </span>
        </label>
        {(program || owner || agent) && <button type="button" onClick={() => { setProgram(''); setOwner(''); setAgent(''); setAgentInput(''); }} style={{ ...control, alignSelf: 'flex-end', cursor: 'pointer' }}>{t('ล้าง')}</button>}
      </div>

      {error ? <div style={{ color: '#BE123C', padding: 12 }}>{error}</div> : <>
        <div className="ap-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
          <div style={{ background: '#1C1B1F', color: '#fff', borderRadius: 14, padding: 13 }}><small style={{ color: '#A0A0A8' }}>{monthA || '-'}</small><div style={{ fontSize: 20, fontWeight: 800, marginTop: 5 }}>{money(summary.amountA)}</div></div>
          <div style={{ background: '#FF4B26', color: '#fff', borderRadius: 14, padding: 13 }}><small style={{ opacity: .8 }}>{monthB || '-'}</small><div style={{ fontSize: 20, fontWeight: 800, marginTop: 5 }}>{money(summary.amountB)}</div></div>
          <div style={{ border: '1px solid var(--glass-border)', borderRadius: 14, padding: 13 }}><small style={{ color: 'var(--muted)' }}>{t('ผลต่าง')}</small><div style={{ fontSize: 20, fontWeight: 800, marginTop: 5, color: diffColor }}>{summary.difference >= 0 ? '+' : ''}{money(summary.difference)}</div><div style={{ color: diffColor, fontSize: 11 }}>{pct(summary.changePct)}</div></div>
          <div style={{ border: '1px solid var(--glass-border)', borderRadius: 14, padding: 13 }}><small style={{ color: 'var(--muted)' }}>{t('Agent ที่แสดง')}</small><div style={{ fontSize: 20, fontWeight: 800, marginTop: 5 }}>{(+summary.agents || 0).toLocaleString()}</div></div>
        </div>

        <div style={{ overflow: 'auto', maxHeight: 560 }}>
          <table>
            <thead><tr><th>{t('Agent')}</th><th>{t('เซลส์ผู้รับผิดชอบ')}</th><th>{t('โปรแกรม')}</th><th style={{ textAlign: 'right' }}>{monthA}</th><th style={{ textAlign: 'right' }}>{monthB}</th><th style={{ textAlign: 'right' }}>{t('เปลี่ยนแปลง')}</th></tr></thead>
            <tbody>{rows.length ? rows.map((r, i) => {
              const a = +r.amount_a || 0, b = +r.amount_b || 0, positive = +r.difference >= 0;
              return <tr key={`${r.agent_key}-${r.program}-${i}`}>
                <td><b>{r.agent_name}</b>{r.rate_agent_id && <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{r.rate_agent_id}</div>}</td>
                <td style={{ fontSize: 12 }}>{r.owner_name}</td><td>{r.program}</td>
                <td style={{ textAlign: 'right', minWidth: 125 }}><div>{baht(a)}</div><div style={{ height: 4, background: 'var(--line)', borderRadius: 4, marginTop: 4 }}><div style={{ height: 4, width: a / max * 100 + '%', background: '#1A191D', borderRadius: 4 }} /></div></td>
                <td style={{ textAlign: 'right', minWidth: 125 }}><div>{baht(b)}</div><div style={{ height: 4, background: 'var(--line)', borderRadius: 4, marginTop: 4 }}><div style={{ height: 4, width: b / max * 100 + '%', background: '#FF4B26', borderRadius: 4 }} /></div></td>
                <td style={{ textAlign: 'right', color: positive ? '#15803D' : '#BE123C', fontWeight: 800 }}>{r.difference >= 0 ? '+' : ''}{money(r.difference)}<div style={{ fontSize: 10.5 }}>{pct(r.change_pct)}</div></td>
              </tr>;
            }) : <tr><td colSpan="6" className="empty">{t('ไม่พบข้อมูล')}</td></tr>}</tbody>
          </table>
        </div>
      </>}
      <style>{`@media(max-width:760px){.ap-kpis{grid-template-columns:repeat(2,1fr)!important}}`}</style>
    </div>
  );
}
