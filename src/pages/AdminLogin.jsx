import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin } from "../service/AuthService";
import "../App.css";

// Acceso SOLO de administrador (separacion admin/cliente).
// El login de cliente con Google vive en /login.
function AdminLogin() {
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
      const data = await loginAdmin(username, password);

      if (data.token) {
        sessionStorage.setItem("userToken", data.token);
        sessionStorage.setItem("userName", username);
        sessionStorage.setItem("userRole", "admin");

        // El administrador siempre entra al panel, sin retorno ?redirect
        navigate("/admin", { replace: true });
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
    <main className="main-content fondo-pagina">
      <h1 className="titulo-principal">Pastelería My Dreams</h1>
      <p className="subtitulo-home">Gestión Interna</p>

      <div className="formulario-container">
        {error && (
          <div
            className="error-text"
            style={{ textAlign: "center", marginBottom: "15px" }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: "20px", textAlign: "center" }}>
          <h2 style={{ color: "#d63384", fontSize: "1.2rem", marginBottom: "5px" }}>Acceso de Administrador</h2>
          <p style={{ fontSize: "13px", color: "#666" }}>Solo para gestión interna de la pastelería</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="usuario">Usuario</label>
            <input
              type="text"
              id="usuario"
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
            <label htmlFor="contrasena">Contraseña</label>
            <input
              type="password"
              id="contrasena"
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
      </div>
    </main>
  );
}

export default AdminLogin;
