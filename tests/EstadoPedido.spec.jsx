/* eslint-disable no-undef */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi, describe, test, expect, beforeEach } from "vitest";
import EstadoPedido from "../src/pages/EstadoPedido";

const URL_SEGUIMIENTO = `${import.meta.env.VITE_API_BASE_URL}/api/pedidos/seguimiento`;

// Respuesta simulada de GET /api/pedidos/seguimiento/{codigo} (PedidoResponse del backend)
const pedidoDePrueba = {
  id: 7,
  cliente: "Catherine Test",
  email: "cat@test.com",
  fecha: "2026-10-01T15:30:00",
  total: 30000,
  codigoConsulta: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  productos: [
    { nombre: "Selva Negra", cantidad: 2, precioUnitario: 15000, subtotal: 30000 },
  ],
  eventoPublicado: true,
  estado: "EN_PREPARACION",
};

const consultar = (codigo) => {
  fireEvent.change(screen.getByLabelText(/Código de seguimiento/i), {
    target: { value: codigo },
  });
  fireEvent.click(screen.getByRole("button", { name: /Consultar/i }));
};

describe("Pruebas de Consulta de Estado de Pedido - My Dreams (RF-11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("1. Debe renderizar el input de código y el botón de consulta", () => {
    render(<EstadoPedido />);

    expect(screen.getByLabelText(/Código de seguimiento/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Consultar/i })).toBeInTheDocument();
    expect(screen.getByText(/Consulta tu pedido/i)).toBeInTheDocument();
  });

  test("2. Un código vacío muestra la validación y no llama a la API", () => {
    global.fetch = vi.fn();

    render(<EstadoPedido />);
    fireEvent.click(screen.getByRole("button", { name: /Consultar/i }));

    expect(screen.getByText(/Ingresa tu código de seguimiento/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("3. Código válido: consulta por el código opaco y muestra badge, detalle y total", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(pedidoDePrueba),
    });

    render(<EstadoPedido />);
    consultar("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4");

    // La consulta NUNCA usa el id secuencial: va contra el codigo opaco (anti-IDOR)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${URL_SEGUIMIENTO}/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4`
      );
    });

    expect(await screen.findByTestId("estado-badge")).toHaveTextContent(
      "En preparación"
    );
    expect(screen.getByTestId("total-estado")).toHaveTextContent("$30.000");
    expect(screen.getByText(/Catherine Test/)).toBeInTheDocument();
    expect(screen.getByText(/Selva Negra/)).toBeInTheDocument();
  });

  test("4. Un 404 muestra el mensaje amable sin errores crudos", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: vi.fn().mockResolvedValue(null),
    });

    render(<EstadoPedido />);
    consultar("codigo-inexistente-000");

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${URL_SEGUIMIENTO}/codigo-inexistente-000`
      );
    });

    expect(
      await screen.findByText("No encontramos un pedido con ese código.")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("estado-badge")).not.toBeInTheDocument();
  });

  test("5. Un fallo de red muestra el mensaje de error de conexión", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("sin red"));

    render(<EstadoPedido />);
    consultar("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4");

    expect(await screen.findByText(/Error de conexión/i)).toBeInTheDocument();
    // El botón vuelve a habilitarse
    expect(screen.getByRole("button", { name: /Consultar/i })).toBeEnabled();
  });
});
