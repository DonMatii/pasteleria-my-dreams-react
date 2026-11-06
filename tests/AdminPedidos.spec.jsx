import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi, describe, test, expect, beforeEach } from "vitest";
import AdminPedidos from "../src/components/AdminPedidos";
import { obtenerPedidos, cambiarEstadoPedido } from "../src/service/PedidosService";
import Swal from "sweetalert2";

vi.mock("../src/service/PedidosService", () => ({
  obtenerPedidos: vi.fn(),
  cambiarEstadoPedido: vi.fn(),
}));

vi.mock("sweetalert2", () => ({
  default: { fire: vi.fn() },
}));

// Un pedido tal y como lo devuelve PedidoResponse del backend
const pedidoDaniela = {
  id: 301,
  cliente: "Daniela Soto",
  email: "daniela@ejemplo.cl",
  fecha: "2026-10-30T14:05:00Z",
  total: 33990,
  estado: "RECIBIDO",
  codigoConsulta: "0a1b2c3d4e5f60718293a4b5c6d7e8f9",
  productos: [{ nombre: "Torta de chocolate", cantidad: 1, precioUnitario: 18990, subtotal: 18990 }],
};

const pedidoRaul = {
  id: 302,
  cliente: "Raul Pino",
  email: "raul@ejemplo.cl",
  fecha: "2026-10-29T10:00:00Z",
  total: 9980,
  estado: "DESPACHADO",
  productos: [{ nombre: "Kuchen de manzana", cantidad: 2, precioUnitario: 4990, subtotal: 9980 }],
};

describe("AdminPedidos - gestion de estados desde el panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obtenerPedidos.mockResolvedValue([pedidoDaniela, pedidoRaul]);
    cambiarEstadoPedido.mockResolvedValue({ ...pedidoDaniela, estado: "EN_PREPARACION" });
    Swal.fire.mockResolvedValue({ isConfirmed: true });
  });

  test("1. Lista cada pedido con el nombre y el email de quien lo compró", async () => {
    render(<AdminPedidos />);

    expect(await screen.findByText("Daniela Soto")).toBeInTheDocument();
    expect(screen.getByText("daniela@ejemplo.cl")).toBeInTheDocument();
    expect(screen.getByText("Raul Pino")).toBeInTheDocument();
    expect(screen.getByText("raul@ejemplo.cl")).toBeInTheDocument();
    expect(obtenerPedidos).toHaveBeenCalledTimes(1);
  });

  test("2. Muestra el estado actual de cada pedido", async () => {
    render(<AdminPedidos />);

    await screen.findByText("Daniela Soto");
    // RECIBIDO vs DESPACHADO: cada fila marca el suyo
    expect(screen.getAllByTestId("estado-actual")[0]).toHaveTextContent("Recibido");
    expect(screen.getAllByTestId("estado-actual")[1]).toHaveTextContent("Despachado");
  });

  test("3. Ofrece los 4 estados como opciones en un select por pedido", async () => {
    render(<AdminPedidos />);

    await screen.findByText("Daniela Soto");
    const fila = screen.getByText("Daniela Soto").closest("tr");
    expect(fila).toBeInTheDocument();
    const select = fila.querySelector("select.admin-pedidos-estado-select");
    expect(select).toBeInTheDocument();
    expect(select.querySelectorAll("option")).toHaveLength(4);
  });

  test("4. Al elegir un estado pide confirmación antes de aplicarlo", async () => {
    render(<AdminPedidos />);

    await screen.findByText("Daniela Soto");
    const fila = screen.getByText("Daniela Soto").closest("tr");
    const select = fila.querySelector("select.admin-pedidos-estado-select");
    fireEvent.change(select, { target: { value: "ENTREGADO" } });

    await waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(1));
    const confirmacion = Swal.fire.mock.calls[0][0];
    expect(confirmacion.title).toMatch(/Entregado/i);
    expect(confirmacion.showCancelButton).toBe(true);
    // La ventana aclara que al cliente le va a llegar un correo
    expect(confirmacion.text).toMatch(/correo/i);
  });

  test("5. Confirmado: llama al PATCH con el id del pedido y el estado elegido", async () => {
    render(<AdminPedidos />);

    await screen.findByText("Daniela Soto");
    const fila = screen.getByText("Daniela Soto").closest("tr");
    const select = fila.querySelector("select.admin-pedidos-estado-select");
    fireEvent.change(select, { target: { value: "ENTREGADO" } });

    await waitFor(() => {
      expect(cambiarEstadoPedido).toHaveBeenCalledWith(301, "ENTREGADO");
    });
  });

  test("6. Cancelado: no cambia nada", async () => {
    Swal.fire.mockResolvedValue({ isConfirmed: false });
    render(<AdminPedidos />);

    await screen.findByText("Daniela Soto");
    const fila = screen.getByText("Daniela Soto").closest("tr");
    const select = fila.querySelector("select.admin-pedidos-estado-select");
    fireEvent.change(select, { target: { value: "ENTREGADO" } });

    await waitFor(() => expect(Swal.fire).toHaveBeenCalled());
    expect(cambiarEstadoPedido).not.toHaveBeenCalled();
  });

  test("7. Tras el cambio vuelve a pedir la lista para ver el estado reflejado", async () => {
    render(<AdminPedidos />);

    await screen.findByText("Daniela Soto");
    const fila = screen.getByText("Daniela Soto").closest("tr");
    const select = fila.querySelector("select.admin-pedidos-estado-select");
    fireEvent.change(select, { target: { value: "ENTREGADO" } });

    await waitFor(() => expect(obtenerPedidos).toHaveBeenCalledTimes(2));
  });

  test("8. El select anuncia de qué pedido es (accesibilidad)", async () => {
    render(<AdminPedidos />);

    await screen.findByText("Daniela Soto");
    const grupo = screen.getByRole("group", { name: /Estado del pedido de Daniela Soto/i });
    expect(grupo.querySelector("select")).toBeInTheDocument();
  });

  test("9. Si el backend falla, muestra el aviso en vez de la tabla", async () => {
    obtenerPedidos.mockResolvedValue([]);
    render(<AdminPedidos />);

    expect(await screen.findByTestId("pedidos-vacio")).toBeInTheDocument();
  });

  // El título del toast es un <h2> y index.css le impone "Great Vibes" a todo
  // h1/h2, con lo que el aviso queda en letra manuscrita y diminuto. La clase
  // customClass es el gancho que permite a App.css devolverle Montserrat.
  test("10. El aviso de cambio de estado lleva la clase que fija su tipografía", async () => {
    render(<AdminPedidos />);

    await screen.findByText("Daniela Soto");
    const fila = screen.getByText("Daniela Soto").closest("tr");
    const select = fila.querySelector("select.admin-pedidos-estado-select");
    fireEvent.change(select, { target: { value: "ENTREGADO" } });

    await waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(2));
    const aviso = Swal.fire.mock.calls[1][0];
    expect(aviso.toast).toBe(true);
    expect(aviso.customClass && aviso.customClass.popup).toBe("toast-estado");
  });

  // El estado se distingue de un vistazo por el color, igual que en la tabla:
  // el título lleva la clase del estado para tomar su paleta.
  test("11. El aviso lleva la clase del estado para pintar el título con su color", async () => {
    render(<AdminPedidos />);

    await screen.findByText("Daniela Soto");
    const fila = screen.getByText("Daniela Soto").closest("tr");
    const select = fila.querySelector("select.admin-pedidos-estado-select");
    fireEvent.change(select, { target: { value: "ENTREGADO" } });

    await waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(2));
    const aviso = Swal.fire.mock.calls[1][0];
    expect(aviso.customClass && aviso.customClass.title).toBe("toast-estado--entregado");
  });
});
