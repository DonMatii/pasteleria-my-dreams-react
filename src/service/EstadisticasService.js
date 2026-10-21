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

// Guarda las metas de ventas por periodo (dia, semana, mes) que alimentan la barra
// de avance del dashboard de administracion
export const guardarMetas = async (metas) => {
  try {
    const response = await apiClient.put("/api/estadisticas/metas", metas);
    return response.data;
  } catch (error) {
    console.error("Error al guardar las metas:", error);
    throw error;
  }
};