import apiClient from "./apiClient";

export const obtenerProductos = async () => {
  try {
    const response = await apiClient.get("/api/productos");
    return response.data; 
  } catch (error) {
    console.error("Error al conectar con la API en obtenerProductos:", error);
    throw error;
  }
};

export const crearProducto = async (producto) => {
  try {
    const response = await apiClient.post("/api/productos", producto);
    return response.data;
  } catch (error) {
    console.error("Error al crear producto:", error);
    throw error;
  }
};

export const actualizarProducto = async (id, producto) => {
  try {
    const response = await apiClient.put(`/api/productos/${id}`, producto);
    return response.data;
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    throw error;
  }
};

export const eliminarProducto = async (id) => {
  try {
    const response = await apiClient.delete(`/api/productos/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    throw error;
  }
};