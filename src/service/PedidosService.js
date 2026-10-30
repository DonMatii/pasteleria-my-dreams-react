import apiClient from "./apiClient";

// Listado administrativo de pedidos: el mas reciente primero. Incluye cliente,
// email, estado y desglose de productos, todo lo que muestra el panel de admin.
// Requiere X-Api-Key: apiClient la adjunta sola desde el entorno.
export const obtenerPedidos = async () => {
  try {
    const response = await apiClient.get("/api/pedidos");
    return response.data;
  } catch (error) {
    console.error("Error al consultar los pedidos:", error);
    return [];
  }
};

// Cambia el estado de un pedido (Recibido, En preparacion, Despachado, Entregado).
// El backend valida el estado y, ademas de persistirlo, publica el evento que
// dispara el correo al cliente. Devuelve el pedido actualizado o null si fallo.
export const cambiarEstadoPedido = async (id, estado) => {
  try {
    const response = await apiClient.patch(`/api/pedidos/${id}/estado`, { estado });
    return response.data;
  } catch (error) {
    console.error("Error al cambiar el estado del pedido:", error);
    return null;
  }
};

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
