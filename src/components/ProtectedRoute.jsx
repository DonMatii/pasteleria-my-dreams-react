import { Navigate } from 'react-router-dom';

// Gate de rutas protegidas.
// - Sin token: muestra el teaser si la ruta trae uno (ej: /pedido),
//   si no redirige a `to` (por defecto /login).
// - Con token: si la ruta exige `rol` (ej: /admin exige "admin") y la sesión
//   no lo tiene (cliente con Google, o sesión antigua sin userRole), redirige
//   a `to` (default-deny). Las rutas sin `rol` se comportan como siempre.
const ProtectedRoute = ({ children, teaser = null, rol = null, to = "/login" }) => {
  const token = sessionStorage.getItem("userToken") || sessionStorage.getItem("token");
  const userRole = sessionStorage.getItem("userRole");

  if (!token) {
    if (teaser) {
      return teaser;
    }
    console.log("Acceso denegado: No se encontró token en sessionStorage");
    return <Navigate to={to} replace />;
  }

  if (rol && userRole !== rol) {
    console.log("Acceso denegado: la sesión no tiene el rol requerido");
    return <Navigate to={to} replace />;
  }

  return children;
};

export default ProtectedRoute;
