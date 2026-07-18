// สิทธิ์การมองเห็นข้อมูล: admin/manager เห็นทั้งบริษัท, ที่เหลือ (sales/staff) เห็นเฉพาะของตัวเอง
const isStaff = (u) => !['admin', 'manager', 'executive'].includes(String((u && u.role) || '').toLowerCase());
// admin-level: ผู้ดูแลระบบ (admin) และ ผู้บริหาร (executive) มีสิทธิ์เท่ากัน
const isAdmin = (u) => ['admin', 'executive'].includes(String((u && u.role) || '').toLowerCase());
// SQL: id ของเอเจ้นท์ที่ผู้ใช้คนนี้ดูแล ($1 = company_id, $2 = user_id)
const OWNED = '(SELECT id FROM customer WHERE company_id=$1 AND owner_user_id=$2)';
module.exports = { isStaff, isAdmin, OWNED };
