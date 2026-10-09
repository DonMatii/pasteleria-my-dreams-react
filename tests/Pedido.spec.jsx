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
  screen.findByRole("button", { name: /Selva Negra/i });

// Nuevo flujo: elegir tarjeta, poner cantidad y agregar al carrito
const agregarProducto = (nombre, cantidad = "1") => {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(nombre, "i") }));
  fireEvent.change(screen.getByLabelText(/^Cantidad:/i), {
    target: { value: cantidad },
  });
  fireEvent.click(screen.getByRole("button", { name: /Agregar al pedido/i }));
};

const llenarFormularioValido = async () => {
  fireEvent.change(await screen.findByLabelText(/Nombre del Cliente/i), {
    target: { value: "Catherine Test" },
  });
  fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
    target: { value: "cat@test.com" },
  });
  await esperarCatalogo();
  agregarProducto("Selva Negra", "2");
};

describe("Pruebas de Formulario de Pedido - My Dreams (RF-07)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obtenerProductos.mockResolvedValue(catalogoDePrueba);
    // Estado limpio: sin flag de primera conexion ni codigo de bienvenida
    localStorage.clear();
  });

  test("1. Debe renderizar la página y poblar las tarjetas con el catálogo", async () => {
    render(<Pedido />);

    expect(screen.getByText(/¡Haz tu pedido!/i)).toBeInTheDocument();
    const tarjetaSelva = await esperarCatalogo();
    expect(screen.getByRole("button", { name: /Manjar Lúcuma/i })).toBeInTheDocument();
    // La tarjeta muestra el precio del producto
    expect(tarjetaSelva).toHaveTextContent("$15.000");
    // Ninguna tarjeta empieza seleccionada
    expect(tarjetaSelva).toHaveAttribute("aria-pressed", "false");
  });

  test("2. La validación bloquea el envío y muestra los errores", async () => {
    global.fetch = vi.fn();

    render(<Pedido />);
    await esperarCatalogo();

    fireEvent.click(screen.getByRole("button", { name: /Registrar pedido/i }));

    expect(await screen.findByText(/Por favor, ingresa tu nombre/i)).toBeInTheDocument();
    expect(screen.getByText(/Ingresa un correo electrónico válido/i)).toBeInTheDocument();
    expect(screen.getByText(/Agrega al menos un producto a tu pedido/i)).toBeInTheDocument();

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
        codigoConsulta: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
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
      expect.objectContaining({
        icon: "success",
        title: "¡Pedido registrado!",
        // El modal muestra el codigo opaco de seguimiento (proteccion IDOR)
        text: expect.stringContaining("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"),
      })
    );

    // El formulario se resetea después del éxito: carrito vacío
    expect(screen.getByLabelText(/Nombre del Cliente/i)).toHaveValue("");
    expect(screen.getByLabelText(/Correo Electrónico/i)).toHaveValue("");
    expect(
      screen.getByRole("button", { name: /Selva Negra/i })
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByTestId("carrito-pedido")).not.toBeInTheDocument();
  });

  test("3b. Acepta varios productos en un mismo pedido (carrito)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({
        id: 9,
        total: 42000,
        productos: [],
        eventoPublicado: true,
        codigoConsulta: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      }),
    });

    render(<Pedido />);
    // Llenar datos de contacto primero
    fireEvent.change(await screen.findByLabelText(/Nombre del Cliente/i), {
      target: { value: "Catherine Test" },
    });
    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
      target: { value: "cat@test.com" },
    });
    await esperarCatalogo();

    // Dos productos distintos: Selva Negra x2 + Manjar Lúcuma x1
    agregarProducto("Selva Negra", "2");
    agregarProducto("Manjar Lúcuma", "1");

    // El total suma los dos items (30000 + 12000)
    expect(screen.getByTestId("total-pedido")).toHaveTextContent("42.000");

    fireEvent.click(screen.getByRole("button", { name: /Registrar pedido/i }));

    // El body lleva la lista COMPLETA que el backend espera
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      const cuerpo = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(cuerpo.productos).toEqual([
        { nombre: "Selva Negra", cantidad: 2, precioUnitario: 15000 },
        { nombre: "Manjar Lúcuma", cantidad: 1, precioUnitario: 12000 },
      ]);
    });
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

  test("6. El código de bienvenida prellenado aplica -10% y se consume tras el éxito", async () => {
    // Ganado en la primera conexión (BienvenidaService)
    localStorage.setItem("md_codigo_bienvenida", "BIENVENIDO10");

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({
        id: 8,
        total: 27000,
        productos: [],
        eventoPublicado: true,
        codigoConsulta: "ffffffffffffffffffffffffffffffff",
      }),
    });

    render(<Pedido />);
    await llenarFormularioValido();

    // El código viene prellenado y el ahorro se ve en vivo (30000 - 10%)
    expect(screen.getByLabelText(/Código de descuento/i)).toHaveValue("BIENVENIDO10");
    expect(screen.getByTestId("descuento-bienvenida")).toHaveTextContent("-$3.000");
    expect(screen.getByTestId("total-final")).toHaveTextContent("$27.000");

    fireEvent.click(screen.getByRole("button", { name: /Registrar pedido/i }));

    // El cuerpo del POST incluye el código para que el backend lo persista
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      const cuerpo = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(cuerpo.codigoDescuento).toBe("BIENVENIDO10");
    });

    // Se consume el código: la próxima compra ya no tendrá descuento
    expect(localStorage.getItem("md_codigo_bienvenida")).toBeNull();

    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: "success",
        text: expect.stringContaining("descuento de bienvenida"),
      })
    );
  });

  test("7. Un código desconocido bloquea el envío sin llamar al backend", async () => {
    global.fetch = vi.fn();

    render(<Pedido />);
    await llenarFormularioValido();

    fireEvent.change(screen.getByLabelText(/Código de descuento/i), {
      target: { value: "AHORRO50" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Registrar pedido/i }));

    expect(await screen.findByText(/Código de descuento inválido/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("8. El código de bienvenida ya canjeado bloquea el re-ingreso", async () => {
    // Primera conexión ya gastada en este navegador: flag presente, código ausente
    localStorage.setItem("md_primera_conexion", "1");
    global.fetch = vi.fn();

    render(<Pedido />);
    await llenarFormularioValido();

    fireEvent.change(screen.getByLabelText(/Código de descuento/i), {
      target: { value: "BIENVENIDO10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Registrar pedido/i }));

    expect(await screen.findByText(/ya fue canjeado/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
    // Tampoco se muestra el ahorro en vivo: no hay código disponible
    expect(screen.queryByTestId("descuento-bienvenida")).not.toBeInTheDocument();
  });
});
