import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';

const TABS = [
  ['segments', 'ประเภทลูกค้า (Segment)'], ['types', 'ประเภทกิจกรรม'], ['objectives', 'วัตถุประสงค์'],
  ['targets', 'เป้าหมาย (Target Template)'], ['markets', 'ตลาด/ประเทศ'],
];

export default function SalesPlanSettings() {
  const { t } = useI18n();
  const [tab, setTab] = useState('segments');
  return (
    <div>
      <h1 className="page">{t('ตั้งค่า Sales Plan')}</h1>
      <div className="tabs">{TABS.map(([k, l]) => <div key={k} className={'tab' + (tab === k ? ' active' : '')} onClick={() => setTab(k)}>{t(l)}</div>)}</div>
      {tab === 'segments' && <SimpleMaster t={t} path="/sales-segments" fields="code" title="ประเภทลูกค้า" />}
      {tab === 'types' && <SimpleMaster t={t} path="/sales-activity-types" title="ประเภทกิจกรรม" />}
      {tab === 'objectives' && <SimpleMaster t={t} path="/sales-objectives" title="วัตถุประสงค์" />}
      {tab === 'targets' && <TargetTemplates t={t} />}
      {tab === 'markets' && <Markets t={t} />}
    </div>
  );
}

function SimpleMaster({ t, path, title }) {
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ code: '', name_en: '', name_th: '', description: '' });
  const [err, setErr] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const load = () => api(path).then(d => setRows(d.rows)).catch(() => {});
  useEffect(() => { load(); }, [path]);
  async function add() {
    if (!f.code || !f.name_en) return setErr(t('กรอก code และชื่อ'));
    try { await api(path, { method: 'POST', body: f }); setF({ code: '', name_en: '', name_th: '', description: '' }); setErr(''); load(); }
    catch (e) { setErr(e.message); }
  }
  return (
    <div className="panel">
      <div className="panel-head"><b>{t(title)}</b></div>
      <table><thead><tr><th>Code</th><th>{t('ชื่อ (EN)')}</th><th>{t('ชื่อ (TH)')}</th><th>{t('คำอธิบาย')}</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.id}><td><b>{r.code}</b></td><td>{r.name_en}</td><td>{r.name_th}</td><td className="muted">{r.description}</td></tr>)}</tbody>
      </table>
      <div className="row" style={{ padding: 12, gap: 8 }}>
        <input placeholder="Code" value={f.code} onChange={e => set('code', e.target.value.toUpperCase())} style={{ maxWidth: 120 }} />
        <input placeholder={t('ชื่อ (EN)')} value={f.name_en} onChange={e => set('name_en', e.target.value)} />
        <input placeholder={t('ชื่อ (TH)')} value={f.name_th} onChange={e => set('name_th', e.target.value)} />
        <input placeholder={t('คำอธิบาย')} value={f.description} onChange={e => set('description', e.target.value)} />
        <button className="btn green" onClick={add}>{t('+ เพิ่ม')}</button>
      </div>
      {err && <div className="err" style={{ margin: '0 12px 12px' }}>{err}</div>}
    </div>
  );
}

function TargetTemplates({ t }) {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const load = () => api('/sales-target-templates').then(d => setRows(d.rows)).catch(() => {});
  useEffect(() => { load(); }, []);
  const [f, setF] = useState({ target_type: '', target_name: '', minimum_target: '', full_target: '', measurement_unit: '', weight_percentage: '' });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  async function add() {
    if (!f.target_type) return setErr(t('กรอก target_type'));
    try { await api('/sales-target-templates', { method: 'POST', body: f }); setF({ target_type: '', target_name: '', minimum_target: '', full_target: '', measurement_unit: '', weight_percentage: '' }); setErr(''); load(); }
    catch (e) { setErr(e.message); }
  }
  async function save(r) {
    try { await api('/sales-target-templates/' + r.id, { method: 'PUT', body: { minimum_target: +r.minimum_target, full_target: +r.full_target, weight_percentage: +r.weight_percentage } }); load(); }
    catch (e) { alert(e.message); }
  }
  const upd = (id, k, v) => setRows(rs => rs.map(r => r.id === id ? { ...r, [k]: v } : r));
  return (
    <div className="panel">
      <div className="panel-head"><b>{t('เป้าหมายรายสัปดาห์ตั้งต้น')}</b> <span className="muted">— {t('แก้ไข min/full/น้ำหนักแล้วกดบันทึก')}</span></div>
      <table><thead><tr><th>Type</th><th>{t('ชื่อ')}</th><th>Min</th><th>Full</th><th>{t('หน่วย')}</th><th>{t('น้ำหนัก %')}</th><th></th></tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.id}>
            <td><b>{r.target_type}</b></td><td>{r.target_name}</td>
            <td><input value={r.minimum_target} onChange={e => upd(r.id, 'minimum_target', e.target.value)} style={{ width: 70 }} /></td>
            <td><input value={r.full_target} onChange={e => upd(r.id, 'full_target', e.target.value)} style={{ width: 70 }} /></td>
            <td className="muted">{r.measurement_unit}</td>
            <td><input value={r.weight_percentage} onChange={e => upd(r.id, 'weight_percentage', e.target.value)} style={{ width: 60 }} /></td>
            <td><button className="btn sm" onClick={() => save(r)}>{t('บันทึก')}</button></td>
          </tr>))}</tbody>
      </table>
      <div className="row" style={{ padding: 12, gap: 8 }}>
        <input placeholder="target_type" value={f.target_type} onChange={e => set('target_type', e.target.value)} style={{ maxWidth: 140 }} />
        <input placeholder={t('ชื่อ')} value={f.target_name} onChange={e => set('target_name', e.target.value)} />
        <input placeholder="Min" value={f.minimum_target} onChange={e => set('minimum_target', e.target.value)} style={{ maxWidth: 80 }} />
        <input placeholder="Full" value={f.full_target} onChange={e => set('full_target', e.target.value)} style={{ maxWidth: 80 }} />
        <input placeholder={t('หน่วย')} value={f.measurement_unit} onChange={e => set('measurement_unit', e.target.value)} style={{ maxWidth: 100 }} />
        <input placeholder={t('น้ำหนัก %')} value={f.weight_percentage} onChange={e => set('weight_percentage', e.target.value)} style={{ maxWidth: 90 }} />
        <button className="btn green" onClick={add}>{t('+ เพิ่ม')}</button>
      </div>
      {err && <div className="err" style={{ margin: '0 12px 12px' }}>{err}</div>}
    </div>
  );
}

function Markets({ t }) {
  const [rows, setRows] = useState([]);
  useEffect(() => { api('/markets').then(d => setRows(d.rows)).catch(() => {}); }, []);
  return (
    <div className="panel">
      <div className="panel-head"><b>{t('ตลาด/ประเทศ')}</b> <span className="muted">— {t('มาตรฐาน ISO 3166-1 alpha-3 + WW')}</span></div>
      <table><thead><tr><th>Code</th><th>{t('ประเทศ')}</th><th>{t('ภาษาไทย')}</th><th>Region</th><th>Currency</th><th>Time Zone</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.id}><td><b>{r.market_code}</b></td><td>{r.country_name}</td><td>{r.country_name_th}</td><td className="muted">{r.region}</td><td>{r.currency}</td><td className="muted">{r.time_zone}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
