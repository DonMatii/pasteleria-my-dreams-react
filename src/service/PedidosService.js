import apiClient from "./apiClient";

// Que se vendio en un rango de fechas: lista de { nombre, unidades, monto } por
// producto, de mas a menos vendido (dashboard de administracion, S3).
// Requiere X-Api-Key: apiClient la adjunta sola desde el entorno.
export const obtenerVentasPorProducto = async (desde, hasta) => {
  try {
    const response = await apiClient.get("/api/pedidos/estadisticas/productos", {
      params: { desde, hasta },
    });
    return response.data;
  } catch (error) {
    console.error("Error al consultar las ventas por producto:", error);
    return [];
  }
};
