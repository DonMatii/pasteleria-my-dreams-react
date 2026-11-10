import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/service/apiClient", () => ({
  default: { post: vi.fn().mockResolvedValue({ data: {} }) },
  URL_BASE: "http://test",
}));

import apiClient from "../src/service/apiClient";
import { marcarProductoVisto } from "../src/service/ProductosService";

// El ping de "producto visto" (Entrega 3) alimenta el stream de Kinesis.
// Reglas: una sola vez por producto y por sesión, y jamás lanza aunque la
// red falle (ver un producto es un dato, no una operación crítica).
describe("marcarProductoVisto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.post.mockResolvedValue({ data: {} });
  });

  it("avisa una sola vez por producto aunque la foto se cargue varias veces", () => {
    marcarProductoVisto(7);
    marcarProductoVisto(7);
    marcarProductoVisto(8);

    expect(apiClient.post).toHaveBeenCalledTimes(2);
    expect(apiClient.post).toHaveBeenCalledWith("/api/productos/7/visto");
    expect(apiClient.post).toHaveBeenCalledWith("/api/productos/8/visto");
  });

  it("nunca lanza aunque el aviso falle: la navegación sigue igual", () => {
    apiClient.post.mockRejectedValue(new Error("sin red"));

    expect(() => marcarProductoVisto(9)).not.toThrow();
  });

  it("ignora ids vacíos o inválidos", () => {
    marcarProductoVisto(null);
    marcarProductoVisto(undefined);
    marcarProductoVisto(0);

    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
