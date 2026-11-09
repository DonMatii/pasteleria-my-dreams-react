import { Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import Seo from "./components/Seo";
import ErrorBoundary from "./components/ErrorBoundary";
import './App.css';
import imgLogo from "./assets/img/logoPasteleria.png"; 

const SEO_POR_RUTA = {
  "/": { title: "Inicio", description: "Pastelería artesanal en Chile. Tortas personalizadas, dulces y sueños horneados con amor. ¡Haz tu pedido online!", path: "/" },
  "/delicias": { title: "Nuestro Catálogo", description: "Catálogo de tortas, pies, tartas y delicias artesanales. Elige tus favoritos y arma tu pedido.", path: "/delicias" },
  "/historia": { title: "Nuestra Historia", description: "Sueños que se hornean en casa. Conoce el origen de Pastelería My Dreams.", path: "/historia" },
  "/contacto": { title: "Contacto", description: "Contáctanos para consultas, pedidos especiales y eventos. Pastelería My Dreams.", path: "/contacto" },
  "/pedido": { title: "Mi Pedido", description: "Revisa y confirma tu pedido de pastelería.", path: "/pedido", noindex: true },
  "/estado": { title: "Estado de mi Pedido", description: "Consulta el estado de tu pedido con tu código de seguimiento.", path: "/estado", noindex: true },
  "/login": { title: "Iniciar Sesión", description: "Acceso de clientes a Pastelería My Dreams.", path: "/login", noindex: true },
  "/admin/login": { title: "Acceso Administrador", description: "Panel de administración de Pastelería My Dreams.", path: "/admin/login", noindex: true },
  "/admin": { title: "Panel de Administración", description: "Gestión de productos, pedidos y dashboard de ventas.", path: "/admin", noindex: true },
};

function App() {
  const location = useLocation();
  const seo = SEO_POR_RUTA[location.pathname] || { title: "Página no encontrada", path: location.pathname, noindex: true };

  return (
    <CarritoProvider>
      <Seo {...seo} />
      <div className="app-container">
        <div className="logo-container">
          <img src={imgLogo} alt="Logo My Dreams" className="logo-img" />
        </div>

        <Header />

        <main className="main-content">
          <ErrorBoundary>
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
          </ErrorBoundary>
        </main>

        <Footer />

        <BotonVolverArriba />
      </div>
    </CarritoProvider>
  );
}

export default App;