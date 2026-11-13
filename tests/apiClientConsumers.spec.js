import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

import apiClient, { URL_BASE, TIMEOUT_GET_MS } from "../src/service/apiClient";
import { loginAdmin } from "../src/service/AuthService";
import { verificarElegibilidadBienvenida } from "../src/service/BienvenidaService";
import {
  obtenerProductos,
  obtenerDeliciaDelDia,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
} from "../src/service/ProductosService";
import { obtenerEstadisticas, guardarMetas } from "../src/service/EstadisticasService";
import {
  obtenerPedidos,
  cambiarEstadoPedido,
  obtenerVentasPorProducto,
} from "../src/service/PedidosService";

// apiClient es UNA sola instancia compartida por todos los servicios. Si el
// interceptor cambia de forma el dano no se ve en un archivo: se ve en cualquier
// flujo que la peticion no menciono (login, bienvenida, catalogo, estadisticas).
// Este test fija el contrato de esos consumidores: mismo timeout por verbo,
// mismos headers y misma base URL, sin tocar el exito de ninguna llamada.
describe("apiClient - contrato de los consumidores compartidos", () => {
  const adapterOriginal = apiClient.defaults.adapter;
  let capturadas;

  const buscar = (method, url) =>
    capturadas.find((l) => l.method === method && l.url === url);

  beforeEach(() => {
    capturadas = [];
    // Adapter trampa: no hay red, solo se registra la configuracion que axios
    // le pasaria al transporte
    apiClient.defaults.adapter = (config) => {
      capturadas.push({
        method: config.method,
        url: config.url,
        timeout: config.timeout,
        headers: config.headers.toJSON(),
        data: config.data,
        params: config.params,
        baseURL: config.baseURL,
      });
      return Promise.resolve({
        data: {},
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      });
    };

    // La clave la inyecta el entorno (VITE_ADMIN_API_KEY). Se stubbea para que
    // la asercion compare contra un valor conocido y no contra undefined.
    vi.stubEnv("VITE_ADMIN_API_KEY", "test-admin-key");
    sessionStorage.setItem("userToken", "sesion.jwt.google");
  });

  afterEach(() => {
    apiClient.defaults.adapter = adapterOriginal;
    vi.unstubAllEnvs();
    sessionStorage.clear();
  });

  test("los exports que consumen las páginas siguen intactos", () => {
    // Pedido.jsx y EstadoPedido.jsx importan URL_BASE para armar sus fetch:
    // renombrarlo o quitarlo romperia esas dos paginas
    expect(URL_BASE).toBe(import.meta.env.VITE_API_BASE_URL);
    expect(TIMEOUT_GET_MS).toBe(15000);
  });

  test("cada consumidor conserva su timeout por verbo, sus headers y su base URL", async () => {
    await loginAdmin("admin", "secreto");
    await verificarElegibilidadBienvenida("ana@ejemplo.cl");
    await obtenerProductos();
    await obtenerDeliciaDelDia();
    await obtenerEstadisticas();
    await guardarMetas({ dia: 100000 });
    await obtenerPedidos();
    await cambiarEstadoPedido(7, "RECIBIDO");
    await obtenerVentasPorProducto("2026-11-01", "2026-11-07");
    await crearProducto({ nombre: "Torta" });
    await actualizarProducto(7, { nombre: "Torta v2" });
    await eliminarProducto(7);

    // Los GET llevan tope: es lo que hace visible un servicio colgado en vez
    // de dejar la pantalla cargando para siempre
    const getEsperados = [
      "/api/pedidos/bienvenida/estado",
      "/api/productos",
      "/api/productos/delicia-del-dia",
      "/api/estadisticas",
      "/api/pedidos",
      "/api/pedidos/estadisticas/productos",
    ];
    for (const url of getEsperados) {
      const l = buscar("get", url);
      expect(l, `GET ${url} no fue capturado`).toBeTruthy();
      expect(l.timeout, `GET ${url}`).toBe(TIMEOUT_GET_MS);
      expect(l.baseURL, `GET ${url}`).toBe(URL_BASE);
      expect(l.headers.Authorization, `GET ${url}`).toBe("Bearer sesion.jwt.google");
      expect(l.headers["X-Api-Key"], `GET ${url}`).toBe("test-admin-key");
    }

    // Los que escriben datos no se cortan a mitad de camino: abortar un alta
    // deja el cambio en el servidor y no en el cliente, y el reintento lo repite
    const escriturasEsperadas = [
      ["post", "/api/auth/login"],
      ["put", "/api/estadisticas/metas"],
      ["patch", "/api/pedidos/7/estado"],
      ["post", "/api/productos"],
      ["put", "/api/productos/7"],
      ["delete", "/api/productos/7"],
    ];
    for (const [method, url] of escriturasEsperadas) {
      const l = buscar(method, url);
      expect(l, `${method.toUpperCase()} ${url} no fue capturado`).toBeTruthy();
      expect(l.timeout, `${method.toUpperCase()} ${url}`).toBe(0);
      expect(l.baseURL, `${method.toUpperCase()} ${url}`).toBe(URL_BASE);
    }
  });

  // El body viaja igual que antes: el interceptor solo agrega headers y timeout
  test("el interceptor no altera el body ni los params de las llamadas", async () => {
    await loginAdmin("admin", "secreto");
    await obtenerVentasPorProducto("2026-11-01", "2026-11-07");

    expect(buscar("post", "/api/auth/login").data).toBe(
      JSON.stringify({ username: "admin", password: "secreto" })
    );
    expect(buscar("get", "/api/pedidos/estadisticas/productos").params).toEqual({
      desde: "2026-11-01",
      hasta: "2026-11-07",
    });
  });
});
