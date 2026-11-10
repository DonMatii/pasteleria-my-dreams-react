import { describe, it, expect } from "vitest";
import { resolverUrlImagen } from "../src/utils/resolverUrlImagen";

// Cada pantalla arma la URL de la foto del producto por su cuenta; con upload
// de imagenes ya pueden venir del servidor (/uploads/... o una URL absoluta
// cuando el storage sea S3). El helper unifica eso sin romper los archivos
// legacy del catalogo, que siguen viviendo en /img del front.
describe("resolverUrlImagen", () => {
  it("los archivos legacy del catalogo se resuelven bajo /img", () => {
    expect(resolverUrlImagen("tortaSelvaNegra.jpg")).toBe("/img/tortaSelvaNegra.jpg");
    expect(resolverUrlImagen("alfajor.jpg")).toBe("/img/alfajor.jpg");
  });

  it("las URL que ya vienen del servidor se usan tal cual", () => {
    expect(resolverUrlImagen("/uploads/abc-123.jpg")).toBe("/uploads/abc-123.jpg");
    expect(resolverUrlImagen("https://cdn.ejemplo/torta.jpg")).toBe("https://cdn.ejemplo/torta.jpg");
    expect(resolverUrlImagen("//cdn.ejemplo/torta.jpg")).toBe("//cdn.ejemplo/torta.jpg");
  });

  it("un valor vacio se deja tal cual para que cada pantalla aplique su fallback", () => {
    expect(resolverUrlImagen("")).toBe("");
    expect(resolverUrlImagen(null)).toBe("");
    expect(resolverUrlImagen(undefined)).toBe("");
  });
});
