import React from "react";
import { Link } from "react-router-dom";
import "../index.css"; // Para asegurar los estilos

const Footer = () => {
  return (
    <footer>
      <div className="contenido-footer">
        <p>&copy; 2026 Pastelería My Dreams – Todos los derechos reservados.</p>
        <p className="firma">
          Diseñado y desarrollado por <strong>Catherine Godoy</strong>
        </p>
        {/* Puerta única visible hacia el panel de administración
            (la consola admin no se anuncia en la navegación principal) */}
        <p className="footer-admin">
          <Link to="/admin/login">Panel de administración</Link>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
