import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Start from './pages/Start.tsx'
import Invite from './pages/Invite.tsx'
import Join from './pages/Join.tsx'
import JoinCode from './pages/JoinCode.tsx'
import Login from './pages/Login.tsx'
import Register from './pages/Register.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Guest flow routes (public) */}
        {import.meta.env.VITE_FEATURE_GUEST_FLOW === 'true' && (
          <>
            <Route path="/start" element={<Start />} />
            <Route path="/invite/:code" element={<Invite />} />
            <Route path="/join" element={<JoinCode />} />
            <Route path="/join/:code" element={<Join />} />
          </>
        )}
        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Default app route (authenticated areas unchanged) */}
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
