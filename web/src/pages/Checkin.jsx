import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';

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
  const [active, setActive] = useState(null);
  const [history, setHistory] = useState([]);
  const [cid, setCid] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [, tick] = useState(0);

  function loadAll() {
    api('/checkins/active').then(setActive).catch(() => {});
    api('/checkins', { params: { mine: 1 } }).then(d => setHistory(d.rows || [])).catch(() => {});
  }
  useEffect(() => {
    api('/customers', { params: { limit: 300 } }).then(d => setCustomers(d.rows || [])).catch(() => {});
    loadAll();
    const id = setInterval(() => tick(x => x + 1), 30000);
    return () => clearInterval(id);
  }, []);

  async function checkIn() {
    if (!cid) { setMsg(t('เลือกลูกค้าก่อน')); return; }
    setBusy(true); setMsg(t('กำลังขอตำแหน่ง...'));
    const g = await getGeo();
    try {
      await api('/checkins', { method: 'POST', body: { customer_id: cid, lat: g && g.lat, lng: g && g.lng, note } });
      setNote(''); setCid(''); setMsg(g ? '' : t('เช็คอินสำเร็จ (ไม่ได้พิกัด)'));
      loadAll();
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }
  async function checkOut() {
    setBusy(true); setMsg(t('กำลังขอตำแหน่ง...'));
    const g = await getGeo();
    try {
      await api('/checkins/' + active.id + '/checkout', { method: 'PUT', body: { lat: g && g.lat, lng: g && g.lng } });
      setMsg(''); loadAll();
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }

  return (
    <div>
      <h1 className="page">{t('เช็คอินลูกค้า')} 📍</h1>
      <div className="page-sub">{t('เช็คอินตอนถึงลูกค้า แล้วเช็คเอาท์ตอนออก — บันทึกเวลาและพิกัดอัตโนมัติ')}</div>

      {active ? (
        <div className="card" style={{ background: 'var(--brand-tint)', border: '1px solid var(--brand)' }}>
          <div style={{ fontSize: 13, color: 'var(--brand-text)', fontWeight: 700 }}>🟢 {t('กำลังเยี่ยม')}</div>
          <div style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 2px' }}>{active.customer_name || '-'}</div>
          <div className="muted">{t('เช็คอินเมื่อ')} {fmtDT(active.check_in_at)} · {t('ผ่านไป')} {durTxt(active.check_in_at)}</div>
          {mapUrl(active.check_in_lat, active.check_in_lng) &&
            <div style={{ marginTop: 6 }}><a href={mapUrl(active.check_in_lat, active.check_in_lng)} target="_blank" rel="noreferrer">📍 {t('ดูตำแหน่งเช็คอินบนแผนที่')}</a></div>}
          <button className="btn" style={{ width: '100%', marginTop: 14, padding: 14, fontSize: 16, background: 'var(--red)' }} disabled={busy} onClick={checkOut}>{busy ? '...' : t('เช็คเอาท์')}</button>
        </div>
      ) : (
        <div className="card">
          <label>{t('เลือกลูกค้า')}</label>
          <select value={cid} onChange={e => setCid(e.target.value)}>
            <option value="">{t('- เลือกลูกค้า -')}</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label style={{ marginTop: 10, display: 'block' }}>{t('หมายเหตุ')}</label>
          <textarea rows="2" value={note} onChange={e => setNote(e.target.value)} placeholder={t('เช่น นัดคุยเรื่องแพ็กเกจทัวร์')} />
          <button className="btn" style={{ width: '100%', marginTop: 14, padding: 14, fontSize: 16 }} disabled={busy} onClick={checkIn}>{busy ? '...' : '📍 ' + t('เช็คอิน')}</button>
        </div>
      )}
      {msg && <div className="muted" style={{ marginTop: 8 }}>{msg}</div>}

      <h3 style={{ margin: '22px 0 10px' }}>{t('ประวัติเช็คอิน')}</h3>
      <div className="panel">
        <table>
          <thead><tr><th>{t('ลูกค้า')}</th><th>{t('เช็คอิน')}</th><th>{t('เช็คเอาท์')}</th><th>{t('ระยะเวลา')}</th><th>{t('แผนที่')}</th></tr></thead>
          <tbody>
            {history.length ? history.map(h => (
              <tr key={h.id}>
                <td><b>{h.customer_name || '-'}</b><div className="muted">{h.user_name}</div></td>
                <td>{fmtDT(h.check_in_at)}</td>
                <td>{h.check_out_at ? fmtT(h.check_out_at) : <span className="pill orange">{t('ยังไม่ออก')}</span>}</td>
                <td>{durTxt(h.check_in_at, h.check_out_at)}</td>
                <td>{mapUrl(h.check_in_lat, h.check_in_lng) ? <a href={mapUrl(h.check_in_lat, h.check_in_lng)} target="_blank" rel="noreferrer">📍</a> : '-'}</td>
              </tr>
            )) : <tr><td colSpan="5" className="muted">{t('ยังไม่มีประวัติ')}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
