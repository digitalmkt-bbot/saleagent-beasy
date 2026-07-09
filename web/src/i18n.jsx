import { createContext, useContext, useState, useCallback } from 'react';

/* English dictionary keyed by the Thai source string.
   Thai mode returns the key itself (fallback), English mode returns the mapping. */
const EN = {
  // nav / chrome
  'เมนูหลัก': 'Main', 'เอกสาร & รายงาน': 'Documents & Reports',
  'แผงบริหาร': 'Dashboard', 'งานติดตาม': 'Activities', 'ลูกค้า': 'Customers', 'โครงการ': 'Projects',
  'ใบเสนอราคา': 'Quotations', 'ใบสั่งขาย': 'Sale Orders', 'รายงาน': 'Reports', 'ตั้งค่า': 'Settings',
  'บริษัท เลิฟ ไอแลนด์ จำกัด': 'Love Andaman Co., Ltd.', 'ออกจากระบบ': 'Log out',
  'เกินกำหนด': 'Overdue', 'วันนี้': 'Today', 'ไม่มีงานแจ้งเตือน': 'No notifications',
  'กำลังโหลด...': 'Loading...',
  // login
  'ระบบบริหารงานขาย (Sales CRM)': 'Sales CRM', 'อีเมล': 'Email', 'รหัสผ่าน': 'Password',
  'เข้าสู่ระบบ': 'Sign in', 'ทดลอง: admin@loveandaman.com / password': 'Demo: admin@loveandaman.com / password',
  // dashboard
  'ภาพรวมการขายแบบเรียลไทม์': 'Real-time sales overview',
  'ลูกค้าทั้งหมด': 'Total customers', 'มูลค่าไปป์ไลน์': 'Pipeline value', 'ปิดการขายแล้ว': 'Closed won',
  'งานติดตามค้าง': 'Pending activities', 'ยอดตามเดือน': 'Monthly value', 'มูลค่าโครงการ': 'Project value',
  'Top ผู้ทำยอด': 'Top performers', 'ไปป์ไลน์การขาย': 'Sales pipeline', 'งานติดตามล่าสุด': 'Recent activities',
  'ดูทั้งหมด →': 'View all →', 'ยังไม่มีข้อมูล': 'No data yet', 'ยังไม่มีข้อมูลยอดขาย': 'No sales data yet',
  'ยังไม่มีโครงการในไปป์ไลน์': 'No projects in pipeline', 'ยังไม่มีงานติดตาม': 'No activities yet',
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
  'ลูกค้าใหม่': 'New customers', 'โอกาส': 'Opportunities', 'ยอดขาย': 'Sales', 'กำไร': 'Profit',
  'เป้าหมายวันนี้': "Today's targets",
  // toolbar / filters
  'ค้นหา ชื่อ/ผู้ติดต่อ/เลขภาษี': 'Search name / contact / tax id',
  'ค้นหา รายละเอียด/ลูกค้า/โครงการ': 'Search detail / customer / project',
  'ค้นหา รหัส/ชื่อโครงการ': 'Search code / project name',
  'สถานะ: ทั้งหมด': 'Status: all', 'ทีม: ทั้งหมด': 'Team: all', 'ผู้รับผิดชอบ: ทั้งหมด': 'Owner: all',
  'แท็ก: ทั้งหมด': 'Tag: all', 'ความสำคัญ: ทั้งหมด': 'Priority: all', 'ประเภท: ทั้งหมด': 'Type: all',
  'ลูกค้า: ทั้งหมด': 'Customer: all',
  'เรียง: กำหนดเวลา': 'Sort: due date', 'เรียง: ความสำคัญ': 'Sort: priority',
  // customers page
  'รายการลูกค้า': 'Customer list', 'ลำดับลูกค้า': 'Customer ranking',
  'ใหม่': 'New', 'ประจำ': 'Regular', 'ติดตามอยู่': 'Following',
  'สถานะ': 'Status', 'ชื่อลูกค้า': 'Customer', 'รหัสอ้างอิง': 'Ref code', 'ผู้ติดต่อ': 'Contact',
  'สำคัญ': 'Priority', 'กิจกรรมล่าสุด': 'Last activity', 'แท็กกิจกรรม': 'Activity tags',
  'ไม่พบลูกค้า': 'No customers found', '+ สร้างลูกค้า': '+ New customer', 'สร้างลูกค้าใหม่': 'New customer',
  'ชื่อกิจการ *': 'Company name *', 'รหัสอ้างอิง': 'Ref code', 'เลขผู้เสียภาษี': 'Tax ID', 'เบอร์โทร': 'Phone',
  'จังหวัด': 'Province', 'ความสำคัญ': 'Priority', 'ทีม': 'Team', 'ผู้ติดต่อหลัก': 'Primary contact',
  'ชื่อ': 'Name', 'ตำแหน่ง': 'Position', 'สาขา/ที่อยู่': 'Branch / address', 'ชื่อสาขา': 'Branch name',
  'ที่อยู่': 'Address', 'แท็กลูกค้า': 'Customer tags', 'ยกเลิก': 'Cancel', 'บันทึก': 'Save',
  'กรุณากรอกชื่อกิจการ': 'Please enter company name',
  // customer detail
  '← กลับรายการลูกค้า': '← Back to customers', 'ข้อมูลลูกค้า': 'Customer info',
  'โทร / อีเมล': 'Phone / email', 'ที่ตั้ง': 'Location', 'ผู้รับผิดชอบ / ทีม': 'Owner / team', 'แท็ก': 'Tags',
  'โครงการของลูกค้า': 'Customer projects', 'ยังไม่มีโครงการ': 'No projects yet',
  'รหัส': 'Code', 'มูลค่า': 'Value', 'ยังไม่มีกิจกรรม': 'No activities yet',
  // activities
  'ประเภท': 'Type', 'ทิศทาง': 'Direction', 'วิธี': 'Method', 'แท็ก': 'Tags', 'เร็วๆนี้': 'Upcoming',
  '+ กิจกรรม': '+ Activity', 'ไม่มีงานติดตาม': 'No activities', 'แก้ไข': 'Edit', 'ลบ': 'Delete',
  'ลบกิจกรรมนี้?': 'Delete this activity?', 'แก้ไขกิจกรรม': 'Edit activity', 'สร้างบันทึกกิจกรรม': 'New activity',
  '- เลือกลูกค้า -': '- Select customer -', 'เลือกลูกค้า': 'Select a customer',
  'วันที่ *': 'Date *', 'เวลา *': 'Time *', 'วิธีการติดต่อ *': 'Contact method *',
  'ประเภทงานติดตาม': 'Activity type', 'โครงการ': 'Project', 'สถานะโครงการ': 'Project stage',
  'รายละเอียดการติดต่อ': 'Contact detail', '@ แท็กเพื่อนร่วมงาน': '@ Mention teammates',
  'แท็กกิจกรรม': 'Activity tags', 'แนบรูป': 'Attach image', 'สร้างงานติดตาม': 'Create follow-up',
  'กำหนดติดตาม': 'Follow-up date', 'บันทึกและไปต่อ': 'Save and add next',
  // projects
  'มูลค่ารวม': 'Total value', 'จำนวนโครงการ': 'Projects', 'เปิดอยู่': 'Open',
  '+ สร้างโครงการ': '+ New project', 'สร้างโครงการใหม่': 'New project', 'ไม่มีโครงการ': 'No projects',
  'ชื่อโครงการ *': 'Project name *', 'กรอกชื่อโครงการ': 'Enter project name', 'ประเภทโครงการ': 'Project type',
  'ชื่อสถานที่': 'Place name', 'สถานะเริ่มต้น': 'Initial stage', 'วันเริ่ม': 'Start date', 'วันสิ้นสุด': 'End date',
  'บันทึกเพิ่มเติม': 'Notes', 'กิจกรรม': 'Activities', 'วันเริ่ม-สิ้นสุด': 'Start - end',
  'สถานะ (ไปป์ไลน์)': 'Stage (pipeline)', 'เลื่อน': 'Move',
  // project detail
  '← กลับรายการโครงการ': '← Back to projects', 'ข้อมูลโครงการ': 'Project info', 'ไปป์ไลน์': 'Pipeline',
  'ถอยขั้น': 'Prev stage', 'เลื่อนขั้น': 'Next stage', 'ปิดการขายแล้ว': 'Closed won', 'ประเภท': 'Type',
  'ระยะเวลา': 'Duration', 'บันทึกย่อ': 'Notes', 'ลูกค้าที่เกี่ยวข้อง': 'Related customers',
  // quotations
  '+ สร้างใบเสนอราคา': '+ New quotation', 'สร้างใบเสนอราคา': 'New quotation', 'เลขที่': 'No.',
  'ยอดรวม': 'Total', 'วันที่': 'Date', 'ยังไม่มีใบเสนอราคา': 'No quotations yet',
  'รายการ': 'Item', 'จำนวน': 'Qty', 'ราคา/หน่วย': 'Unit price', 'เช่น แพ็กเกจ 4 เกาะ': 'e.g. 4-island package',
  'กรอกรายการและราคา': 'Enter item and price', 'ระบบคำนวณ VAT 7% อัตโนมัติ': 'VAT 7% calculated automatically',
  // sale orders
  'แปลงจากใบเสนอราคา...': 'Convert from quotation...', '+ สร้างใบสั่งขาย': '+ New sale order',
  'อ้างอิงใบเสนอราคา': 'Quotation ref', 'ยังไม่มีใบสั่งขาย — เลือกใบเสนอราคาด้านบนเพื่อแปลง': 'No sale orders yet — pick a quotation above to convert',
  // reports
  'อัตราชนะ (Win rate)': 'Win rate', 'ดีลปิดได้': 'Deals won', 'มูลค่าปิดได้': 'Won value',
  'โครงการตามขั้นไปป์ไลน์': 'Projects by stage', 'ยอดตามเดือน (วันเริ่มโครงการ)': 'Monthly value (start date)',
  'ยอดขายตามผู้รับผิดชอบ': 'Sales by owner', 'จำนวนดีล': 'Deals', 'ปิดได้ (มูลค่า)': 'Won (value)',
  'กำลังดำเนินการ': 'In progress', 'ยอดตามทีม': 'By team', 'ดีล': 'Deals',
  'งานติดตามตามพนักงาน': 'Activities by user', 'พนักงาน': 'User', 'รอ': 'Pending',
  // settings
  'ไปป์ไลน์การขาย (8 ขั้น)': 'Sales pipeline (8 stages)', 'ปิดการขาย': 'Won',
  'ทีม & ผู้ใช้งาน': 'Teams & users', 'แท็กลูกค้า': 'Customer tags', '+ เพิ่มแท็ก': '+ Add tag',
  'แท็กกิจกรรม': 'Activity tags', 'ค่าตั้งต้นอื่น ๆ': 'Other defaults', 'ชื่อแท็กใหม่': 'New tag name',
  'แหล่งที่มา': 'Source', 'ประเภทลูกค้า': 'Customer type', 'เกรดลูกค้า': 'Customer grade', 'อื่น ๆ': 'Other',
  'วิธีการติดต่อ': 'Contact methods', 'ประเภทงานติดตาม': 'Activity types', 'ประเภทโครงการ': 'Project types',
  'เลือกรูป': 'Choose photo',
  'ถ่ายรูป': 'Take photo',
  'เช็คอิน': 'Check-in',
  'เช็คเอาท์': 'Check-out',
};

const Ctx = createContext({ t: (s) => s, lang: 'th', toggle: () => {} });
export const useI18n = () => useContext(Ctx);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'th');
  const t = useCallback((s) => (lang === 'en' ? (EN[s] || s) : s), [lang]);
  const toggle = useCallback(() => setLang(l => { const n = l === 'th' ? 'en' : 'th'; localStorage.setItem('lang', n); return n; }), []);
  return <Ctx.Provider value={{ t, lang, toggle }}>{children}</Ctx.Provider>;
}
