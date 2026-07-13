import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { LIFE, Stars } from '../lib.jsx';
import { useI18n } from '../i18n.jsx';

export default function Customers() {
  const nav = useNavigate();
  const { t } = useI18n();
  const [data, setData] = useState({ rows: [], stats: {} });
  const [tab, setTab] = useState('list');
  const [f, setF] = useState({ search: '', lifecycle: '', team: '', owner: '', tag: '', priority: '' });
  const [meta, setMeta] = useState({ users: [], teams: [], tags: [] });
  const [show, setShow] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  function load() { api('/customers', { params: { ...f, sort: tab === 'rank' ? 'rank' : '', limit: 100 } }).then(setData).catch(() => {}); }
  useEffect(() => { load(); }, [f.lifecycle, f.team, f.owner, f.tag, f.priority, tab]);
  useEffect(() => { Promise.all([api('/meta/users'), api('/meta/teams'), api('/tags', { params: { scope: 'customer' } })]).then(([u, t, tg]) => setMeta({ users: u.rows, teams: t.rows, tags: tg.rows })).catch(() => {}); }, []);
  const s = data.stats || {};
  const PR = ['ต่ำ', 'ปานกลาง', 'สูง', 'สูงมาก', 'ด่วนที่สุด'];
  return (
    <div>
      <h1 className="page">{t('เอเจ้นท์')}</h1>
      <div className="tabs">
        <div className={'tab' + (tab === 'list' ? ' active' : '')} onClick={() => setTab('list')}>{t('รายการเอเจ้นท์')}</div>
        <div className={'tab' + (tab === 'rank' ? ' active' : '')} onClick={() => setTab('rank')}>{t('ลำดับเอเจ้นท์')}</div>
      </div>
      <div className="cards">
        {[['total', 'เอเจ้นท์ทั้งหมด'], ['target', 'เป้าหมาย'], ['new', 'ใหม่'], ['regular', 'ประจำ'], ['lapsed', 'ห่างหาย'], ['followed', 'ติดตามอยู่']].map(([k, l]) =>
          <div className="card" key={k}><div className="label">{t(l)}</div><div className="value">{s[k] || 0}</div></div>)}
      </div>
      <div className="toolbar">
        <input placeholder={t('ค้นหา ชื่อ/ผู้ติดต่อ/เลขภาษี')} value={f.search} onChange={e => set('search', e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
        <select value={f.lifecycle} onChange={e => set('lifecycle', e.target.value)}><option value="">{t('สถานะ: ทั้งหมด')}</option>{Object.entries(LIFE).map(([k, v]) => <option key={k} value={k}>{t(v[0])}</option>)}</select>
        <select value={f.team} onChange={e => set('team', e.target.value)}><option value="">{t('ทีม: ทั้งหมด')}</option>{meta.teams.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <select value={f.owner} onChange={e => set('owner', e.target.value)}><option value="">{t('ผู้รับผิดชอบ: ทั้งหมด')}</option>{meta.users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}</select>
        <select value={f.tag} onChange={e => set('tag', e.target.value)}><option value="">{t('แท็ก: ทั้งหมด')}</option>{meta.tags.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <select value={f.priority} onChange={e => set('priority', e.target.value)}><option value="">{t('ความสำคัญ: ทั้งหมด')}</option>{[1, 2, 3, 4, 5].map(p => <option key={p} value={p}>{t(PR[p - 1])}</option>)}</select>
        <button className="btn green" style={{ marginLeft: 'auto' }} onClick={() => setShow(true)}>{t('+ สร้างเอเจ้นท์')}</button>
      </div>
      <div className="panel">
        <table><thead><tr><th>{t('สถานะ')}</th><th>{t('ชื่อเอเจ้นท์')}</th><th>{t('รหัสอ้างอิง')}</th><th>{t('ผู้ติดต่อ')}</th><th>{t('สำคัญ')}</th><th>{t('ผู้รับผิดชอบ')}</th><th>{t('กิจกรรมล่าสุด')}</th><th>{t('แท็กกิจกรรม')}</th></tr></thead>
          <tbody>{data.rows.map(c => { const l = LIFE[c.lifecycle_stage] || ['-', 'gray']; return (
            <tr key={c.id}><td><span className={'pill ' + l[1]}>{t(l[0])}</span></td>
              <td><a onClick={() => nav('/customers/' + c.id)}><b>{c.name}</b></a></td>
              <td>{c.ref_code}</td><td>{c.primary_contact}</td><td><Stars n={c.priority_id} /></td><td>{c.owner_name}</td>
              <td>{c.last_activity_detail ? <>{c.last_activity_detail} <span className="muted">({(c.last_activity_date || '').slice(0, 10)})</span></> : <span className="muted">-</span>}</td>
              <td>{(c.last_activity_tags || []).map((x, i) => <span key={i} className="pill orange">{x}</span>)}</td></tr>); })}
            {!data.rows.length && <tr><td colSpan="8" className="muted">{t('ไม่พบเอเจ้นท์')}</td></tr>}
          </tbody></table>
      </div>
      {show && <CustomerModal meta={meta} t={t} onClose={() => setShow(false)} onSaved={() => { setShow(false); load(); }} />}
    </div>
  );
}

function CustomerModal({ meta, t, onClose, onSaved }) {
  const [f, setF] = useState({ name: '', ref_code: '', tax_id: '', phone: '', email: '', province: 'ภูเก็ต', district: 'เมือง', priority_id: 3, lifecycle_stage: 'target', owner_team_id: '', owner_user_id: '' });
  const [ct, setCt] = useState({ name: '', position: '', phone: '', email: '', chat_id: '' });
  const [br, setBr] = useState({ branch_name: 'สำนักงานใหญ่', address: '' });
  const [tagIds, setTagIds] = useState([]);
  const [err, setErr] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const toggle = id => setTagIds(x => x.includes(id) ? x.filter(y => y !== id) : [...x, id]);
  const PR = ['ต่ำ', 'ปานกลาง', 'สูง', 'สูงมาก', 'ด่วนที่สุด'];
  const LIFEK = { target: 'เป้าหมาย', new: 'ใหม่', regular: 'ประจำ', lapsed: 'ห่างหาย' };
  async function save() {
    if (!f.name) return setErr(t('กรุณากรอกชื่อกิจการ'));
    try {
      await api('/customers', { method: 'POST', body: { ...f, owner_user_id: f.owner_user_id || null, owner_team_id: f.owner_team_id || null,
        contacts: ct.name ? [{ ...ct, is_primary: true, chat_channel_id: ct.chat_id ? 1 : null }] : [], branches: br.address ? [{ ...br, province: f.province, district: f.district, is_registered: true }] : [], tag_ids: tagIds } });
      onSaved();
    } catch (e) { setErr(e.message); }
  }
  return (
    <div className="modal-bg" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
      <h3 style={{ marginTop: 0 }}>{t('สร้างเอเจ้นท์ใหม่')}</h3>
      <div className="row"><div><label>{t('ชื่อกิจการ *')}</label><input value={f.name} onChange={e => set('name', e.target.value)} /></div><div><label>{t('รหัสอ้างอิง')}</label><input value={f.ref_code} onChange={e => set('ref_code', e.target.value)} /></div></div>
      <div className="row"><div><label>{t('เลขผู้เสียภาษี')}</label><input value={f.tax_id} onChange={e => set('tax_id', e.target.value)} /></div><div><label>{t('เบอร์โทร')}</label><input value={f.phone} onChange={e => set('phone', e.target.value)} /></div><div><label>{t('อีเมล')}</label><input value={f.email} onChange={e => set('email', e.target.value)} /></div></div>
      <div className="row"><div><label>{t('จังหวัด')}</label><input value={f.province} onChange={e => set('province', e.target.value)} /></div>
        <div><label>{t('ความสำคัญ')}</label><select value={f.priority_id} onChange={e => set('priority_id', +e.target.value)}>{[1, 2, 3, 4, 5].map(p => <option key={p} value={p}>{t(PR[p - 1])}</option>)}</select></div>
        <div><label>{t('สถานะ')}</label><select value={f.lifecycle_stage} onChange={e => set('lifecycle_stage', e.target.value)}>{Object.entries(LIFEK).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}</select></div></div>
      <div className="row"><div><label>{t('ทีม')}</label><select value={f.owner_team_id} onChange={e => set('owner_team_id', e.target.value)}><option value="">-</option>{meta.teams.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
        <div><label>{t('ผู้รับผิดชอบ')}</label><select value={f.owner_user_id} onChange={e => set('owner_user_id', e.target.value)}><option value="">-</option>{meta.users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}</select></div></div>
      <h4>{t('ผู้ติดต่อหลัก')}</h4>
      <div className="row"><div><label>{t('ชื่อ')}</label><input value={ct.name} onChange={e => setCt({ ...ct, name: e.target.value })} /></div><div><label>{t('ตำแหน่ง')}</label><input value={ct.position} onChange={e => setCt({ ...ct, position: e.target.value })} /></div><div><label>{t('เบอร์โทร')}</label><input value={ct.phone} onChange={e => setCt({ ...ct, phone: e.target.value })} /></div></div>
      <h4>{t('สาขา/ที่อยู่')}</h4>
      <div className="row"><div><label>{t('ชื่อสาขา')}</label><input value={br.branch_name} onChange={e => setBr({ ...br, branch_name: e.target.value })} /></div><div><label>{t('ที่อยู่')}</label><input value={br.address} onChange={e => setBr({ ...br, address: e.target.value })} /></div></div>
      <label>{t('แท็กเอเจ้นท์')}</label><div>{meta.tags.map(x => <span key={x.id} className={'chip' + (tagIds.includes(x.id) ? ' on' : '')} onClick={() => toggle(x.id)}>{x.name}</span>)}</div>
      {err && <div className="err">{err}</div>}
      <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'flex-end' }}><button className="btn ghost" onClick={onClose}>{t('ยกเลิก')}</button><button className="btn green" onClick={save}>{t('บันทึก')}</button></div>
    </div></div>
  );
}
