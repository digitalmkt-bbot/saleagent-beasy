export const STAGES_FALLBACK = [];
export const DIR = { inbound: ['ขาเข้า', 'green'], outbound: ['ขาออก', 'blue'], research: ['หาข้อมูล', 'orange'] };
export const LIFE = { target: ['เป้าหมาย', 'gray'], new: ['ใหม่', 'green'], regular: ['ประจำ', 'blue'], lapsed: ['ห่างหาย', 'red'] };
export const stars = (n) => '★'.repeat(n || 0) + '☆'.repeat(5 - (n || 0));
export function Stars({ n }) { return <span className="star">{'★'.repeat(n || 0)}<span style={{ color: '#ddd' }}>{'★'.repeat(5 - (n || 0))}</span></span>; }
export const today = () => new Date().toISOString().slice(0, 10);
export const nowT = () => new Date().toTimeString().slice(0, 5);
