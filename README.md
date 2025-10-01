# 🎥 Video Call App (MERN + TypeScript + Socket.IO)

A simple video calling app using WebRTC for peer-to-peer streaming and Socket.IO for signaling.

Frontend: React + Vite + TypeScript

Backend: Node.js + Express + Socket.IO

Deployment: Vercel (frontend) + Render (backend)

---


## ⚙️ Setup Instructions

### 1. Clone repository
```bash
git clone https://github.com/afeefakvt/Video-Call-App
cd Video-Call-App
```
### 2. Backend Setup
```bash
cd server
npm install
```

#### Setup environment variables

Create .env file in server/:
```bash
PORT=3000
FRONTEND_URL=http://localhost:5173
```
👉 Backend will run on http://localhost:3000



### 3. Frontend Setup
```bash
cd client
npm install
```

#### Setup environment variables

Create .env file in client/:
```bash
VITE_BACKEND_URL=http://localhost:3000
```
👉 Frontend will run on http://localhost:5173

---

## 🧪 Testing Locally

Start backend → npm run dev inside server/

Start frontend → npm run dev inside client/

Open two browser tabs at http://localhost:5173

Join the same room → you should see video streaming between them.



