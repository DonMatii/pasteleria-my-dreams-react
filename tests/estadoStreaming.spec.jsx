/* eslint-disable no-undef */
import React from "react";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";
import EstadoPedido from "../src/pages/EstadoPedido";
import { VersionProvider } from "../src/context/VersionContext";
import { obtenerProductos } from "../src/service/ProductosService";
import apiClient from "../src/service/apiClient";

// Misma idea que EstadoPedido.spec: la página resuelve las fotos contra el
// catálogo, que entra por axios. Se mockea para no depender de la red.
vi.mock("../src/service/ProductosService", async (importOriginal) => ({
  ...(await importOriginal()),
  obtenerProductos: vi.fn(),
}));

// apiClient aporta URL_BASE (con ella la página arma la URL de seguimiento) y el
// GET de versión que usa VersionProvider. Mismo patrón que versionGating.spec.
vi.mock("../src/service/apiClient", () => ({
  default: { get: vi.fn() },
  URL_BASE: "http://test",
}));

const URL_SEGUIMIENTO = "http://test/api/pedidos/seguimiento";

// Respuesta simulada de GET /api/pedidos/seguimiento/{codigo} (PedidoResponse)
const pedidoDePrueba = {
  id: 7,
  cliente: "Catherine Test",
  email: "cat@test.com",
  fecha: "2026-10-01T15:30:00Z",
  total: 30000,
  codigoConsulta: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  productos: [
    { nombre: "Selva Negra", cantidad: 2, precioUnitario: 15000, subtotal: 30000 },
  ],
  eventoPublicado: true,
  estado: "EN_PREPARACION",
};

const respuestaJson = (datos) => ({
  ok: true,
  status: 200,
  json: vi.fn().mockResolvedValue(datos),
});

const consultar = (codigo) => {
  fireEvent.change(screen.getByLabelText(/Código de seguimiento/i), {
    target: { value: codigo },
  });
  fireEvent.click(screen.getByRole("button", { name: /Consultar/i }));
};

// Actualizaciones en vivo por streaming (S4, solo Versión 3): el resultado del
// seguimiento incorpora un feed que registra cada cambio de estado que trae el
// sondeo del endpoint público. Sin la versión 3 se explica el motivo en el mismo
// lugar, sin romper el seguimiento por código que ya tenían las versiones previas.
describe("Actualizaciones en vivo por streaming de datos (Versión 3, S4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // Por defecto el catálogo no devuelve nada: los productos van sin foto
    obtenerProductos.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test("1. sin provider (contexto por defecto = todo habilitado): tras buscar un pedido aparece la sección en vivo", async () => {
    global.fetch = vi.fn().mockResolvedValue(respuestaJson(pedidoDePrueba));

    render(<EstadoPedido />);
    consultar("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4");

    expect(await screen.findByTestId("actualizaciones-stream")).toBeInTheDocument();
    expect(screen.getByText("Actualizaciones en vivo")).toBeInTheDocument();
    expect(screen.queryByTestId("actualizaciones-note")).not.toBeInTheDocument();
  });

  test("2. provider con versión 2: aparece la nota y NO la sección en vivo", async () => {
    sessionStorage.setItem("userEmail", "mat.suazog@duocuc.cl");
    sessionStorage.setItem("userRole", "cliente");
    apiClient.get.mockResolvedValue({
      data: { email: "mat.suazog@duocuc.cl", version: 2 },
    });
    global.fetch = vi.fn().mockResolvedValue(respuestaJson(pedidoDePrueba));

    render(
      <VersionProvider>
        <EstadoPedido />
      </VersionProvider>
    );
    // La versión real llega por apiClient: hay que esperar a que se asiente
    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith("/api/usuarios/version", {
        params: { email: "mat.suazog@duocuc.cl" },
      })
    );

    consultar("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4");

    const nota = await screen.findByTestId("actualizaciones-note");
    expect(nota).toHaveTextContent(
      "Las actualizaciones en vivo por streaming de datos son de la Versión 3. Tu versión sigue el pedido con el código de seguimiento."
    );
    expect(screen.queryByTestId("actualizaciones-stream")).not.toBeInTheDocument();
  });

  test("3. provider con versión 3: aparece la sección en vivo y no la nota", async () => {
    sessionStorage.setItem("userEmail", "contacto.donmatii@gmail.com");
    sessionStorage.setItem("userRole", "cliente");
    apiClient.get.mockResolvedValue({
      data: { email: "contacto.donmatii@gmail.com", version: 3 },
    });
    global.fetch = vi.fn().mockResolvedValue(respuestaJson(pedidoDePrueba));

    render(
      <VersionProvider>
        <EstadoPedido />
      </VersionProvider>
    );
    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith("/api/usuarios/version", {
        params: { email: "contacto.donmatii@gmail.com" },
      })
    );

    consultar("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4");

    expect(await screen.findByTestId("actualizaciones-stream")).toBeInTheDocument();
    expect(screen.queryByTestId("actualizaciones-note")).not.toBeInTheDocument();
  });

  test("4. el polling agrega una entrada al feed cuando el estado cambia entre respuestas", async () => {
    vi.useFakeTimers();

    // Consulta inicial y primer sondeo siguen en EN_PREPARACION; desde el
    // segundo sondeo el pedido pasa a ENTREGADO (lo que haría el admin).
    global.fetch = vi.fn()
      .mockResolvedValueOnce(respuestaJson(pedidoDePrueba))
      .mockResolvedValueOnce(respuestaJson(pedidoDePrueba))
      .mockResolvedValue(respuestaJson({ ...pedidoDePrueba, estado: "ENTREGADO" }));

    render(<EstadoPedido />);
    consultar("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4");

    // La consulta inicial resuelve por microtareas: no requiere avanzar relojes
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByTestId("actualizaciones-stream")).toBeInTheDocument();
    expect(screen.queryAllByTestId("actualizacion-item")).toHaveLength(0);

    // Primer sondeo (5 s): el estado sigue igual → el feed sigue vacío
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.queryAllByTestId("actualizacion-item")).toHaveLength(0);

    // Segundo sondeo (10 s): el estado cambió → el feed registra la actualización
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    const entradas = screen.getAllByTestId("actualizacion-item");
    expect(entradas).toHaveLength(1);
    expect(entradas[0]).toHaveTextContent("Entregado");
    // El sondeo usa el mismo endpoint público que la consulta manual
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch).toHaveBeenLastCalledWith(
      `${URL_SEGUIMIENTO}/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4`
    );
  });
});
