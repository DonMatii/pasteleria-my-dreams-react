import { Link, useNavigate } from "react-router-dom";
import logoPasteleria from "../assets/img/logoPasteleria.png"; 

function Header() {
  const navigate = useNavigate();
  // ✅ Leemos de sessionStorage para coherencia con el Login
  const username = sessionStorage.getItem("userName");

  const handleLogout = () => {
    // ✅ Limpiamos la sesión actual
    sessionStorage.clear();
    // Redirigimos al inicio y forzamos recarga para limpiar el estado
    window.location.href = "/"; 
  };

  return (
    <header className="header-container">
      <div className="logo-container">
        <Link to="/">
          <img src={logoPasteleria} alt="Logo My Dreams" className="logo-img" />
        </Link>
      </div>

      <nav className="nav-menu">
        <ul>
          <li><Link to="/">Inicio</Link></li>
          <li><Link to="/delicias">Delicias</Link></li>
          <li><Link to="/pedido">Pedido</Link></li>
          <li><Link to="/contacto">Contacto</Link></li>
          
          {/* Mostramos Admin solo si el usuario es 'admin' en la sesión activa */}
          {username?.toLowerCase() === 'admin' && (
            <li>
              <Link to="/admin" className="admin-nav-link">
                ⚙️ Admin
              </Link>
            </li>
          )}

          {username ? (
            <li className="user-pill">
              <span className="user-name">
                👤 {username}
              </span>
              <button 
                onClick={handleLogout}
                className="btn-salir-pill"
              >
                Salir
              </button>
            </li>
          ) : (
            <li className="login-item">
              <Link to="/login">Login</Link>
            </li>
          )}
        </ul>
      </nav>
    </header>
  );
}

export default Header;