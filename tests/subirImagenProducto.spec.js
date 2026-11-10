import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/service/apiClient", () => ({
  default: { post: vi.fn() },
  URL_BASE: "http://test",
}));

import apiClient from "../src/service/apiClient";
import { subirImagenProducto } from "../src/service/ProductosService";

describe("subirImagenProducto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sube el archivo como multipart a /api/productos/imagen y devuelve la URL", async () => {
    apiClient.post.mockResolvedValue({ data: { url: "/uploads/abc-123.jpg" } });
    const archivo = new File(["foto"], "torta.jpg", { type: "image/jpeg" });

    const url = await subirImagenProducto(archivo);

    expect(url).toBe("/uploads/abc-123.jpg");
    const [ruta, body] = apiClient.post.mock.calls[0];
    expect(ruta).toBe("/api/productos/imagen");
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("archivo")).toBe(archivo);
  });

  it("propaga el error cuando el servidor rechaza la imagen", async () => {
    apiClient.post.mockRejectedValue(new Error("400"));
    const archivo = new File(["foto"], "torta.jpg", { type: "image/jpeg" });

    await expect(subirImagenProducto(archivo)).rejects.toThrow();
  });
});
