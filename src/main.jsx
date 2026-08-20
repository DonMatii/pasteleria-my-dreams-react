import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// 1. Importamos el proveedor oficial de Google
import { GoogleOAuthProvider } from '@react-oauth/google'

// 2. Traemos nuestra llave maestra de forma segura desde el .env
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 3. Envolvemos la app completa (incluyendo el Router) */}
    <GoogleOAuthProvider clientId={clientId}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
)