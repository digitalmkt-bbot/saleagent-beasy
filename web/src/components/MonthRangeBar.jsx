import { useEffect, useState } from 'react';

const pill = { background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '7px 11px', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 6 };
const pillInput = { border: 'none', background: 'transparent', font: 'inherit', fontWeight: 700, width: 'auto', minWidth: 0, padding: 0, color: 'var(--ink)' };

// Month fields + View + quick chips, matching the dashboard date bar.
// `presets` is a list of [label, fromMonth, toMonth]; edits only take effect on View or a chip.
export default function MonthRangeBar({ months = [], from, to, presets = [], onApply, t }) {
  const [draftFrom, setDraftFrom] = useState(from || '');
  const [draftTo, setDraftTo] = useState(to || '');
  useEffect(() => { setDraftFrom(from || ''); }, [from]);
  useEffect(() => { setDraftTo(to || ''); }, [to]);

  const apply = (a = draftFrom, b = draftTo) => {
    if (!a || !b) return;
    const [start, end] = a <= b ? [a, b] : [b, a];
    setDraftFrom(start); setDraftTo(end); onApply(start, end);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <div style={pill}>📅 <input type="month" value={draftFrom} min={months[0]} max={months.at(-1)} onChange={e => setDraftFrom(e.target.value)} style={pillInput} /></div>
      <div style={pill}>→ <input type="month" value={draftTo} min={months[0]} max={months.at(-1)} onChange={e => setDraftTo(e.target.value)} style={pillInput} /></div>
      <button className="btn" onClick={() => apply()}>{t('ดูข้อมูล')}</button>
      {presets.map(([label, a, b]) => {
        const on = from === a && to === b;
        return <button key={label} onClick={() => apply(a, b)} style={{ padding: '7px 12px', borderRadius: 999, border: '1px solid var(--glass-border)', background: on ? 'var(--ink)' : 'var(--glass)', color: on ? '#fff' : 'var(--ink)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>{t(label)}</button>;
      })}
    </div>
  );
}
