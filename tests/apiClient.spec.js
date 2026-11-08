import { describe, test, expect, beforeEach, afterEach } from "vitest";
import apiClient, { TIMEOUT_GET_MS } from "../src/service/apiClient";

// El timeout decide si un backend caido se traduce en un error visible o en
// una pantalla que se queda cargando para siempre. Se fija por METODO: los GET
// pueden abortar sin consecuencias, los que escriben datos no.
describe("apiClient - timeout de las peticiones", () => {
  const adapterOriginal = apiClient.defaults.adapter;
  let capturadas;

  beforeEach(() => {
    capturadas = [];
    // Adapter trampa: no hay red, solo se registra la config que axios le pasa
    apiClient.defaults.adapter = (config) => {
      capturadas.push(config);
      return Promise.resolve({
        data: {},
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      });
    };
  });

  afterEach(() => {
    apiClient.defaults.adapter = adapterOriginal;
  });

  test("1. un GET lleva timeout: si el backend no responde llega un error, no una espera infinita", async () => {
    await apiClient.get("/api/estadisticas");

    expect(capturadas).toHaveLength(1);
    expect(capturadas[0].timeout).toBe(TIMEOUT_GET_MS);
    // El literal, aparte de la constante: si alguien baja el tope a 300 ms el
    // test tiene que quebrarse, no quedarse verde
    expect(capturadas[0].timeout).toBe(15000);
    // Generoso a propósito: un falso negativo en la demo es peor que esperar
    expect(capturadas[0].timeout).toBeGreaterThanOrEqual(10000);
  });

  // Abortar un POST a mitad de camino deja el pedido en el servidor pero no en
  // el cliente: el reintento lo duplica. Estos dos fijan el comportamiento que
  // ya existia para que el timeout del GET no se cuelgue en los demas verbos.
  test("2. un POST no lleva timeout: no se puede cortar el alta de un pedido a medias", async () => {
    await apiClient.post("/api/pedidos", { total: 1000 });

    expect(capturadas[0].timeout).toBe(0);
  });

  test("3. un PATCH tampoco: el cambio de estado no se interrumpe a medias", async () => {
    await apiClient.patch("/api/pedidos/1/estado", { estado: "RECIBIDO" });

    expect(capturadas[0].timeout).toBe(0);
  });

  test("4. un PUT tampoco: guardar una meta no se corta a mitad", async () => {
    await apiClient.put("/api/estadisticas/metas", { dia: 100000 });

    expect(capturadas[0].timeout).toBe(0);
  });

  test("5. un DELETE tampoco: eliminar un producto no queda a medias", async () => {
    await apiClient.delete("/api/productos/7");

    expect(capturadas[0].timeout).toBe(0);
  });
});
