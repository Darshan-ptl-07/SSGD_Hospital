# Sanskardham Hospital — Full-Stack Web Application

A complete web platform for **Sanskardham Hospital, Dhrangadhra** (Gujarat) with a dedicated frontend deployed on **Vercel** and an Express backend API deployed on **Render**.

---

## 📁 Project Structure

```text
ABC/
├── backend/                  # Node.js + Express REST API (for Render)
│   ├── data/                 # JSON database storage
│   │   └── appointments.json
│   ├── .env                  # Local environment variables
│   ├── .env.example          # Environment variable template
│   ├── .gitignore
│   ├── package.json          # Express, CORS, Dotenv
│   └── server.js             # API routes (appointments, auth, health)
│
├── frontend/                 # Static Website (for Vercel)
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── config.js         # API URL config (localhost vs Render)
│   │   └── main.js           # Frontend scripts + Backend API integration
│   ├── index.html
│   ├── about.html
│   ├── departments.html
│   ├── doctors.html
│   ├── contact.html
│   ├── appointments.html
│   ├── vercel.json           # Vercel deployment settings
│   └── images (*.jpeg, *.png, *.jpg)
│
└── README.md
```

---

## 🚀 Running Locally

### 1. Start the Backend API
```bash
cd backend
npm install
npm run dev
# Server will run at http://localhost:5000
# Health check: http://localhost:5000/api/health
```

### 2. Run the Frontend
Open another terminal:
```bash
cd frontend
# You can serve via any static server or Live Server:
python -m http.server 3000
# Open http://localhost:3000 in your browser
```

---

## 🌐 Deploying to Render (Backend)

1. Push your repository to GitHub.
2. Sign in to **[dashboard.render.com](https://dashboard.render.com)**.
3. Click **New +** → **Web Service**.
4. Connect your GitHub repository.
5. Configure the service:
   - **Name**: `sanskardham-backend`
   - **Root Directory**: `backend` *(Important!)*
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`
6. Add Environment Variables under **Advanced**:
   - `ADMIN_PASSWORD`: Your secret admin password (e.g. `HospitalAdmin@2026`)
   - `FRONTEND_URL`: Leave blank or add your Vercel URL once generated.
7. Click **Create Web Service**.
8. Copy your live Render URL (e.g. `https://sanskardham-backend.onrender.com`).
9. Update `frontend/js/config.js` with this Render URL.

---

## ⚡ Deploying to Vercel (Frontend)

1. Sign in to **[vercel.com](https://vercel.com)**.
2. Click **Add New...** → **Project**.
3. Import your GitHub repository.
4. In the project setup screen:
   - **Framework Preset**: `Other`
   - **Root Directory**: Click **Edit** and choose `frontend`.
5. Click **Deploy**.
6. Vercel will assign a production URL (e.g. `https://sanskardham-hospital.vercel.app`).
7. Update Render's `FRONTEND_URL` environment variable with your Vercel domain.

---

## 🔒 Admin Access
- Navigate to `/appointments.html`
- Enter the admin password configured in your backend `.env` or Render environment variable (default: `admin123`).
- From the admin dashboard, staff can review booked appointments, confirm or reject bookings, change the admin password, or clear records.
