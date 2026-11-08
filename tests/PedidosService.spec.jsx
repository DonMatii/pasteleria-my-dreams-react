import { describe, it, expect, vi, beforeEach } from "vitest";

import * as PedidosService from "../src/service/PedidosService";
import apiClient from "../src/service/apiClient";

// apiClient es el axios con los interceptores de token y X-Api-Key: para probar
// el comportamiento del servicio basta sustituirlo por un doble
vi.mock("../src/service/apiClient", () => ({
  default: { get: vi.fn() },
}));

// Un fallo de pedidos-service no puede disfrazarse de lista vacía: el panel traduce
// [] en "Sin ventas registradas", que es una afirmación sobre el negocio y no sobre
// la conexión. El servicio propaga el error y es el panel quien decide qué mostrar.
describe("PedidosService - los fallos no se disfrazan de lista vacía", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("obtenerVentasPorProducto propaga el error en vez de devolver []", async () => {
    apiClient.get.mockRejectedValue(new Error("pedidos-service caido"));

    await expect(
      PedidosService.obtenerVentasPorProducto("2026-11-07", "2026-11-07")
    ).rejects.toThrow("pedidos-service caido");
  });

  it("obtenerVentasPorProducto devuelve la lista cuando la petición responde", async () => {
    const lista = [{ nombre: "Torta Chocolate", unidades: 2, monto: 30000 }];
    apiClient.get.mockResolvedValue({ data: lista });

    await expect(
      PedidosService.obtenerVentasPorProducto("2026-11-07", "2026-11-07")
    ).resolves.toEqual(lista);
    expect(apiClient.get).toHaveBeenCalledWith("/api/pedidos/estadisticas/productos", {
      params: { desde: "2026-11-07", hasta: "2026-11-07" },
    });
  });
});

// Mismo criterio para el listado administrativo: un rechazo no puede volver
// convertido en [] porque AdminPedidos lo traduciria en "Todavia no hay
// pedidos registrados", una afirmacion sobre el negocio y no sobre la red.
describe("PedidosService - obtenerPedidos no disfraza un fallo de lista vacia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("propaga el error en vez de devolver []", async () => {
    apiClient.get.mockRejectedValue(new Error("pedidos-service caido"));

    await expect(PedidosService.obtenerPedidos()).rejects.toThrow(
      "pedidos-service caido"
    );
  });

  it("devuelve la lista cuando la petición responde", async () => {
    const lista = [{ id: 301, cliente: "Daniela Soto", estado: "RECIBIDO" }];
    apiClient.get.mockResolvedValue({ data: lista });

    await expect(PedidosService.obtenerPedidos()).resolves.toEqual(lista);
    expect(apiClient.get).toHaveBeenCalledWith("/api/pedidos");
  });
});
