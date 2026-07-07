# อัปขึ้น GitHub + Deploy บน Railway — SaleAgent.Beasy

## ส่วนที่ 1 — Push ขึ้น GitHub

โปรเจกต์นี้ init git + commit แรกไว้ให้แล้ว เหลือแค่เชื่อมกับ GitHub ของคุณ

1. ไปที่ https://github.com/new สร้าง repository เปล่า (เช่นชื่อ `saleagent-beasy`) — **ไม่ต้องติ๊ก** Add README
2. ในโฟลเดอร์โปรเจกต์ รันคำสั่ง (แทน URL ด้วยของ repo คุณ):
```bash
git remote add origin https://github.com/<username>/saleagent-beasy.git
git branch -M main
git push -u origin main
```
> ครั้งแรก GitHub จะให้ล็อกอิน — ใช้ Personal Access Token แทนรหัสผ่าน (Settings → Developer settings → Tokens)

## ส่วนที่ 2 — Deploy บน Railway (https://railway.app)

Railway จะรัน 3 บริการ: ฐานข้อมูล + backend + frontend

### 2.1 สร้างโปรเจกต์ + ฐานข้อมูล
1. Railway → **New Project** → **Deploy from GitHub repo** → เลือก repo ที่เพิ่ง push
2. ในโปรเจกต์ กด **New** → **Database** → **Add PostgreSQL**

### 2.2 บริการ Backend
1. **New** → **GitHub Repo** (repo เดิม) → ตั้ง **Root Directory = `server`**
2. ไปแท็บ **Variables** ใส่:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`  (อ้างอิงจาก Postgres)
   - `JWT_SECRET` = (สุ่มค่ายาว ๆ)
   - (Railway ตั้ง `PORT` ให้อัตโนมัติ)
3. Deploy เสร็จ เปิดแท็บ backend service → คัดลอก **public URL** (เช่น `https://server-production-xxxx.up.railway.app`)
4. รันสร้างตาราง + ข้อมูลเริ่มต้น (ครั้งเดียว) — เปิด **Terminal/Shell** ของ service หรือใช้ Railway CLI:
```bash
npm run db:init
npm run seed:clean         # หรือ npm run seed เพื่อใส่ข้อมูลตัวอย่าง
```
   (ผ่าน Railway CLI บนเครื่อง: `railway run --service server npm run db:init`)

### 2.3 บริการ Frontend
1. **New** → **GitHub Repo** (repo เดิม) → ตั้ง **Root Directory = `web`**
2. แท็บ **Variables** ใส่:
   - `VITE_API_URL` = `<public URL ของ backend>/api`  เช่น `https://server-production-xxxx.up.railway.app/api`
3. Deploy → Railway จะ build (vite) แล้วเสิร์ฟด้วย `serve` → กด **Generate Domain** เพื่อได้ลิงก์เปิดใช้งาน

### เข้าใช้งาน
เปิดโดเมนของ frontend → เข้าสู่ระบบด้วยแอดมินที่ตั้งใน `seed:clean`
(ค่า default: `admin@loveandaman.com` / `password`)

## หมายเหตุ
- Backend เปิด CORS ให้แล้ว frontend เรียกข้าม service ได้
- เปลี่ยน `JWT_SECRET` และรหัสแอดมินก่อนใช้จริงเสมอ
- นำเข้าลูกค้าเดิม: ดู DEPLOY.md หัวข้อ "นำเข้าลูกค้าจาก Excel/CSV"
