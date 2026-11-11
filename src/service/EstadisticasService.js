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
// "Productos más vistos" (Entrega 3): el top que alimenta el stream de Kinesis
// con los eventos producto_visto (una vista por producto y por sesión)
export const obtenerProductosVistos = async () => {
  try {
    const response = await apiClient.get("/api/estadisticas/productos-vistos");
    return response.data;
  } catch (error) {
    console.error("Error al obtener los productos más vistos:", error);
    throw error;
  }
};

export const guardarMetas = async (metas) => {
  try {
    const response = await apiClient.put("/api/estadisticas/metas", metas);
    return response.data;
  } catch (error) {
    console.error("Error al guardar las metas:", error);
    throw error;
  }
};