# Video Semantic Search - Frontend

React + Vite + Tailwind CSS frontend for semantic video search.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` file:

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_API_BASE_URL=http://localhost:8000
```

Get your Supabase credentials from:
- Dashboard → Settings → API
- Copy `Project URL` and `anon public` key

### 3. Start Development Server

```bash
npm run dev
```

Open http://localhost:5173

## Features

- ✅ User authentication (Supabase Auth)
- ✅ Protected routes
- ✅ API client for backend
- 🚧 Video upload (TODO)
- 🚧 Search interface (TODO)
- 🚧 Video player (TODO)

## Project Structure

```
src/
├── components/          # Reusable components
│   └── ProtectedRoute.jsx
├── contexts/            # React contexts
│   └── AuthContext.jsx
├── lib/                 # Utilities
│   ├── supabase.js      # Supabase client
│   └── api.js           # Backend API client
├── pages/               # Page components
│   ├── Login.jsx
│   ├── Signup.jsx
│   └── Dashboard.jsx
├── App.jsx              # Main app with routing
└── main.jsx             # Entry point
```

## Available Scripts

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Backend Connection

The frontend connects to the FastAPI backend at `http://localhost:8000`.

Make sure the backend is running:

```bash
cd ../backend
uvicorn app.main:app --reload
```

## Next Steps

1. Create video upload interface
2. Build search UI with query input
3. Display search results with thumbnails
4. Add video player with seek-to-timestamp
5. Polish UI/UX

## Tech Stack

- React 19
- Vite 7
- Tailwind CSS 4
- React Router 6
- Supabase Auth
- Fetch API for backend calls
