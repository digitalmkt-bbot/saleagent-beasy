import { useState } from 'react';
export const STAGES_FALLBACK = [];
export const DIR = { inbound: ['ติดต่อมา', 'green'], outbound: ['ติดต่อกลับ', 'blue'], research: ['เตรียมข้อมูล', 'orange'] };
export const LIFE = { target: ['เป้าหมาย', 'gray'], new: ['ใหม่', 'green'], regular: ['ประจำ', 'blue'], lapsed: ['ห่างหาย', 'red'] };
export const stars = (n) => '★'.repeat(n || 0) + '☆'.repeat(5 - (n || 0));
export function Stars({ n }) { return <span className="star">{'★'.repeat(n || 0)}<span style={{ color: '#ddd' }}>{'★'.repeat(5 - (n || 0))}</span></span>; }
export const today = () => new Date().toISOString().slice(0, 10);
export const nowT = () => new Date().toTimeString().slice(0, 5);

// รูปที่กดแล้วขยายเต็มจอ (รองรับ base64 ที่เปิดแท็บใหม่ไม่ได้)
export function Img({ src, h = 70, style }) {
  const [open, setOpen] = useState(false);
  if (!src) return null;
  return (
    <>
      <img src={src} alt="" onClick={() => setOpen(true)}
        style={{ maxHeight: h, borderRadius: 8, cursor: 'zoom-in', display: 'block', ...style }} />
      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(12,14,32,.88)', zIndex: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <img src={src} alt="" onClick={e => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '92vh', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,.5)' }} />
          <span style={{ position: 'absolute', top: 12, right: 18, color: '#fff', fontSize: 34, lineHeight: 1, cursor: 'pointer', fontWeight: 300 }}>×</span>
        </div>
      )}
    </>
  );
}
