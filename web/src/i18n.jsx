import { createContext, useContext, useState, useCallback } from 'react';

/* English dictionary keyed by the Thai source string.
   Thai mode returns the key itself (fallback), English mode returns the mapping. */
const EN = {
  // nav / chrome
  'เมนูหลัก': 'Main', 'เอกสาร & รายงาน': 'Documents & Reports',
  'แผงบริหาร': 'Dashboard', 'งานติดตาม': 'Activities', 'เอเจ้นท์': 'Agents', 'กลุ่มเป้าหมาย': 'Target groups',
  'สัญญา': 'Contracts', 'ใบสั่งขาย': 'Sale Orders', 'รายงาน': 'Reports', 'ตั้งค่า': 'Settings',
  'บริษัท เลิฟ ไอแลนด์ จำกัด': 'Love Andaman Co., Ltd.', 'ออกจากระบบ': 'Log out',
  'เกินกำหนด': 'Overdue', 'วันนี้': 'Today', 'ไม่มีงานแจ้งเตือน': 'No notifications',
  'กำลังโหลด...': 'Loading...',
  // login
  'ระบบบริหารงานขาย (Sales CRM)': 'Sales CRM', 'อีเมล': 'Email', 'รหัสผ่าน': 'Password',
  'เข้าสู่ระบบ': 'Sign in', 'ทดลอง: admin@loveandaman.com / password': 'Demo: admin@loveandaman.com / password',
  // dashboard
  'ภาพรวมการขายแบบเรียลไทม์': 'Real-time sales overview',
  'เอเจ้นท์ทั้งหมด': 'Total agents', 'มูลค่าไปป์ไลน์': 'Pipeline value', 'ปิดการขายแล้ว': 'Closed won',
  'งานติดตามค้าง': 'Pending activities', 'ยอดตามเดือน': 'Monthly value', 'มูลค่ากลุ่มเป้าหมาย': 'Target group value',
  'Top ผู้ทำยอด': 'Top performers', 'ไปป์ไลน์การขาย': 'Sales pipeline', 'งานติดตามล่าสุด': 'Recent activities',
  'ดูทั้งหมด →': 'View all →', 'ยังไม่มีข้อมูล': 'No data yet', 'ยังไม่มีข้อมูลยอดขาย': 'No sales data yet',
  'ยังไม่มีกลุ่มเป้าหมายในไปป์ไลน์': 'No target groups in pipeline', 'ยังไม่มีงานติดตาม': 'No activities yet',
  'รายละเอียด': 'Detail', 'กำหนด': 'Due', 'ผู้รับผิดชอบ': 'Owner', 'สถานะ': 'Status',
  'ปีนี้': 'This year', 'ไตรมาสนี้': 'This quarter', 'เดือนนี้': 'This month', 'ทั้งหมด': 'All time',
  'ช่วงเวลา': 'Period',
  // period-aware subs
  'รอดำเนินการ': 'Pending', 'เสร็จ': 'Done', 'เสร็จสิ้น': 'Completed', 'รอ': 'Pending',
  // lifecycle / direction / status labels
  'เป้าหมาย': 'Target', 'ใหม่': 'New', 'ประจำ': 'Regular', 'ห่างหาย': 'Lapsed',
  'ขาเข้า': 'Inbound', 'ขาออก': 'Outbound', 'หาข้อมูล': 'Research',
  'ร่าง': 'Draft', 'ส่งแล้ว': 'Sent', 'ตอบรับ': 'Accepted', 'ปฏิเสธ': 'Rejected',
  'เปิด': 'Open', 'วางบิล': 'Invoiced', 'ชำระแล้ว': 'Paid', 'ยกเลิก': 'Cancelled', 'หลัก': 'Primary',
  // priority
  'ต่ำ': 'Low', 'ปานกลาง': 'Medium', 'สูง': 'High', 'สูงมาก': 'Very high', 'ด่วนที่สุด': 'Urgent',
  // metrics
  'เอเจ้นท์ใหม่': 'New agents', 'โอกาส': 'Opportunities', 'ยอดขาย': 'Sales', 'กำไร': 'Profit',
  'เป้าหมายวันนี้': "Today's targets",
  // toolbar / filters
  'ค้นหา ชื่อ/ผู้ติดต่อ/เลขภาษี': 'Search name / contact / tax id',
  'ค้นหา รายละเอียด/เอเจ้นท์/กลุ่มเป้าหมาย': 'Search detail / agent / target group',
  'ค้นหา รหัส/ชื่อกลุ่มเป้าหมาย': 'Search code / target group name',
  'สถานะ: ทั้งหมด': 'Status: all', 'ทีม: ทั้งหมด': 'Team: all', 'ผู้รับผิดชอบ: ทั้งหมด': 'Owner: all',
  'แท็ก: ทั้งหมด': 'Tag: all', 'ความสำคัญ: ทั้งหมด': 'Priority: all', 'ประเภท: ทั้งหมด': 'Type: all',
  'เอเจ้นท์: ทั้งหมด': 'Agent: all',
  'เรียง: กำหนดเวลา': 'Sort: due date', 'เรียง: ความสำคัญ': 'Sort: priority',
  // customers page
  'รายการเอเจ้นท์': 'Agent list', 'ลำดับเอเจ้นท์': 'Agent ranking',
  'ใหม่': 'New', 'ประจำ': 'Regular', 'ติดตามอยู่': 'Following',
  'สถานะ': 'Status', 'ชื่อเอเจ้นท์': 'Agent', 'รหัสอ้างอิง': 'Ref code', 'ผู้ติดต่อ': 'Contact',
  'สำคัญ': 'Priority', 'กิจกรรมล่าสุด': 'Last activity', 'แท็กกิจกรรม': 'Activity tags',
  'ไม่พบเอเจ้นท์': 'No agents found', '+ สร้างเอเจ้นท์': '+ New agent', 'สร้างเอเจ้นท์ใหม่': 'New agent',
  'ชื่อกิจการ *': 'Company name *', 'รหัสอ้างอิง': 'Ref code', 'เลขผู้เสียภาษี': 'Tax ID', 'เบอร์โทร': 'Phone',
  'จังหวัด': 'Province', 'ความสำคัญ': 'Priority', 'ทีม': 'Team', 'ผู้ติดต่อหลัก': 'Primary contact',
  'ชื่อ': 'Name', 'ตำแหน่ง': 'Position', 'สาขา/ที่อยู่': 'Branch / address', 'ชื่อสาขา': 'Branch name',
  'ที่อยู่': 'Address', 'แท็กเอเจ้นท์': 'Agent tags', 'ยกเลิก': 'Cancel', 'บันทึก': 'Save',
  'กรุณากรอกชื่อกิจการ': 'Please enter company name',
  // customer detail
  '← กลับรายการเอเจ้นท์': '← Back to agents', 'ข้อมูลเอเจ้นท์': 'Agent info',
  'โทร / อีเมล': 'Phone / email', 'ที่ตั้ง': 'Location', 'ผู้รับผิดชอบ / ทีม': 'Owner / team', 'แท็ก': 'Tags',
  'กลุ่มเป้าหมายของเอเจ้นท์': 'Agent target groups', 'ยังไม่มีกลุ่มเป้าหมาย': 'No target groups yet',
  'รหัส': 'Code', 'มูลค่า': 'Value', 'ยังไม่มีกิจกรรม': 'No activities yet',
  // activities
  'ประเภท': 'Type', 'ทิศทาง': 'Direction', 'วิธี': 'Method', 'แท็ก': 'Tags', 'เร็วๆนี้': 'Upcoming',
  '+ กิจกรรม': '+ Activity', 'ไม่มีงานติดตาม': 'No activities', 'แก้ไข': 'Edit', 'ลบ': 'Delete',
  'ลบกิจกรรมนี้?': 'Delete this activity?', 'แก้ไขกิจกรรม': 'Edit activity', 'สร้างบันทึกกิจกรรม': 'New activity',
  '- เลือกเอเจ้นท์ -': '- Select agent -', 'เลือกเอเจ้นท์': 'Select a agent',
  'วันที่ *': 'Date *', 'เวลา *': 'Time *', 'วิธีการติดต่อ *': 'Contact method *',
  'ประเภทงานติดตาม': 'Activity type', 'กลุ่มเป้าหมาย': 'Target group', 'สถานะกลุ่มเป้าหมาย': 'Target group stage',
  'รายละเอียดการติดต่อ': 'Contact detail', '@ แท็กเพื่อนร่วมงาน': '@ Mention teammates',
  'แท็กกิจกรรม': 'Activity tags', 'แนบรูป': 'Attach image', 'สร้างงานติดตาม': 'Create follow-up',
  'กำหนดติดตาม': 'Follow-up date', 'บันทึกและไปต่อ': 'Save and add next',
  // projects
  'มูลค่ารวม': 'Total value', 'จำนวนกลุ่มเป้าหมาย': 'Target groups', 'เปิดอยู่': 'Open',
  '+ สร้างกลุ่มเป้าหมาย': '+ New target group', 'สร้างกลุ่มเป้าหมายใหม่': 'New target group', 'ไม่มีกลุ่มเป้าหมาย': 'No target groups',
  'ชื่อกลุ่มเป้าหมาย *': 'Target group name *', 'กรอกชื่อกลุ่มเป้าหมาย': 'Enter target group name', 'ประเภทกลุ่มเป้าหมาย': 'Target group type',
  'ชื่อสถานที่': 'Place name', 'สถานะเริ่มต้น': 'Initial stage', 'วันเริ่ม': 'Start date', 'วันสิ้นสุด': 'End date',
  'บันทึกเพิ่มเติม': 'Notes', 'กิจกรรม': 'Activities', 'วันเริ่ม-สิ้นสุด': 'Start - end',
  'สถานะ (ไปป์ไลน์)': 'Stage (pipeline)', 'เลื่อน': 'Move',
  // project detail
  '← กลับรายการกลุ่มเป้าหมาย': '← Back to target groups', 'ข้อมูลกลุ่มเป้าหมาย': 'Target group info', 'ไปป์ไลน์': 'Pipeline',
  'ถอยขั้น': 'Prev stage', 'เลื่อนขั้น': 'Next stage', 'ปิดการขายแล้ว': 'Closed won', 'ประเภท': 'Type',
  'ระยะเวลา': 'Duration', 'บันทึกย่อ': 'Notes', 'เอเจ้นท์ที่เกี่ยวข้อง': 'Related agents',
  // quotations
  '+ สร้างสัญญา': '+ New contract', 'สร้างสัญญา': 'New contract', 'เลขที่': 'No.',
  'ยอดรวม': 'Total', 'วันที่': 'Date', 'ยังไม่มีสัญญา': 'No contracts yet',
  'รายการ': 'Item', 'จำนวน': 'Qty', 'ราคา/หน่วย': 'Unit price', 'เช่น แพ็กเกจ 4 เกาะ': 'e.g. 4-island package',
  'กรอกรายการและราคา': 'Enter item and price', 'ระบบคำนวณ VAT 7% อัตโนมัติ': 'VAT 7% calculated automatically',
  // sale orders
  'แปลงจากสัญญา...': 'Convert from contract...', '+ สร้างใบสั่งขาย': '+ New sale order',
  'อ้างอิงสัญญา': 'Contract ref', 'ยังไม่มีใบสั่งขาย — เลือกสัญญาด้านบนเพื่อแปลง': 'No sale orders yet — pick a contract above to convert',
  // reports
  'อัตราชนะ (Win rate)': 'Win rate', 'ดีลปิดได้': 'Deals won', 'มูลค่าปิดได้': 'Won value',
  'กลุ่มเป้าหมายตามขั้นไปป์ไลน์': 'Target groups by stage', 'ยอดตามเดือน (วันเริ่มกลุ่มเป้าหมาย)': 'Monthly value (start date)',
  'ยอดขายตามผู้รับผิดชอบ': 'Sales by owner', 'จำนวนดีล': 'Deals', 'ปิดได้ (มูลค่า)': 'Won (value)',
  'กำลังดำเนินการ': 'In progress', 'ยอดตามทีม': 'By team', 'ดีล': 'Deals',
  'งานติดตามตามพนักงาน': 'Activities by user', 'พนักงาน': 'User', 'รอ': 'Pending',
  // settings
  'ไปป์ไลน์การขาย (8 ขั้น)': 'Sales pipeline (8 stages)', 'ปิดการขาย': 'Won',
  'ทีม & ผู้ใช้งาน': 'Teams & users', 'แท็กเอเจ้นท์': 'Agent tags', '+ เพิ่มแท็ก': '+ Add tag',
  'แท็กกิจกรรม': 'Activity tags', 'ค่าตั้งต้นอื่น ๆ': 'Other defaults', 'ชื่อแท็กใหม่': 'New tag name',
  'แหล่งที่มา': 'Source', 'ประเภทเอเจ้นท์': 'Agent type', 'เกรดเอเจ้นท์': 'Agent grade', 'อื่น ๆ': 'Other',
  'วิธีการติดต่อ': 'Contact methods', 'ประเภทงานติดตาม': 'Activity types', 'ประเภทกลุ่มเป้าหมาย': 'Target group types',
  'เลือกรูป': 'Choose photo',
  'ถ่ายรูป': 'Take photo',
  'เช็คอิน': 'Check-in',
  'เช็คเอาท์': 'Check-out',
  'เช็คอินเอเจ้นท์': 'Agent check-in',
  'เช็คอินตอนถึงเอเจ้นท์ แล้วเช็คเอาท์ตอนออก — บันทึกเวลาและพิกัดอัตโนมัติ': 'Check in on arrival, check out on leaving — time and location saved automatically',
  'กำลังเยี่ยม': 'Visiting',
  'เช็คอินเมื่อ': 'Checked in at',
  'ผ่านไป': 'Elapsed',
  'ดูตำแหน่งเช็คอินบนแผนที่': 'View check-in location on map',
  'เลือกเอเจ้นท์ก่อน': 'Select a agent first',
  'กำลังขอตำแหน่ง...': 'Getting location...',
  'เช็คอินสำเร็จ (ไม่ได้พิกัด)': 'Checked in (no location)',
  'หมายเหตุ': 'Note',
  'เช่น นัดคุยเรื่องแพ็กเกจทัวร์': 'e.g. discuss tour package',
  'ประวัติเช็คอิน': 'Check-in history',
  'แผนที่': 'Map',
  'ยังไม่ออก': 'Still in',
  'ยังไม่มีประวัติ': 'No history yet',
  'กลุ่มเป้าหมายที่คุย': 'Target group discussed',
  'ถ้ามี': 'optional',
  '- ไม่ระบุ -': '- none -',
  'ติดต่อมา': 'Inbound',
  'ติดต่อกลับ': 'Outbound',
  'เตรียมข้อมูล': 'Prep / research',
  'รูปถ่ายหน้างาน': 'On-site photo',
  'รูป': 'Photo',
  'เช็คอินย้อนหลัง (ระบุเวลาเอง)': 'Backdated check-in (set time)',
  'ระบุเวลาเช็คเอาท์เอง (ย้อนหลัง)': 'Set check-out time manually',
  'วันที่เข้า': 'Check-in date',
  'เวลาเข้า': 'Check-in time',
  'วันที่ออก': 'Check-out date',
  'เวลาออก': 'Check-out time',
  'แก้ไขการเช็คอิน': 'Edit check-in',
  'มีเวลาเช็คเอาท์': 'Has check-out time',
  '- เลือกเอเจ้นท์ก่อน -': '- select agent first -',
  'ออกสัญญา': 'Contracts',
};

const Ctx = createContext({ t: (s) => s, lang: 'th', toggle: () => {} });
export const useI18n = () => useContext(Ctx);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'th');
  const t = useCallback((s) => (lang === 'en' ? (EN[s] || s) : s), [lang]);
  const toggle = useCallback(() => setLang(l => { const n = l === 'th' ? 'en' : 'th'; localStorage.setItem('lang', n); return n; }), []);
  return <Ctx.Provider value={{ t, lang, toggle }}>{children}</Ctx.Provider>;
}
