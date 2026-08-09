import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { Img } from '../lib.jsx';
function getGeo() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}
function readImg(e) {
  return new Promise(resolve => {
    const file = e.target.files[0]; if (!file) { resolve(null); return; }
    const r = new FileReader();
    r.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const max = 1280; let w = img.width, h = img.height;
        if (w > max || h > max) { const sc = Math.min(max / w, max / h); w = Math.round(w * sc); h = Math.round(h * sc); }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => resolve(ev.target.result);
      img.src = ev.target.result;
    };
    r.readAsDataURL(file);
  });
}
const p2 = n => String(n).padStart(2, '0');
const dPart = iso => { const d = new Date(iso); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
const tPart = iso => { const d = new Date(iso); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
const mkISO = (dt, tm) => (dt && tm) ? new Date(`${dt}T${tm}`).toISOString() : null;
const fmtDT = iso => iso ? new Date(iso).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
const fmtT = iso => iso ? new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '';
const durTxt = (a, b) => {
  if (!a) return '-';
  const m = Math.max(0, Math.floor(((b ? new Date(b) : new Date()) - new Date(a)) / 60000));
  return (m >= 60 ? Math.floor(m / 60) + ' ชม. ' : '') + (m % 60) + ' นาที';
};
const mapUrl = (lat, lng) => (lat != null && lng != null) ? `https://www.google.com/maps?q=${lat},${lng}` : null;
export default function Checkin() {
  const { t } = useI18n();
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [mode, setMode] = useState('in');
  const [openList, setOpenList] = useState([]);
  const [outId, setOutId] = useState('');
  const [history, setHistory] = useState([]);
  const [cid, setCid] = useState('');
  const [agentQ, setAgentQ] = useState('');
  const [agentOpen, setAgentOpen] = useState(false);
  const [contact, setContact] = useState('');
  const [atOffice, setAtOffice] = useState(false);
  const [pid, setPid] = useState('');
  const [note, setNote] = useState('');
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [, tick] = useState(0);
  // เช็คอินย้อนหลัง
  const [backIn, setBackIn] = useState(false);
  const [inD, setInD] = useState(dPart(new Date())); const [inT, setInT] = useState(tPart(new Date()));
  // เช็คเอาท์ย้อนหลัง
  const [backOut, setBackOut] = useState(false);
  const [outNote, setOutNote] = useState('');
  const [outD, setOutD] = useState(dPart(new Date())); const [outT, setOutT] = useState(tPart(new Date()));
  // แก้ไขรายการเก่า
  const [edit, setEdit] = useState(null);
  async function delCheckin(id) {
    if (!confirm(t('ลบเช็คอินนี้?'))) return;
    try { await api('/checkins/' + id, { method: 'DELETE' }); loadAll(); }
    catch (e) { setMsg(e.message || 'error'); }
  }
  function loadAll() {
    api('/checkins/open').then(d => {
      const rows = d.rows || [];
      setOpenList(rows);
      setOutId(prev => (rows.some(r => String(r.id) === String(prev)) ? prev : (rows[0] ? rows[0].id : '')));
    }).catch(() => {});
    api('/checkins', { params: { mine: 1 } }).then(d => setHistory(d.rows || [])).catch(() => {});
  }
  useEffect(() => {
    api('/customers', { params: { limit: 5000 } }).then(d => setCustomers(d.rows || [])).catch(() => {});
    api('/projects', { params: { limit: 2000 } }).then(d => setProjects(d.rows || [])).catch(() => {});
    loadAll();
    const id = setInterval(() => tick(x => x + 1), 30000);
    return () => clearInterval(id);
  }, []);
  async function checkIn() {
    if (!atOffice) {
      if (!cid) { setMsg(t('เลือกเอเจ้นท์ก่อน')); return; }
      if (!contact) { setMsg('Please select a contact method'); return; }
    }
    setBusy(true); setMsg(backIn ? '' : t('กำลังขอตำแหน่ง...'));
    const g = backIn ? null : await getGeo();
    try {
      await api('/checkins', { method: 'POST', body: {
        customer_id: atOffice ? null : cid, project_id: atOffice ? null : (pid || null),
        contact_method: atOffice ? 'Office' : contact, note, image_url: image,
        check_in_at: backIn ? mkISO(inD, inT) : null,
        lat: g && g.lat, lng: g && g.lng,
      } });
      setNote(''); setCid(''); setPid(''); setContact(''); setAgentQ(''); setAtOffice(false); setImage(null); setBackIn(false); setMsg('');
      loadAll();
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }
  async function checkOut() {
    if (!outId) { setMsg(t('เลือกรายการที่จะเช็คเอาท์')); return; }
    setBusy(true); setMsg(backOut ? '' : t('กำลังขอตำแหน่ง...'));
    const g = backOut ? null : await getGeo();
    try {
      await api('/checkins/' + outId + '/checkout', { method: 'PUT', body: {
        check_out_at: backOut ? mkISO(outD, outT) : null, lat: g && g.lat, lng: g && g.lng,
        checkout_note: outNote,
      } });
      setBackOut(false); setOutNote(''); setMsg(''); loadAll();
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }
  const sel = openList.find(x => String(x.id) === String(outId)) || null;
  return (
    <div>
      <h1 className="page">{t('เช็คอินเอเจ้นท์')} 📍</h1>
      <div className="page-sub">{t('เช็คอินตอนถึงเอเจ้นท์ แล้วเช็คเอาท์ตอนออก — บันทึกเวลาและพิกัดอัตโนมัติ')}</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div className={'dirbtn' + (mode === 'in' ? ' on' : '')} onClick={() => { setMode('in'); setMsg(''); }}>📍 {t('เช็คอิน')}</div>
        <div className={'dirbtn' + (mode === 'out' ? ' on' : '')} onClick={() => { setMode('out'); setMsg(''); }}>
          🔴 {t('เช็คเอาท์')}{openList.length ? ` (${openList.length})` : ''}
        </div>
      </div>
      {mode === 'out' ? (
        openList.length ? (
          <div className="card">
            <label>{t('เลือกรายการที่จะเช็คเอาท์')}</label>
            <select value={outId} onChange={e => setOutId(e.target.value)}>
              {openList.map(o => <option key={o.id} value={o.id}>{o.customer_name} — {fmtDT(o.check_in_at)}</option>)}
            </select>
            {sel && <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'var(--brand-tint)' }}>
              <div style={{ fontSize: 13, color: 'var(--brand-text)', fontWeight: 700 }}>🟢 {t('กำลังเยี่ยม')}</div>
              <div style={{ fontSize: 20, fontWeight: 800, margin: '4px 0 2px' }}>{sel.customer_name || '-'}</div>
              {sel.project_name && <div className="muted">📁 {sel.project_name}</div>}
              <div className="muted">{t('เช็คอินเมื่อ')} {fmtDT(sel.check_in_at)} · {t('ผ่านไป')} {durTxt(sel.check_in_at)}</div>
              {sel.image_url && <div style={{ marginTop: 8 }}><Img src={sel.image_url} h={100} /></div>}
              {mapUrl(sel.check_in_lat, sel.check_in_lng) &&
                <div style={{ marginTop: 6 }}><a href={mapUrl(sel.check_in_lat, sel.check_in_lng)} target="_blank" rel="noreferrer">📍 {t('ดูตำแหน่งเช็คอินบนแผนที่')}</a></div>}
            </div>}
            <label style={{ marginTop: 12, display: 'block' }}>{t('รายละเอียด / สรุปการเข้าพบ')}</label>
            <textarea rows="3" value={outNote} onChange={e => setOutNote(e.target.value)} placeholder={t('เช่น คุยแพ็กเกจ 4 เกาะ ราคา 120,000 รอเอเจ้นท์ยืนยันสัปดาห์หน้า')} />
            <label style={{ display: 'block', marginTop: 12 }}>
              <input type="checkbox" style={{ width: 'auto', marginRight: 6 }} checked={backOut} onChange={e => setBackOut(e.target.checked)} />
              {t('ระบุเวลาเช็คเอาท์เอง (ย้อนหลัง)')}
            </label>
            {backOut && <div className="row" style={{ marginTop: 6 }}>
              <div><label>{t('วันที่ออก')}</label><input type="date" value={outD} onChange={e => setOutD(e.target.value)} /></div>
              <div><label>{t('เวลาออก')}</label><input type="time" value={outT} onChange={e => setOutT(e.target.value)} /></div>
            </div>}
            <button className="btn" style={{ width: '100%', marginTop: 14, padding: 14, fontSize: 16, background: 'var(--red)' }} disabled={busy} onClick={checkOut}>{busy ? '...' : t('เช็คเอาท์')}</button>
          </div>
        ) : (
          <div className="card"><div className="muted">{t('ไม่มีรายการที่ค้างเช็คเอาท์')}</div></div>
        )
      ) : (
        <div className="card">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div className={'dirbtn' + (!atOffice ? ' on' : '')} onClick={() => { setAtOffice(false); setMsg(''); }} style={{ flex: 1, textAlign: 'center' }}>🧑‍💼 {t('เยี่ยมเอเจ้นท์')}</div>
            <div className={'dirbtn' + (atOffice ? ' on' : '')} onClick={() => { setAtOffice(true); setMsg(''); }} style={{ flex: 1, textAlign: 'center' }}>🏢 {t('ทำงานที่ออฟฟิศ')}</div>
          </div>
          {atOffice && <div style={{ padding: 12, borderRadius: 12, background: 'var(--brand-tint)', fontSize: 13, color: 'var(--brand-text)', fontWeight: 600, marginBottom: 4 }}>🏢 {t('เช็คอินเข้าออฟฟิศ — ไม่ต้องเลือกเอเจ้นท์ บันทึกเวลาและพิกัดของออฟฟิศ')}</div>}
          {!atOffice && <>
          <label>{t('เลือกเอเจ้นท์')}</label>
          <div style={{ position: 'relative' }}>
            <input type="text" value={agentQ} placeholder={t('พิมพ์ชื่อ/รหัสเพื่อค้นหา หรือแตะเพื่อเลือก...')}
              onChange={e => { setAgentQ(e.target.value); setAgentOpen(true); if (!e.target.value) setCid(''); }}
              onFocus={() => setAgentOpen(true)} onBlur={() => setTimeout(() => setAgentOpen(false), 160)} />
            {agentOpen && (() => {
              const q = agentQ.trim().toLowerCase();
              const all = customers.filter(c => !q || (c.name || '').toLowerCase().includes(q) || String(c.code || '').toLowerCase().includes(q));
              const matches = all.slice(0, 800);
              return <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 40, background: '#fff', border: '1px solid var(--glass-border)', borderRadius: 12, marginTop: 4, maxHeight: 320, overflowY: 'auto', boxShadow: '0 12px 32px rgba(0,0,0,.14)' }}>
                <div style={{ padding: '6px 12px', fontSize: 11.5, color: 'var(--muted)', borderBottom: '1px solid #F0EEF1', position: 'sticky', top: 0, background: '#fff' }}>{all.length} {t('เอเจ้นท์')}{q ? '' : ' — ' + t('พิมพ์เพื่อค้นหา')}</div>
                {matches.length ? matches.map(c => (
                  <div key={c.id} onMouseDown={() => { setCid(String(c.id)); setAgentQ(c.name); setAgentOpen(false); }}
                    style={{ padding: '10px 12px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #F3F1F5', background: String(cid) === String(c.id) ? 'var(--brand-tint)' : '#fff' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F6F6F8'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = String(cid) === String(c.id) ? 'var(--brand-tint)' : '#fff'; }}>
                    {c.name}{c.code ? <span style={{ color: 'var(--muted)', marginLeft: 6, fontSize: 12 }}>· {c.code}</span> : null}
                  </div>
                )) : <div style={{ padding: '11px 12px', color: 'var(--muted)', fontSize: 13 }}>{t('ไม่พบเอเจ้นท์ที่ตรงกับคำค้น')}</div>}
              </div>;
            })()}
          </div>
          <label style={{ marginTop: 10, display: 'block' }}>Contact method <span style={{ color: '#F2637E' }}>*</span></label>
          <select value={contact} onChange={e => setContact(e.target.value)}><option value="">- select method -</option><option value="Tel">Tel</option><option value="Visit">Visit</option><option value="E-mail">E-mail</option><option value="Meet Online">Meet Online</option></select>
          </>}
          <label style={{ marginTop: 10, display: 'block' }}>{t('หมายเหตุ')}</label>
          <textarea rows="2" value={note} onChange={e => setNote(e.target.value)} placeholder={t('เช่น นัดคุยเรื่องแพ็กเกจทัวร์')} />
          <label style={{ marginTop: 10, display: 'block' }}>{t('รูปถ่ายหน้างาน')} ({t('ถ้ามี')})</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <label className="filebtn"><input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { setImage(await readImg(e)); e.target.value = ''; }} /><span>🖼 {t('เลือกรูป')}</span></label>
            <label className="filebtn"><input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={async e => { setImage(await readImg(e)); e.target.value = ''; }} /><span>📷 {t('ถ่ายรูป')}</span></label>
          </div>
          {image && <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}><Img src={image} h={90} /><span onClick={() => setImage(null)} style={{ position: 'absolute', top: -8, right: -8, background: '#F2637E', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>×</span></div>}
          <label style={{ display: 'block', marginTop: 12 }}>
            <input type="checkbox" style={{ width: 'auto', marginRight: 6 }} checked={backIn} onChange={e => setBackIn(e.target.checked)} />
            {t('เช็คอินย้อนหลัง (ระบุเวลาเอง)')}
          </label>
          {backIn && <div className="row" style={{ marginTop: 6 }}>
            <div><label>{t('วันที่เข้า')}</label><input type="date" value={inD} onChange={e => setInD(e.target.value)} /></div>
            <div><label>{t('เวลาเข้า')}</label><input type="time" value={inT} onChange={e => setInT(e.target.value)} /></div>
          </div>}
          <button className="btn" style={{ width: '100%', marginTop: 14, padding: 14, fontSize: 16 }} disabled={busy} onClick={checkIn}>{busy ? '...' : '📍 ' + t('เช็คอิน')}</button>
        </div>
      )}
      {msg && <div className="muted" style={{ marginTop: 8 }}>{msg}</div>}
      <h3 style={{ margin: '22px 0 10px' }}>{t('ประวัติเช็คอิน')}</h3>
      <div className="panel">
        <table>
          <thead><tr><th>{t('เอเจ้นท์')}</th><th>{t('กลุ่มเป้าหมาย')}</th><th>{t('เช็คอิน')}</th><th>{t('เช็คเอาท์')}</th><th>{t('ระยะเวลา')}</th><th>{t('รูป')}</th><th>{t('แผนที่')}</th><th></th></tr></thead>
          <tbody>
            {history.length ? history.map(h => (
              <tr key={h.id}>
                <td><b>{h.customer_name || (h.contact_method === 'Office' ? '🏢 ' + t('ทำงานที่ออฟฟิศ') : '-')}</b><div className="muted">{h.user_name}</div></td>
                <td className="muted">{h.project_name || '-'}{h.checkout_note && <div style={{ fontSize: 12, marginTop: 2 }}>📝 {h.checkout_note}</div>}</td>
                <td>{fmtDT(h.check_in_at)}</td>
                <td>{h.check_out_at ? fmtT(h.check_out_at) : <span className="pill orange">{t('ยังไม่ออก')}</span>}</td>
                <td>{durTxt(h.check_in_at, h.check_out_at)}</td>
                <td>{h.image_url ? <Img src={h.image_url} h={38} /> : '-'}</td>
                <td>{mapUrl(h.check_in_lat, h.check_in_lng) ? <a href={mapUrl(h.check_in_lat, h.check_in_lng)} target="_blank" rel="noreferrer">📍</a> : '-'}</td>
                <td style={{ whiteSpace: 'nowrap' }}><a onClick={() => setEdit(h)}>{t('แก้ไข')}</a> <a onClick={() => delCheckin(h.id)} style={{ color: 'var(--red-text)', marginLeft: 8 }}>{t('ลบ')}</a></td>
              </tr>
            )) : <tr><td colSpan="8" className="muted">{t('ยังไม่มีประวัติ')}</td></tr>}
          </tbody>
        </table>
      </div>
      {edit && <EditModal row={edit} projects={projects} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); loadAll(); }} />}
    </div>
  );
}
function EditModal({ row, projects, onClose, onSaved }) {
  const { t } = useI18n();
  const [inD, setInD] = useState(dPart(row.check_in_at)); const [inT, setInT] = useState(tPart(row.check_in_at));
  const [hasOut, setHasOut] = useState(!!row.check_out_at);
  const [outD, setOutD] = useState(dPart(row.check_out_at || row.check_in_at));
  const [outT, setOutT] = useState(tPart(row.check_out_at || row.check_in_at));
  const [pid, setPid] = useState(row.project_id || '');
  const [contact, setContact] = useState(row.contact_method || '');
  const [note, setNote] = useState(row.note || '');
  const [outNote, setOutNote] = useState(row.checkout_note || '');
  const [image, setImage] = useState(row.image_url || null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  async function save() {
    setBusy(true); setErr('');
    try {
      await api('/checkins/' + row.id, { method: 'PUT', body: {
        check_in_at: mkISO(inD, inT),
        check_out_at: hasOut ? mkISO(outD, outT) : null,
        project_id: pid || null, contact_method: contact, note, image_url: image, checkout_note: outNote,
      } });
      onSaved();
    } catch (e) { setErr(e.message); setBusy(false); }
  }
  return (
    <div className="modal-bg" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <h3 style={{ margin: 0 }}>{t('แก้ไขการเช็คอิน')} — {row.customer_name}</h3>
        <button type="button" aria-label="close" onClick={onClose}
          style={{ background: 'none', border: 'none', fontSize: 30, lineHeight: 1, cursor: 'pointer', color: 'var(--muted)', padding: '0 4px' }}>×</button>
      </div>
      <div className="row">
        <div><label>{t('วันที่เข้า')}</label><input type="date" value={inD} onChange={e => setInD(e.target.value)} /></div>
        <div><label>{t('เวลาเข้า')}</label><input type="time" value={inT} onChange={e => setInT(e.target.value)} /></div>
      </div>
      <label style={{ display: 'block', marginTop: 10 }}>
        <input type="checkbox" style={{ width: 'auto', marginRight: 6 }} checked={hasOut} onChange={e => setHasOut(e.target.checked)} />
        {t('มีเวลาเช็คเอาท์')}
      </label>
      {hasOut && <div className="row" style={{ marginTop: 6 }}>
        <div><label>{t('วันที่ออก')}</label><input type="date" value={outD} onChange={e => setOutD(e.target.value)} /></div>
        <div><label>{t('เวลาออก')}</label><input type="time" value={outT} onChange={e => setOutT(e.target.value)} /></div>
      </div>}
      <label style={{ marginTop: 10, display: 'block' }}>Contact method <span style={{ color: '#F2637E' }}>*</span></label>
      <select value={contact} onChange={e => setContact(e.target.value)}><option value="">- select method -</option><option value="Tel">Tel</option><option value="Visit">Visit</option><option value="E-mail">E-mail</option><option value="Meet Online">Meet Online</option></select>
      <label style={{ marginTop: 10, display: 'block' }}>{t('หมายเหตุ')} ({t('ตอนเช็คอิน')})</label>
      <textarea rows="2" value={note} onChange={e => setNote(e.target.value)} />
      <label style={{ marginTop: 10, display: 'block' }}>{t('รายละเอียด / สรุปการเข้าพบ')}</label>
      <textarea rows="3" value={outNote} onChange={e => setOutNote(e.target.value)} />
      <label style={{ marginTop: 10, display: 'block' }}>{t('รูปถ่ายหน้างาน')}</label>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <label className="filebtn"><input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { setImage(await readImg(e)); e.target.value = ''; }} /><span>🖼 {t('เลือกรูป')}</span></label>
        <label className="filebtn"><input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={async e => { setImage(await readImg(e)); e.target.value = ''; }} /><span>📷 {t('ถ่ายรูป')}</span></label>
      </div>
      {image && <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}><Img src={image} h={100} /><span onClick={() => setImage(null)} style={{ position: 'absolute', top: -8, right: -8, background: '#F2637E', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>×</span></div>}
      {err && <div className="err">{err}</div>}
      <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
        <button className="btn ghost" onClick={onClose}>{t('ยกเลิก')}</button>
        <button className="btn" disabled={busy} onClick={save}>{busy ? '...' : t('บันทึก')}</button>
      </div>
    </div></div>
  );
}
