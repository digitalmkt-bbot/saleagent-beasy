import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';

export default function Settings() {
  const { t } = useI18n();
  const [ctags, setCtags] = useState([]);
  const [atags, setAtags] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [stages, setStages] = useState([]);
  const [lk, setLk] = useState({});
  function load() {
    api('/tags', { params: { scope: 'customer' } }).then(r => setCtags(r.rows)).catch(() => {});
    api('/tags', { params: { scope: 'activity' } }).then(r => setAtags(r.rows)).catch(() => {});
    api('/meta/users').then(r => setUsers(r.rows)).catch(() => {});
    api('/meta/teams').then(r => setTeams(r.rows)).catch(() => {});
    api('/meta/pipeline-stages').then(r => setStages(r.rows)).catch(() => {});
    api('/meta/lookups').then(setLk).catch(() => {});
  }
  useEffect(() => { load(); }, []);
  async function addTag(scope) { const name = prompt(t('ชื่อแท็กใหม่')); if (!name) return; await api('/tags', { method: 'POST', body: { name, scope, tag_group: scope === 'customer' ? 'other' : null } }); load(); }
  const groups = ctags.reduce((a, x) => { (a[x.tag_group || 'other'] = a[x.tag_group || 'other'] || []).push(x); return a; }, {});
  const gLabel = { source: 'แหล่งที่มา', type: 'ประเภทลูกค้า', grade: 'เกรดลูกค้า', other: 'อื่น ๆ' };
  return (
    <div>
      <h1 className="page">{t('ตั้งค่า')}</h1>
      <div className="grid2">
        <div className="panel"><h3 style={{ marginTop: 0 }}>{t('ไปป์ไลน์การขาย (8 ขั้น)')}</h3><ol>{stages.map(s => <li key={s.id}>{s.name}{s.is_won && <span className="pill green" style={{ marginLeft: 8 }}>{t('ปิดการขาย')}</span>}</li>)}</ol></div>
        <div className="panel"><h3 style={{ marginTop: 0 }}>{t('ทีม & ผู้ใช้งาน')}</h3>
          {teams.map(x => <div key={x.id} style={{ marginBottom: 8 }}><b>{x.name}</b><div className="muted">{users.filter(u => u.team_id === x.id).map(u => u.display_name + ' (' + u.role + ')').join(', ')}</div></div>)}</div>
      </div>
      <div className="panel"><div style={{ display: 'flex', justifyContent: 'space-between' }}><h3 style={{ marginTop: 0 }}>{t('แท็กลูกค้า')}</h3><button className="btn ghost sm" onClick={() => addTag('customer')}>{t('+ เพิ่มแท็ก')}</button></div>
        {Object.entries(groups).map(([g, ts]) => <div key={g} style={{ marginBottom: 10 }}><div className="muted">{t(gLabel[g] || g)}</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{ts.map(x => <span key={x.id} className="pill blue">{x.name}</span>)}</div></div>)}</div>
      <div className="panel"><div style={{ display: 'flex', justifyContent: 'space-between' }}><h3 style={{ marginTop: 0 }}>{t('แท็กกิจกรรม')}</h3><button className="btn ghost sm" onClick={() => addTag('activity')}>{t('+ เพิ่มแท็ก')}</button></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{atags.map(x => <span key={x.id} className="pill orange">{x.name}</span>)}</div></div>
      <div className="panel"><h3 style={{ marginTop: 0 }}>{t('ค่าตั้งต้นอื่น ๆ')}</h3>
        <div className="muted">{t('วิธีการติดต่อ')}: {(lk.contact_method || []).map(m => m.name).join(', ')}</div>
        <div className="muted">{t('ประเภทงานติดตาม')}: {(lk.activity_types || []).join(', ')}</div>
        <div className="muted">{t('ประเภทโครงการ')}: {(lk.project_type || []).map(x => x.name).join(', ')}</div></div>
    </div>
  );
}
