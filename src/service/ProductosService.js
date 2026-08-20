import apiClient from "./apiClient";

export const obtenerProductos = async () => {
  try {
    // Ya no nos preocupamos por headers ni URL base, apiClient hace la magia
    const response = await apiClient.get("/api/productos");
    return response.data; 
  } catch (error) {
    console.error("Error al conectar con la API en obtenerProductos:", error);
    throw error;
  }
};