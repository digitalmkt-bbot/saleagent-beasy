import { useEffect, useMemo, useState } from 'react';
import { api, baht } from '../api.js';
import { useI18n } from '../i18n.jsx';
import MonthRangeBar from '../components/MonthRangeBar.jsx';

const money = n => '฿' + Math.round(+n || 0).toLocaleString('th-TH');
const pct = n => n == null ? 'New' : `${n > 0 ? '+' : ''}${(+n).toFixed(1)}%`;
// สัปดาห์: จันทร์ของวันที่กำหนด + บวกวัน (YYYY-MM-DD)
const mondayOf = (d) => { const x = new Date(d); const day = x.getDay() || 7; x.setDate(x.getDate() - (day - 1)); return x.toISOString().slice(0, 10); };
const addDays = (s, n) => { const x = new Date(s); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

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
  const { t, lang } = useI18n();
  const L = (th, en) => (lang === 'en' ? en : th);
  const [data, setData] = useState(null);
  const [monthA, setMonthA] = useState('');
  const [monthB, setMonthB] = useState('');
  const [program, setProgram] = useState('');
  const [owner, setOwner] = useState('');
  const [agentInput, setAgentInput] = useState('');
  const [agent, setAgent] = useState('');
  const [sort, setSort] = useState('');           // '' | 'diff_desc' | 'diff_asc'
  const [mode, setMode] = useState('monthly');    // 'monthly' | 'range' (เลือกช่วงวันที่ วัน/สัปดาห์)
  const _mon = mondayOf(new Date());
  const [aFrom, setAFrom] = useState(addDays(_mon, -7));  // ช่วง A เริ่ม (สัปดาห์ก่อน จ.)
  const [aTo, setATo] = useState(addDays(_mon, -1));      // ช่วง A ถึง (อา.)
  const [bFrom, setBFrom] = useState(_mon);               // ช่วง B เริ่ม (สัปดาห์นี้ จ.)
  const [bTo, setBTo] = useState(addDays(_mon, 6));       // ช่วง B ถึง (อา.)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const done = r => { setData(r); setError(''); };
    const fail = e => setError(e.message);
    if (mode === 'range') {
      api('/reports/agent-performance-weekly', { params: { aFrom, aTo, bFrom, bTo, agent } })
        .then(done).catch(fail).finally(() => setLoading(false));
    } else {
      api('/reports/agent-performance-monthly', { params: { monthA, monthB, program, owner, agent } })
        .then(r => {
          done(r);
          // The API falls back to its own months when a requested one has no data — follow it.
          if (r.monthA && r.monthA !== monthA) setMonthA(r.monthA);
          if (r.monthB && r.monthB !== monthB) setMonthB(r.monthB);
        })
        .catch(fail).finally(() => setLoading(false));
    }
  }, [mode, monthA, monthB, aFrom, aTo, bFrom, bTo, program, owner, agent]);

  const rows = data?.rows || [];
  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const s = [...rows];
    s.sort((x, y) => sort === 'diff_desc'
      ? (+y.difference || 0) - (+x.difference || 0)   // บวกมาก → บวกน้อย → ลบ
      : (+x.difference || 0) - (+y.difference || 0));  // ลบมาก → ลบน้อย → บวก
    return s;
  }, [rows, sort]);
  const max = useMemo(() => Math.max(1, ...rows.map(r => Math.max(+r.amount_a || 0, +r.amount_b || 0))), [rows]);
  const summary = data?.summary || {};
  const labelA = mode === 'range' ? (data?.labelA || `${aFrom}~${aTo}`) : (monthA || '-');
  const labelB = mode === 'range' ? (data?.labelB || `${bFrom}~${bTo}`) : (monthB || '-');

  // ---- Export (CSV / Excel) จากแถวที่กรอง+เรียงแล้ว ----
  function exportTable() {
    const head = ['Agent', 'Agent ID', L('เซลส์ผู้รับผิดชอบ', 'Sales owner'), L('โปรแกรม', 'Program'), labelA, labelB, L('เปลี่ยนแปลง', 'Change'), '%'];
    const body = sortedRows.map(r => [r.agent_name || '', r.rate_agent_id || '', r.owner_name || '', r.program || '',
      Math.round(+r.amount_a || 0), Math.round(+r.amount_b || 0), Math.round(+r.difference || 0), r.change_pct == null ? '' : +r.change_pct]);
    return { head, body };
  }
  function dl(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); }
  const fname = `agent-performance-${(labelA || 'A').replace(/[^\w-]/g, '')}_vs_${(labelB || 'B').replace(/[^\w-]/g, '')}`;
  function exportCsv() {
    const { head, body } = exportTable();
    const lines = [head, ...body].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','));
    dl(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }), fname + '.csv');
  }
  function exportXls() {
    const { head, body } = exportTable();
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const cell = v => (typeof v === 'number' && isFinite(v)) ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>` : `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`;
    const rowsXml = [`<Row>${head.map(h => `<Cell ss:StyleID="h"><Data ss:Type="String">${esc(h)}</Data></Cell>`).join('')}</Row>`,
      ...body.map(r => `<Row>${r.map(cell).join('')}</Row>`)].join('');
    const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#FF4B26" ss:Pattern="Solid"/></Style></Styles><Worksheet ss:Name="Agent performance"><Table>${rowsXml}</Table></Worksheet></Workbook>`;
    dl(new Blob(['﻿' + xml], { type: 'application/vnd.ms-excel;charset=utf-8' }), fname + '.xls');
  }
  const diffColor = +summary.difference >= 0 ? '#15803D' : '#BE123C';
  const control = { background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '8px 10px', color: 'var(--ink)', fontSize: 12.5, fontWeight: 600 };
  const months = data?.months || [];
  const apply = (a, b) => { setMonthA(a); setMonthB(b); };

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{t('เปรียบเทียบ Agent × โปรแกรม × เดือน')}</h3>
          <div style={{ color: 'var(--muted)', fontSize: 11.5, marginTop: 3 }}>{t('กรองตามเซลส์ผู้รับผิดชอบ เช่น IRIS แล้วเปรียบเทียบยอดของ Agent A / Agent B')}</div>
        </div>
        {loading && <span style={{ color: 'var(--muted)', fontSize: 12 }}>{t('กำลังโหลด...')}</span>}
      </div>

      {/* โหมด: รายเดือน (จาก import) / ตามวันที่ วัน-สัปดาห์ (จาก booking ระบบ rate) */}
      <div style={{ display: 'flex', gap: 6, margin: '14px 0 8px' }}>
        <button type="button" onClick={() => setMode('range')} style={{ ...control, cursor: 'pointer', ...(mode === 'range' ? { background: '#1A191D', color: '#fff' } : {}) }}>{L('ตามวันที่ (วัน/สัปดาห์)', 'By date (day/week)')}</button>
        <button type="button" onClick={() => setMode('monthly')} style={{ ...control, cursor: 'pointer', ...(mode === 'monthly' ? { background: '#1A191D', color: '#fff' } : {}) }}>{L('รายเดือน', 'Monthly')}</button>
      </div>

      {mode === 'range' ? (
        <div style={{ margin: '4px 0 10px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{L('เลือกช่วงวันที่ 2 ช่วงเพื่อเทียบ (วันเดียว หรือหลายวัน/สัปดาห์ก็ได้) — ยอดจาก booking ระบบ rate', 'Pick two date ranges to compare (a single day or several days/weeks) — from bookings in the rate system')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {(() => {
              const today = new Date().toISOString().slice(0, 10);
              const mon = mondayOf(today);
              const setR = (af, at, bf, bt) => { setAFrom(af); setATo(at); setBFrom(bf); setBTo(bt); };
              const presets = [
                [L('วันนี้ / เมื่อวาน', 'Today / Yesterday'), () => setR(addDays(today, -1), addDays(today, -1), today, today)],
                [L('สัปดาห์นี้ / ก่อน', 'This / last week'), () => setR(addDays(mon, -7), addDays(mon, -1), mon, addDays(mon, 6))],
                [L('7 วันล่าสุด / ก่อนหน้า', 'Last 7d / prev 7d'), () => setR(addDays(today, -13), addDays(today, -7), addDays(today, -6), today)],
              ];
              return presets.map(([lbl, fn]) => <button key={lbl} type="button" onClick={fn} style={{ ...control, cursor: 'pointer', fontSize: 11.5 }}>{lbl}</button>);
            })()}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>{L('ช่วง A', 'Range A')}</div>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="date" value={aFrom} max={aTo} onChange={e => setAFrom(e.target.value)} style={control} />
                <span style={{ color: 'var(--muted)' }}>→</span>
                <input type="date" value={aTo} min={aFrom} onChange={e => setATo(e.target.value)} style={control} />
              </span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>{L('ช่วง B', 'Range B')}</div>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="date" value={bFrom} max={bTo} onChange={e => setBFrom(e.target.value)} style={control} />
                <span style={{ color: 'var(--muted)' }}>→</span>
                <input type="date" value={bTo} min={bFrom} onChange={e => setBTo(e.target.value)} style={control} />
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ margin: '4px 0 10px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>{t('ช่วงเดือนเปรียบเทียบ')}</div>
          <MonthRangeBar months={months} from={monthA} to={monthB} presets={monthPresets(months)} onApply={apply} t={t} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {mode !== 'range' && <>
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
        </>}
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
          <div style={{ background: '#1C1B1F', color: '#fff', borderRadius: 14, padding: 13 }}><small style={{ color: '#A0A0A8' }}>{labelA}</small><div style={{ fontSize: 20, fontWeight: 800, marginTop: 5 }}>{money(summary.amountA)}</div></div>
          <div style={{ background: '#FF4B26', color: '#fff', borderRadius: 14, padding: 13 }}><small style={{ opacity: .8 }}>{labelB}</small><div style={{ fontSize: 20, fontWeight: 800, marginTop: 5 }}>{money(summary.amountB)}</div></div>
          <div style={{ border: '1px solid var(--glass-border)', borderRadius: 14, padding: 13 }}><small style={{ color: 'var(--muted)' }}>{t('ผลต่าง')}</small><div style={{ fontSize: 20, fontWeight: 800, marginTop: 5, color: diffColor }}>{summary.difference >= 0 ? '+' : ''}{money(summary.difference)}</div><div style={{ color: diffColor, fontSize: 11 }}>{pct(summary.changePct)}</div></div>
          <div style={{ border: '1px solid var(--glass-border)', borderRadius: 14, padding: 13 }}><small style={{ color: 'var(--muted)' }}>{t('Agent ที่แสดง')}</small><div style={{ fontSize: 20, fontWeight: 800, marginTop: 5 }}>{(+summary.agents || 0).toLocaleString()}</div></div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: 'var(--muted)' }}>{L('เรียงลำดับ', 'Sort')}{' '}
            <select value={sort} onChange={e => setSort(e.target.value)} style={{ ...control, maxWidth: 260 }}>
              <option value="">{L('ค่าเริ่มต้น (ยอด ' + labelB + ')', 'Default (by ' + labelB + ')')}</option>
              <option value="diff_desc">{L('เปลี่ยนแปลง: มากไปน้อย (บวก→ลบ)', 'Change: high → low (gain first)')}</option>
              <option value="diff_asc">{L('เปลี่ยนแปลง: น้อยไปมาก (ลบ→บวก)', 'Change: low → high (drop first)')}</option>
            </select>
          </label>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button type="button" className="btn" onClick={exportCsv} disabled={!sortedRows.length} style={{ opacity: sortedRows.length ? 1 : .5 }}>{L('ส่งออก CSV', 'Export CSV')}</button>
            <button type="button" className="btn" onClick={exportXls} disabled={!sortedRows.length} style={{ opacity: sortedRows.length ? 1 : .5 }}>{L('ส่งออก Excel', 'Export Excel')}</button>
          </span>
        </div>

        <div style={{ overflow: 'auto', maxHeight: 560 }}>
          <table>
            <thead><tr><th>{t('Agent')}</th><th>{t('เซลส์ผู้รับผิดชอบ')}</th><th>{t('โปรแกรม')}</th><th style={{ textAlign: 'right' }}>{labelA}</th><th style={{ textAlign: 'right' }}>{labelB}</th><th style={{ textAlign: 'right' }}>{t('เปลี่ยนแปลง')}</th></tr></thead>
            <tbody>{sortedRows.length ? sortedRows.map((r, i) => {
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
