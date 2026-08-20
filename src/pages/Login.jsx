import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUsuario } from "../service/AuthService";
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode"; // <-- 1. Importamos la nueva herramienta
import "../App.css";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [campoError, setCampoError] = useState({ user: false, pass: false });

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setCampoError({ user: false, pass: false });

    if (!username.trim() || !password.trim()) {
      setError("Por favor, completa todos los campos.");
      setCampoError({
        user: !username.trim(),
        pass: !password.trim(),
      });
      return;
    }

    setLoading(true);

    try {
      const data = await loginUsuario(username, password);

      if (data.token) {
        sessionStorage.setItem("userToken", data.token);
        sessionStorage.setItem("userName", username);

        if (username.toLowerCase() === "admin") {
          navigate("/admin");
        } else {
          window.location.href = "/";
        }
      }
    } catch (err) {
      setCampoError({ user: true, pass: true });
      if (err.response && err.response.status === 401) {
        setError("Usuario o contraseña incorrectos.");
      } else {
        setError("Hubo un problema al conectar. Inténtalo de nuevo.");
      }
    } finally {
      setLoading(false);
    }
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

        {/* --- SECCIÓN ADMINISTRADOR --- */}
        <div style={{ marginBottom: "20px", textAlign: "center" }}>
          <h3 style={{ color: "#d63384", fontSize: "1.2rem", marginBottom: "5px" }}>Acceso de Administrador</h3>
          <p style={{ fontSize: "13px", color: "#666" }}>Solo para gestión interna de la pastelería</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (campoError.user)
                  setCampoError({ ...campoError, user: false });
              }}
              placeholder="Ej: admin"
              className={campoError.user ? "input-error" : ""}
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (campoError.pass)
                  setCampoError({ ...campoError, pass: false });
              }}
              placeholder="Contraseña"
              className={campoError.pass ? "input-error" : ""}
            />
          </div>
          <button
            type="submit"
            className="boton-principal"
            style={{ width: "100%" }}
            disabled={loading}
          >
            {loading ? "Verificando..." : "Ingresar como Administrador"}
          </button>
        </form>

        {/* --- SECCIÓN CLIENTES / GOOGLE --- */}
        <div style={{ marginTop: "25px", paddingTop: "20px", borderTop: "1px solid #ddd", textAlign: "center" }}>
          <h3 style={{ color: "#d63384", fontSize: "1.2rem", marginBottom: "5px" }}>Acceso para Clientes</h3>
          <p style={{ marginBottom: "15px", color: "#666", fontSize: "13px" }}>
            Ingresa de forma rápida y segura con tu cuenta de Google
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                console.log("¡Éxito! Token de Google:", credentialResponse);
                
                // 2. Decodificamos el token para extraer los datos reales
                const decodedToken = jwtDecode(credentialResponse.credential);
                console.log("Datos del usuario decodificados:", decodedToken);
                
                // 3. Guardamos el token y usamos el nombre de pila (given_name)
                sessionStorage.setItem("userToken", credentialResponse.credential);
                sessionStorage.setItem("userName", decodedToken.given_name || decodedToken.name);
                
                window.location.href = "/";
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