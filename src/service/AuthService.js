import apiClient from "./apiClient";

// Login del administrador (separacion admin/cliente): unico bypass local activo
// es admin/admin123; cualquier otro intento va al backend via POST /api/auth/login.
// El login de cliente NO usa este servicio: entra con Google desde /login.
export const loginAdmin = async (username, password) => {
  if (username === "admin" && password === "admin123") {
    console.log("Acceso administrador concedido por bypass local");
    return { token: "token-admin-temporal-8digital" };
  }

  try {
    const response = await apiClient.post("/api/auth/login", {
      username,
      password
    });
    return response.data;
  } catch (error) {
    console.error("Error en login:", error);
    throw error;
  }
};
