import { Routes, Route, Navigate } from "react-router-dom";
import { CarritoProvider } from "./context/CarritoContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Delicias from "./pages/Delicias";
import Historia from "./pages/Historia";
import Contacto from "./pages/Contacto";
import Pedido from "./pages/Pedido";
import EstadoPedido from "./pages/EstadoPedido";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import AdminPanel from "./pages/AdminPanel"; 
import ProtectedRoute from "./components/ProtectedRoute"; 
import TeaserPedido from "./components/TeaserPedido"; 
import BotonVolverArriba from "./components/BotonVolverArriba";
import './App.css';
import imgLogo from "./assets/img/logoPasteleria.png"; 

function App() {
  return (
    <CarritoProvider>
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
            <Route path="/historia" element={<Historia />} />
            <Route path="/contacto" element={<Contacto />} />
            <Route
              path="/pedido"
              element={
                <ProtectedRoute teaser={<TeaserPedido />}>
                  <Pedido />
                </ProtectedRoute>
              }
            />
            <Route path="/estado" element={<EstadoPedido />} />
            <Route path="/login" element={<Login />} />

            {/* Acceso de administrador (separado del login de clientes con Google) */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* RUTA PROTEGIDA: exige sesión con rol admin */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute rol="admin" to="/admin/login">
                  <AdminPanel />
                </ProtectedRoute>
              } 
            />

            {/* Si la ruta no existe, vuelve al Home */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        <Footer />

        <BotonVolverArriba />
      </div>
    </CarritoProvider>
  );
}

export default App;