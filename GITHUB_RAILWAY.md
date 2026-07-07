# อัปขึ้น GitHub + Deploy บน Railway — SaleAgent.Beasy

## ส่วนที่ 1 — Push ขึ้น GitHub

1. ไปที่ https://github.com/new สร้าง repository เปล่า (เช่นชื่อ `saleagent-beasy`) — **ไม่ต้องติ๊ก** Add README
2. ในโฟลเดอร์โปรเจกต์ รันคำสั่ง (แทน URL ด้วยของ repo คุณ):
```bash
git init
git add -A
git commit -m "SaleAgent.Beasy initial commit"
git branch -M main
git remote add origin https://github.com/<username>/saleagent-beasy.git
git push -u origin main
```
> (ถ้าไฟล์มี .git อยู่แล้ว ข้าม `git init/add/commit` ไปที่ `git remote add` ได้เลย)
> ครั้งแรก GitHub จะให้ล็อกอิน — ใช้ Personal Access Token แทนรหัสผ่าน (Settings → Developer settings → Tokens)

## ส่วนที่ 2 — Deploy บน Railway (แบบง่าย: บริการเดียว)

ตอนนี้ปรับให้ backend เสิร์ฟหน้าเว็บในตัว เหลือแค่ **1 บริการ + ฐานข้อมูล**

### 2.1 สร้างโปรเจกต์
1. ไปที่ https://railway.app → **Login with GitHub**
2. **New Project** → **Deploy from GitHub repo** → เลือก repo `saleagent-beasy`
   (Railway อ่าน `nixpacks.toml` เอง: build หน้าเว็บ + สตาร์ท backend)

### 2.2 เพิ่มฐานข้อมูล
- ในโปรเจกต์ กด **New** → **Database** → **Add PostgreSQL**

### 2.3 ตั้งค่าตัวแปร (ที่กล่องบริการหลัก → แท็บ Variables)
- `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
- `JWT_SECRET` = (สุ่มค่ายาว ๆ เช่นกด Generate)
- (Railway ใส่ `PORT` ให้อัตโนมัติ)
- กด **Deploy** อีกครั้งให้รับค่าตัวแปรใหม่

### 2.4 สร้างตาราง + ข้อมูลเริ่มต้น (ครั้งเดียว)
เปิด **Shell/Terminal** ของบริการ (หรือใช้ Railway CLI) แล้วรัน:
```bash
node server/src/db-init.js
node server/src/seed-clean.js      # หรือ server/src/seed.js เพื่อใส่ข้อมูลตัวอย่าง
```

### 2.5 เปิดใช้งาน
- ที่บริการหลัก → **Settings** → **Generate Domain** → ได้ลิงก์ `https://xxx.up.railway.app`
- เปิดลิงก์ → เข้าสู่ระบบด้วยแอดมินที่ตั้งใน seed
  (ค่า default: `admin@loveandaman.com` / `password`)

> **หมายเหตุ:** หน้าเว็บกับ API อยู่โดเมนเดียวกัน จึงไม่ต้องตั้ง `VITE_API_URL`
> (ไฟล์ 2-service เดิม railway.json ในโฟลเดอร์ server/web ยังใช้ได้ถ้าต้องการแยกบริการ)
