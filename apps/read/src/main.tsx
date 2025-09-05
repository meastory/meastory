import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import FullscreenProvider from './contexts/FullscreenContext.tsx'
import Start from './pages/Start.tsx'
import Invite from './pages/Invite.tsx'
import Join from './pages/Join.tsx'
import JoinCode from './pages/JoinCode.tsx'
import Login from './pages/Login.tsx'
import Register from './pages/Register.tsx'
import LayoutTest from './pages/LayoutTest.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FullscreenProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/start" element={<Start />} />
          <Route path="/invite/:code" element={<Invite />} />
          <Route path="/join" element={<JoinCode />} />
          <Route path="/join/:code" element={<Join />} />
          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* Testing route - REMOVE AFTER LAYOUT WORK */}
          <Route path="/layout-test" element={<LayoutTest />} />
          {/* Default app route (authenticated areas unchanged) */}
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </FullscreenProvider>
  </StrictMode>,
)
