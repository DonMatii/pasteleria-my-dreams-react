import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Delicias from "./pages/Delicias";
import Contacto from "./pages/Contacto";
import Pedido from "./pages/Pedido";
import EstadoPedido from "./pages/EstadoPedido";
import Login from "./pages/Login";
import AdminPanel from "./pages/AdminPanel"; 
import ProtectedRoute from "./components/ProtectedRoute"; 
import './App.css';
import imgLogo from "./assets/img/logoPasteleria.png"; 

function App() {
  return (
    <div className="app-container">
      <div className="logo-container">
        <img src={imgLogo} alt="Logo My Dreams" className="logo-img" />
      </div>

      <Header />

      <main className="main-content">
        <Routes>
          {/* RUTAS PÚBLICAS */}
          <Route path="/" element={<Home />} />
          <Route path="/delicias" element={<Delicias />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/pedido" element={<Pedido />} />
          <Route path="/estado" element={<EstadoPedido />} />
          <Route path="/login" element={<Login />} />

          {/* RUTA PROTEGIDA */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            } 
          />

          {/* Si la ruta no existe, vuelve al Home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;