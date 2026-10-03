import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, teaser = null }) => {
  // ✅ CAMBIO: Ahora buscamos en sessionStorage para que sea coherente
  const token = sessionStorage.getItem("userToken") || sessionStorage.getItem("token");

  if (!token) {
    // Sin token: si la ruta trae su propio teaser se muestra (ej: /pedido),
    // si no, lo mandamos al login (ej: /admin, igual que siempre)
    if (teaser) {
      return teaser;
    }
    console.log("Acceso denegado: No se encontró token en sessionStorage");
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;