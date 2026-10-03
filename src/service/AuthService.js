import apiClient from "./apiClient";

export const loginUsuario = async (username, password) => {
  // --- BYPASS TEMPORAL cliente demo (mismo patron que el admin; para probar sin Google en local) ---
  if (username === "cliente" && password === "cliente123") {
    console.log("Acceso cliente demo concedido por bypass local");
    return { token: "token-cliente-temporal-8digital" };
  }
  // ----------------------------------------------------

  // --- BYPASS TEMPORAL (Mientras programamos Java) ---
  if (username === "admin" && password === "admin123") {
    console.log("Acceso administrador concedido por bypass local");
    return { token: "token-admin-temporal-8digital" };
  }
  // ----------------------------------------------------

  try {
    // Ahora todo viaja al Spring Boot local
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