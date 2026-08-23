import apiClient from "./apiClient";

export const obtenerEstadisticas = async () => {
  try {
    const response = await apiClient.get("/api/estadisticas");
    return response.data;
  } catch (error) {
    console.error("Error al conectar con estadisticas-service:", error);
    throw error;
  }
};