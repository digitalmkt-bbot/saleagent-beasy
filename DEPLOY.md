# คู่มือ Deploy — SaleAgent.Beasy

ระบบมี 3 ส่วน: ฐานข้อมูล (PostgreSQL), backend (Node/Express), frontend (React ผ่าน Nginx)
ทั้งหมดรวมเป็นชุด Docker เดียว deploy ได้ในคำสั่งเดียว

## รันบนเครื่อง/เซิร์ฟเวอร์ (ต้องมี Docker)

```bash
# 1) สร้างและเปิดทุกบริการ
docker compose -f docker-compose.full.yml up -d --build

# 2) ใส่ข้อมูลตัวอย่างครั้งแรก (สร้างบริษัท/ผู้ใช้/ลูกค้า)
docker compose -f docker-compose.full.yml exec server npm run seed

# 3) เปิดใช้งาน
#   บนเครื่องตัวเอง:  http://localhost
#   บนเซิร์ฟเวอร์:    http://<IP-เซิร์ฟเวอร์>
```

เข้าสู่ระบบ: `admin@loveandaman.com` / `password`

## ก่อนขึ้นใช้งานจริง (สำคัญ)
- แก้ `POSTGRES_PASSWORD` และ `DATABASE_URL` ใน `docker-compose.full.yml`
- แก้ `JWT_SECRET` เป็นค่าลับที่เดายาก
- เปลี่ยนรหัสผ่านผู้ใช้เริ่มต้น (หรือแก้ seed ก่อนรัน)
- ใส่ HTTPS ด้วย reverse proxy (เช่น Caddy/Traefik/Nginx + Let's Encrypt) หน้า service `web`

## Deploy ขึ้น Cloud
- **VPS (DigitalOcean/AWS EC2/Google Cloud)**: ติดตั้ง Docker แล้วรัน 3 คำสั่งด้านบน
- **Render / Railway / Fly.io**: แยก deploy `server` (Web Service) + `db` (Managed Postgres) + `web` (Static Site ที่ตั้ง env ให้เรียก API ของ server)
- ฐานข้อมูลควรใช้ Managed Postgres และเปิด backup อัตโนมัติ

## คำสั่งที่ใช้บ่อย
```bash
docker compose -f docker-compose.full.yml logs -f server   # ดู log backend
docker compose -f docker-compose.full.yml down             # หยุดทั้งหมด
docker compose -f docker-compose.full.yml up -d --build     # อัปเดตหลังแก้โค้ด
```

---

## เริ่มด้วยข้อมูลจริง (ไม่มีข้อมูลตัวอย่าง)

แทนที่จะใช้ `npm run seed` (ที่ใส่ลูกค้าตัวอย่าง) ให้ใช้ **seed สะอาด** ที่สร้างแค่บริษัท + ผู้ดูแล 1 คน + ค่าตั้งต้น (ไปป์ไลน์ 8 ขั้น, แท็ก, วิธีติดต่อ):

```bash
# ตั้งค่าชื่อบริษัท/แอดมินได้ผ่าน env (ไม่ตั้งก็ใช้ค่า default)
COMPANY_NAME="บริษัทของคุณ" ADMIN_EMAIL="you@company.com" ADMIN_PASSWORD="รหัสที่ตั้งเอง" npm run seed:clean
# บน Docker:
docker compose -f docker-compose.full.yml exec server npm run seed:clean
```

## นำเข้าลูกค้าเดิมจาก Excel/CSV

1. เตรียมไฟล์ CSV ตามหัวคอลัมน์นี้ (ดูตัวอย่างใน `server/customers.sample.csv`):
   `name,ref_code,tax_id,phone,email,province,contact_name,contact_phone,contact_email`
   (Excel: Save As → CSV UTF-8)
2. รันนำเข้า:
```bash
npm run import:customers -- customers.csv
# บน Docker (คัดลอกไฟล์เข้า container ก่อน):
docker compose -f docker-compose.full.yml cp customers.csv server:/app/customers.csv
docker compose -f docker-compose.full.yml exec server npm run import:customers -- /app/customers.csv
```

## เปิด HTTPS + โดเมน (อัตโนมัติ)

1. ชี้โดเมน (A record) มาที่ IP เซิร์ฟเวอร์
2. คัดลอก `.env.prod.example` เป็น `.env` แล้วแก้ `DOMAIN`, `EMAIL`, `DB_PASSWORD`, `JWT_SECRET`
3. รัน:
```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec server npm run seed:clean
```
Caddy จะขอใบรับรอง HTTPS จาก Let's Encrypt ให้อัตโนมัติ → เปิด `https://โดเมนของคุณ` ได้เลย
