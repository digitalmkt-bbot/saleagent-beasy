# SaleAgent.Beasy — Sales CRM (Full-stack)

ระบบบริหารงานขาย (SaleAgent.Beasy) ถอดโครงสร้างสไตล์ Jubili by BUILK ถอดโครงสร้างจากโมดูล **งานติดตาม / ลูกค้า / โครงการ**
สำหรับบริษัท เลิฟ ไอแลนด์ จำกัด — Node.js + Express + PostgreSQL (backend) และ React + Vite (frontend)

## โครงสร้าง
```
jubili-clone/
├─ db/schema.sql          # โครงสร้างฐานข้อมูล (PostgreSQL)
├─ docker-compose.yml     # รัน PostgreSQL + สร้างตารางอัตโนมัติ
├─ server/                # REST API (Express + pg)
│  └─ src/routes/         # customers, activities, projects, quotations, saleorders, tags, meta
└─ web/                   # React SPA (Vite)
   └─ src/pages/          # Dashboard, Customers, Activities, Projects, Quotations, Settings
```

## วิธีรัน (3 ขั้นตอน)

### 1) ฐานข้อมูล (Docker)
```bash
docker compose up -d          # เปิด PostgreSQL ที่ localhost:5432 และสร้างตารางจาก db/schema.sql
```
> ถ้าไม่ใช้ Docker: สร้าง DB เอง แล้วรัน `psql < db/schema.sql`

### 2) Backend API
```bash
cd server
cp ../.env.example .env        # ปรับ DATABASE_URL / JWT_SECRET ถ้าต้องการ
npm install
npm run seed                   # ใส่ข้อมูลตัวอย่าง (บริษัท ผู้ใช้ ลูกค้า โครงการ แท็ก Love Andaman)
npm start                      # API ที่ http://localhost:4000
```

### 3) Frontend
```bash
cd web
npm install
npm run dev                    # เปิด http://localhost:5173 (proxy /api ไป :4000)
```

## เข้าสู่ระบบ (ข้อมูลตัวอย่าง)
- admin@loveandaman.com / **password**
- sales@loveandaman.com / **password**

## ฟีเจอร์ (เต็มระบบ)
- **แผงบริหาร**: KPI, เป้าหมายวันนี้, กราฟไปป์ไลน์
- **งานติดตาม**: เป้าหมายวันนี้ + กรองทีม/ผู้รับผิดชอบ, ค้นหา, กรองสถานะ/ประเภท, จัดเรียงตามความสำคัญ,
  แท็บ ทั้งหมด/วันนี้/เร็วๆนี้/เกินกำหนด, ฟอร์มครบ (ทิศทาง, วันที่+เวลา, วิธี, ประเภท, ความสำคัญ,
  ผู้รับผิดชอบ, @mention, แท็กกิจกรรม, แนบรูป), ปุ่มบันทึก/บันทึกและไปต่อ, แก้ไข/ลบ
- **แจ้งเตือน** 🔔: งานเกินกำหนด/ครบวันนี้
- **ลูกค้า**: 2 แท็บ (รายการ/ลำดับ), กรอง 6 แบบ, คอลัมน์กิจกรรมล่าสุด+แท็ก, **หน้ารายละเอียดลูกค้า**
  (ผู้ติดต่อ/สาขา/โครงการ/timeline), ฟอร์มสร้างครบ
- **โครงการ**: กรองครบ, **หน้ารายละเอียดโครงการ** (ไปป์ไลน์ + timeline), เลื่อนขั้น 8 ขั้น
- **ใบเสนอราคา**: สร้างได้ + คำนวณ VAT
- **ใบสั่งขาย**: แปลงจากใบเสนอราคาอัตโนมัติ
- **รายงาน**: อัตราชนะ, ไปป์ไลน์, ยอดตามผู้รับผิดชอบ/ทีม, งานติดตามตามพนักงาน
- **ตั้งค่า**: เพิ่มแท็กได้, ดูทีม/ผู้ใช้/ค่าตั้งต้น
- **Multi-tenant**: แยกข้อมูลตาม company_id + JWT auth (admin/manager/sales)

## หมายเหตุ
ถอดโครงสร้าง/ตรรกะการทำงานเพื่อสร้างระบบใหม่ ไม่ได้คัดลอกซอร์สโค้ดของ Jubili

## Deploy ขึ้นเซิร์ฟเวอร์
ดูขั้นตอนใน `DEPLOY.md` — รันได้ในคำสั่งเดียวด้วย `docker-compose.full.yml` (db + backend + frontend)
