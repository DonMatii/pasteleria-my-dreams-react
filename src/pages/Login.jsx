import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { registrarPrimeraConexion } from "../service/BienvenidaService";
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import "../App.css";

// Login SOLO de clientes con Google (separacion admin/cliente).
// El acceso del administrador (usuario/contraseña) vive en /admin/login.
function Login() {
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Retorno post-login: solo rutas internas (ni vacío, ni //, ni http externo,
  // ni backslash: WHATWG normaliza "/\evil.com" a un salto externo)
  const destinoSeguro = () => {
    const destino = searchParams.get("redirect");
    if (
      destino &&
      destino.startsWith("/") &&
      !destino.startsWith("//") &&
      !destino.includes("\\")
    ) {
      return destino;
    }
    return "/";
  };

  return (
    <main className="main-content">
      <h1 className="titulo-principal">Pastelería My Dreams</h1>
      <p className="subtitulo-home">Bienvenido al Sistema</p>

      <div className="formulario-container">
        {error && (
          <div
            className="error-text"
            style={{ textAlign: "center", marginBottom: "15px" }}
          >
            {error}
          </div>
        )}

        {/* --- SECCIÓN CLIENTES / GOOGLE --- */}
        <div style={{ textAlign: "center" }}>
          <h3 style={{ color: "#d63384", fontSize: "1.2rem", marginBottom: "5px" }}>Acceso para Clientes</h3>
          <p style={{ marginBottom: "15px", color: "#666", fontSize: "13px" }}>
            Ingresa de forma rápida y segura con tu cuenta de Google
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                // Decodificamos el token para extraer los datos reales
                const decodedToken = jwtDecode(credentialResponse.credential);

                sessionStorage.setItem("userToken", credentialResponse.credential);
                sessionStorage.setItem("userName", decodedToken.given_name || decodedToken.name);
                sessionStorage.setItem("userRole", "cliente");

                // Primera conexion con Google: gana el codigo de bienvenida solo una vez
                registrarPrimeraConexion();

                // Mismo retorno seguro que el teaser: /pedido o el Home por defecto
                navigate(destinoSeguro(), { replace: true });
              }}
              onError={() => {
                setError("El inicio de sesión con Google fue cancelado o falló.");
              }}
            />
          </div>
        </div>

      </div>
    </main>
  );
}

export default Login;
