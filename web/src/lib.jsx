import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
export const STAGES_FALLBACK = [];
export const DIR = { inbound: ['ติดต่อมา', 'green'], outbound: ['ติดต่อกลับ', 'blue'], research: ['เตรียมข้อมูล', 'orange'] };
export const LIFE = { target: ['เป้าหมาย', 'gray'], new: ['ใหม่', 'green'], regular: ['ประจำ', 'blue'], lapsed: ['ห่างหาย', 'red'] };
export const stars = (n) => '★'.repeat(n || 0) + '☆'.repeat(5 - (n || 0));
export function Stars({ n }) { return <span className="star">{'★'.repeat(n || 0)}<span style={{ color: '#ddd' }}>{'★'.repeat(5 - (n || 0))}</span></span>; }
export const today = () => new Date().toISOString().slice(0, 10);
export const nowT = () => new Date().toTimeString().slice(0, 5);

// รูปที่กดแล้วขยายเต็มจอ — ใช้ portal ไป body เพื่อไม่ให้ติดกรอบ backdrop-filter/overflow
export function Img({ src, h = 70, style }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open]);
  if (!src) return null;
  return (
    <>
      <img src={src} alt="" onClick={() => setOpen(true)}
        style={{ maxHeight: h, borderRadius: 8, cursor: 'zoom-in', display: 'block', ...style }} />
      {open && createPortal(
        <div onClick={() => setOpen(false)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10,12,28,.92)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <img src={src} alt="" onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '82vh', objectFit: 'contain', borderRadius: 12 }} />
          <button type="button" aria-label="close" onClick={() => setOpen(false)}
            style={{ position: 'fixed', top: 14, right: 14, width: 46, height: 46, borderRadius: '50%', border: 'none',
              background: 'rgba(255,255,255,.2)', color: '#fff', fontSize: 28, lineHeight: 1, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>×</button>
        </div>,
        document.body
      )}
    </>
  );
}
