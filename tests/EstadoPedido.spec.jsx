/* eslint-disable no-undef */
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi, describe, test, expect, beforeEach } from "vitest";
import EstadoPedido from "../src/pages/EstadoPedido";
import { obtenerProductos } from "../src/service/ProductosService";

// La página resuelve la foto de cada producto contra el catálogo, porque el
// pedido solo guarda nombre, cantidad y precio. Se mockea para controlar qué
// fotos encuentra. AplanarCatalogo queda real, igual que en Pedido.spec.
vi.mock("../src/service/ProductosService", async (importOriginal) => ({
  ...await importOriginal(),
  obtenerProductos: vi.fn(),
}));

const URL_SEGUIMIENTO = `${import.meta.env.VITE_API_BASE_URL}/api/pedidos/seguimiento`;

// Respuesta simulada de GET /api/pedidos/seguimiento/{codigo} (PedidoResponse del backend)
const pedidoDePrueba = {
  id: 7,
  cliente: "Catherine Test",
  email: "cat@test.com",
  // UTC con sufijo Z: el formato real que devuelve PedidoResponse
  fecha: "2026-10-01T15:30:00Z",
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
    // Por defecto el catálogo no devuelve nada: los productos van sin foto
    obtenerProductos.mockResolvedValue({});
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
    // El título no expone el número interno: el cliente llegó con su código
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Tu pedido"
    );
    expect(screen.queryByText(/N°/)).not.toBeInTheDocument();
    // Sin descuento no hay desglose: solo el total
    expect(screen.queryByTestId("descuento-estado")).not.toBeInTheDocument();
    expect(screen.queryByTestId("subtotal-estado")).not.toBeInTheDocument();
  });

  test("6. Un pedido con descuento muestra el desglose completo", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        ...pedidoDePrueba,
        subtotal: 30000,
        descuento: 3000,
        descuentoBienvenida: 3000,
        descuentoDelicia: 0,
        codigoDescuento: "BIENVENIDO10",
        total: 27000,
      }),
    });

    render(<EstadoPedido />);
    consultar("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4");

    // El total no cuadra con la suma de items: hay que explicar por qué (subtotal - descuento)
    expect(await screen.findByTestId("subtotal-estado")).toHaveTextContent("$30.000");
    expect(screen.getByTestId("descuento-estado")).toHaveTextContent("-$3.000");
    expect(screen.getByText(/BIENVENIDO10/)).toBeInTheDocument();
    expect(screen.getByTestId("total-estado")).toHaveTextContent("$27.000");
  });

  test("6b. Un pedido que solo usa la Delicia del Día ve ese nombre, no bienvenida", async () => {
    // Caso real: correo que ya canjeó BIENVENIDO10; solo corre el -10% del día
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        ...pedidoDePrueba,
        subtotal: 192500,
        descuento: 19250,
        descuentoBienvenida: 0,
        descuentoDelicia: 19250,
        codigoDescuento: null,
        total: 173250,
      }),
    });

    render(<EstadoPedido />);
    consultar("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4");

    expect(await screen.findByTestId("descuento-delicia-estado")).toHaveTextContent(
      "Descuento Delicia del Día (-10%)"
    );
    expect(screen.getByTestId("descuento-delicia-estado")).toHaveTextContent(
      "-$19.250"
    );
    // El resumen no llama "bienvenida" a un descuento que no lo es
    expect(screen.queryByText(/bienvenida/i)).not.toBeInTheDocument();
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

  test("7. La línea de avance marca las etapas completadas y la actual", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(pedidoDePrueba),
    });

    render(<EstadoPedido />);
    consultar("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4");

    const progreso = await screen.findByTestId("estado-progreso");
    const pasos = within(progreso).getAllByRole("listitem");
    expect(pasos).toHaveLength(4);
    // Recibido ya pasó, En preparación es la actual, las otras dos no
    expect(pasos[0]).toHaveClass("estado-paso-hecho");
    expect(pasos[1]).toHaveClass("estado-paso-actual");
    expect(pasos[1]).toHaveTextContent("En preparación");
    expect(pasos[2]).not.toHaveClass("estado-paso-hecho");
    expect(pasos[3]).not.toHaveClass("estado-paso-hecho");
  });

  test("7b. Los datos del pedido se leen en dos columnas (etiqueta y valor)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(pedidoDePrueba),
    });

    render(<EstadoPedido />);
    consultar("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4");

    const filaCliente = (await screen.findByText("Cliente")).closest("li");
    expect(filaCliente).toHaveTextContent("Catherine Test");
  });

  test("8. La fecha se muestra en hora de Chile, no en la hora del servidor", async () => {
    // El backend manda el instante en UTC con sufijo Z. Aquí 15:30 UTC son
    // 12:30 en Chile: ver 12:30 es el contrato; ver 15:30 (hora del servidor)
    // o 9:30 (offset aplicado dos veces) es el bug.
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(pedidoDePrueba),
    });

    render(<EstadoPedido />);
    consultar("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4");

    const filaFecha = (await screen.findByText("Fecha")).closest("li");
    expect(filaFecha).toHaveTextContent("1 de octubre de 2026 a las 12:30 p. m.");
  });

  test("9. Los productos muestran la foto del catálogo, resuelta por nombre", async () => {
    // El pedido no guarda la foto: se busca en el catálogo por el nombre pedido
    obtenerProductos.mockResolvedValue({
      tortas: [
        {
          id: 1,
          nombre: "Selva Negra",
          precio: 15000,
          imagenUrl: "selva.jpg",
          categoria: "tortas",
        },
      ],
    });

    const { container } = render(<EstadoPedido />);
    consultar("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4");

    await waitFor(() =>
      expect(container.querySelectorAll(".estado-producto-img")).toHaveLength(1)
    );
    expect(container.querySelector(".estado-producto-img")).toHaveAttribute(
      "src",
      "/img/selva.jpg"
    );
  });

  test("9b. Un producto ausente del catálogo se lista sin foto, no con una rota", async () => {
    // Pedido viejo, o producto renombrado/eliminado desde el panel: sin foto
    obtenerProductos.mockResolvedValue({ tortas: [] });

    const { container } = render(<EstadoPedido />);
    consultar("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4");

    await screen.findByText("Selva Negra");
    expect(container.querySelectorAll(".estado-producto-img")).toHaveLength(0);
  });
});
