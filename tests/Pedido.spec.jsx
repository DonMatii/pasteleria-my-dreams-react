/* eslint-disable no-undef */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi, describe, test, expect, beforeEach } from "vitest";
import Pedido from "../src/pages/Pedido";
import { obtenerProductos } from "../src/service/ProductosService";
import Swal from "sweetalert2";

// Mockeamos el servicio del catálogo: el select nunca debe pegar a la API real
vi.mock("../src/service/ProductosService", () => ({
  obtenerProductos: vi.fn(),
}));

// Mock de SweetAlert2 para que no explote en el test
vi.mock("sweetalert2", () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

// Respuesta simulada de GET /api/productos (Map agrupado por categoría)
const catalogoDePrueba = {
  Tortas: [
    { id: 1, nombre: "Selva Negra", precio: 15000 },
    { id: 2, nombre: "Manjar Lúcuma", precio: 12000 },
  ],
};

const URL_PEDIDOS = `${import.meta.env.VITE_API_BASE_URL}/api/pedidos`;

const esperarCatalogo = () =>
  screen.findByRole("option", { name: /Selva Negra/i });

const llenarFormularioValido = async () => {
  fireEvent.change(await screen.findByLabelText(/Nombre del Cliente/i), {
    target: { value: "Catherine Test" },
  });
  fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
    target: { value: "cat@test.com" },
  });
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText(/Cantidad/i), { target: { value: "2" } });
};

describe("Pruebas de Formulario de Pedido - My Dreams (RF-07)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obtenerProductos.mockResolvedValue(catalogoDePrueba);
  });

  test("1. Debe renderizar la página y poblar el select con el catálogo", async () => {
    render(<Pedido />);

    expect(screen.getByText(/¡Haz tu pedido!/i)).toBeInTheDocument();
    expect(await esperarCatalogo()).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Manjar Lúcuma/i })).toBeInTheDocument();
    // Precio visible en la opción del select
    expect(screen.getByRole("option", { name: /Selva Negra/i })).toHaveTextContent(
      "$15.000"
    );
  });

  test("2. La validación bloquea el envío y muestra los errores", async () => {
    global.fetch = vi.fn();

    render(<Pedido />);
    await esperarCatalogo();

    fireEvent.click(screen.getByRole("button", { name: /Registrar pedido/i }));

    expect(await screen.findByText(/Por favor, ingresa tu nombre/i)).toBeInTheDocument();
    expect(screen.getByText(/Ingresa un correo electrónico válido/i)).toBeInTheDocument();
    expect(screen.getByText(/Selecciona un producto para tu pedido/i)).toBeInTheDocument();

    // Nada se envía si la validación falla
    expect(global.fetch).not.toHaveBeenCalled();
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ icon: "warning", title: "Formulario incompleto" })
    );
  });

  test("3. Envío exitoso: POST con el body exacto del contrato y Swal de éxito", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({
        id: 7,
        cliente: "Catherine Test",
        email: "cat@test.com",
        total: 30000,
        productos: [],
        eventoPublicado: true,
      }),
    });

    render(<Pedido />);
    await llenarFormularioValido();

    // Total en vivo: precioUnitario (15000) × cantidad (2)
    expect(screen.getByTestId("total-pedido")).toHaveTextContent("30.000");

    fireEvent.click(screen.getByRole("button", { name: /Registrar pedido/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        URL_PEDIDOS,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cliente: "Catherine Test",
            email: "cat@test.com",
            productos: [
              { nombre: "Selva Negra", cantidad: 2, precioUnitario: 15000 },
            ],
          }),
        })
      );
    });

    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ icon: "success", title: "¡Pedido registrado!" })
    );

    // El formulario se resetea después del éxito
    expect(screen.getByLabelText(/Nombre del Cliente/i)).toHaveValue("");
    expect(screen.getByLabelText(/Correo Electrónico/i)).toHaveValue("");
    expect(screen.getByRole("combobox")).toHaveValue("");
    expect(screen.getByLabelText(/Cantidad/i)).toHaveValue(1);
  });

  test("4. Un 400 del backend muestra el mensaje que devuelve la API", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi
        .fn()
        .mockResolvedValue({ mensaje: "La cantidad de cada producto debe ser al menos 1" }),
    });

    render(<Pedido />);
    await llenarFormularioValido();

    fireEvent.click(screen.getByRole("button", { name: /Registrar pedido/i }));

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        "Error",
        "La cantidad de cada producto debe ser al menos 1",
        "error"
      );
    });
  });

  test("5. Un fallo de red muestra el Swal de error de conexión", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("sin red"));

    render(<Pedido />);
    await llenarFormularioValido();

    fireEvent.click(screen.getByRole("button", { name: /Registrar pedido/i }));

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith("Error", "Error de conexión.", "error");
    });

    // El botón vuelve a habilitarse
    expect(screen.getByRole("button", { name: /Registrar pedido/i })).toBeEnabled();
  });
});
