import { describe, it, expect } from "vitest";
import { encabezadoAutorizacion } from "../src/service/apiClient";

// El header Authorization solo corresponde a tokens JWT (tres segmentos con
// punto), que es como llega el ID token de Google. El token opaco del
// administrador viaja solo en X-Api-Key: si se enviara como Bearer, el backend
// lo rechazaría y el panel admin entero quedaría en 401.
describe("Encabezado Authorization del apiClient", () => {
  it("un token JWT de Google viaja como Bearer", () => {
    const jwt = "aaa.bbb.ccc";
    expect(encabezadoAutorizacion(jwt)).toBe(`Bearer ${jwt}`);
  });

  it("el token opaco del administrador NO genera encabezado Authorization", () => {
    expect(encabezadoAutorizacion("token-opaco-admin")).toBeNull();
    expect(encabezadoAutorizacion("abc.def")).toBeNull();
  });

  it("sin token no hay encabezado Authorization", () => {
    expect(encabezadoAutorizacion(null)).toBeNull();
    expect(encabezadoAutorizacion("")).toBeNull();
  });
});
