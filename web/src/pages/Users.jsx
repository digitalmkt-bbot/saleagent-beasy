import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';

const ROLES = [['sales', 'พนักงานขาย (Sales)'], ['manager', 'ผู้จัดการ (Manager)'], ['admin', 'ผู้ดูแลระบบ (Admin)']];
const roleLabel = r => (ROLES.find(x => x[0] === r) || [r, r])[1];
const rolePill = r => r === 'admin' ? 'red' : r === 'manager' ? 'blue' : 'green';

export default function Users() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [modal, setModal] = useState(null);
  const [err, setErr] = useState('');

  function load() { api('/users').then(d => setRows(d.rows || [])).catch(e => setErr(e.message)); }
  useEffect(() => { load(); }, []);

  if (user && String(user.role).toLowerCase() !== 'admin')
    return <div><h1 className="page">{t('จัดการผู้ใช้')}</h1><div className="card"><div className="muted">{t('เฉพาะผู้ดูแลระบบ (admin) เท่านั้น')}</div></div></div>;

  async function resetPw(u) {
    const pw = prompt(t('ตั้งรหัสผ่านใหม่ให้') + ' ' + u.display_name + ' (อย่างน้อย 6 ตัว):', 'loveandaman123');
    if (!pw) return;
    try { await api('/users/' + u.id + '/password', { method: 'PUT', body: { password: pw } }); alert(t('เปลี่ยนรหัสผ่านแล้ว')); }
    catch (e) { alert(e.message); }
  }
  async function del(u) {
    if (!confirm(t('ลบผู้ใช้') + ' ' + u.display_name + ' ?')) return;
    try { await api('/users/' + u.id, { method: 'DELETE' }); load(); }
    catch (e) { alert(e.message); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div><h1 className="page">{t('จัดการผู้ใช้')} 👥</h1><div className="page-sub">{t('เพิ่ม/แก้ไข/รีเซ็ตรหัสผ่าน/ปิดใช้งาน ผู้ใช้ในระบบ')}</div></div>
        <button className="btn" onClick={() => setModal({})}>+ {t('เพิ่มผู้ใช้')}</button>
      </div>
      {err && <div className="err">{err}</div>}
      <div className="panel">
        <table>
          <thead><tr><th>{t('ID')}</th><th>{t('ชื่อ')}</th><th>{t('อีเมล')}</th><th>{t('โทร')}</th><th>{t('บทบาท')}</th><th>{t('สถานะ')}</th><th></th></tr></thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                <td><b>{u.user_code || ''}</b>{!u.user_code && <span className="muted">#{u.id}</span>}</td>
                <td><b>{u.display_name}</b></td>
                <td>{u.email}</td>
                <td>{u.phone || '-'}</td>
                <td><span className={'pill ' + rolePill(u.role)}>{roleLabel(u.role)}</span></td>
                <td>{u.is_active ? <span className="pill green">{t('ใช้งาน')}</span> : <span className="pill">{t('ปิด')}</span>}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <a onClick={() => setModal(u)}>{t('แก้ไข')}</a>{' · '}
                  <a onClick={() => resetPw(u)}>{t('รีเซ็ตรหัส')}</a>{u.id !== user.id && <>{' · '}<a onClick={() => del(u)} style={{ color: 'var(--red-text)' }}>{t('ลบ')}</a></>}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="7" className="muted">{t('ยังไม่มีผู้ใช้')}</td></tr>}
          </tbody>
        </table>
      </div>
      {modal && <UserModal init={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </div>
  );
}

function UserModal({ init, onClose, onSaved }) {
  const { t } = useI18n();
  const edit = !!init.id;
  const [f, setF] = useState({ user_code: init.user_code || '', display_name: init.display_name || '', email: init.email || '', phone: init.phone || '', role: init.role || 'sales', password: '', is_active: init.is_active !== false });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  useEffect(() => { const on = e => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', on); return () => document.removeEventListener('keydown', on); }, [onClose]);

  async function save() {
    if (!f.display_name || !f.email) { setErr(t('ต้องมีชื่อและอีเมล')); return; }
    setBusy(true); setErr('');
    try {
      if (edit) await api('/users/' + init.id, { method: 'PUT', body: f });
      else await api('/users', { method: 'POST', body: f });
      onSaved();
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="modal-bg" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{edit ? t('แก้ไขผู้ใช้') : t('เพิ่มผู้ใช้')}</h3>
        <button type="button" aria-label="close" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 28, cursor: 'pointer', color: 'var(--muted)' }}>×</button>
      </div>
      <label>{t('รหัสผู้ใช้ (ID)')}</label><input value={f.user_code} onChange={e => set('user_code', e.target.value)} placeholder="เช่น IRIS, s01 (ถ้าเว้นว่างจะใช้เลขระบบ)" />
      <label style={{ marginTop: 8, display: 'block' }}>{t('ชื่อ')} *</label><input value={f.display_name} onChange={e => set('display_name', e.target.value)} />
      <label style={{ marginTop: 8, display: 'block' }}>{t('อีเมล')} *</label><input type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="name@loveandaman.com" />
      <div className="row" style={{ marginTop: 8 }}>
        <div><label>{t('โทร')}</label><input value={f.phone} onChange={e => set('phone', e.target.value)} /></div>
        <div><label>{t('บทบาท')}</label><select value={f.role} onChange={e => set('role', e.target.value)}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
      </div>
      {!edit && <><label style={{ marginTop: 8, display: 'block' }}>{t('รหัสผ่านตั้งต้น')}</label><input value={f.password} onChange={e => set('password', e.target.value)} placeholder="loveandaman123 (ถ้าเว้นว่างจะใช้ค่านี้)" /></>}
      {edit && <label style={{ display: 'block', marginTop: 10 }}><input type="checkbox" style={{ width: 'auto', marginRight: 6 }} checked={f.is_active} onChange={e => set('is_active', e.target.checked)} />{t('เปิดใช้งาน')}</label>}
      {err && <div className="err">{err}</div>}
      <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
        <button className="btn ghost" onClick={onClose}>{t('ยกเลิก')}</button>
        <button className="btn" disabled={busy} onClick={save}>{busy ? '...' : t('บันทึก')}</button>
      </div>
    </div></div>
  );
}
