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

  // Filtro por estado: la administradora tiene decenas de pedidos y necesita
  // ver solo los que estan en un estado (p. ej. los RECIBIDO por atender).

  test("12. El filtro ofrece Pedidos activos, Todos los estados y los 4 estados", async () => {
    render(<AdminPedidos />);

    await screen.findByText("Daniela Soto");
    const filtro = screen.getByLabelText(/filtrar por estado/i);
    expect(filtro).toBeInTheDocument();
    expect(filtro.querySelectorAll("option")).toHaveLength(6);
    expect(filtro.options[0].textContent).toBe("Pedidos activos");
    // Por defecto se ve la vista de trabajo (ambos mocks son activos)
    expect(screen.getByText("Raul Pino")).toBeInTheDocument();
  });

  // Historial entregado: los pedidos listos son el registro de la pasteleria y
  // no se borran, pero tampoco tienen por qué estorbar en la vista de trabajo.
  test("16. Por defecto se ocultan los entregados y 'Todos los estados' los muestra", async () => {
    const pedidoEntregado = {
      id: 303,
      cliente: "Carla Contreras",
      email: "carla@ejemplo.cl",
      fecha: "2026-10-28T09:00:00Z",
      total: 15000,
      estado: "ENTREGADO",
      productos: [{ nombre: "Torta Selva Negra", cantidad: 1, precioUnitario: 15000, subtotal: 15000 }],
    };
    obtenerPedidos.mockResolvedValue([pedidoDaniela, pedidoRaul, pedidoEntregado]);
    render(<AdminPedidos />);

    await screen.findByText("Daniela Soto");
    expect(screen.queryByText("Carla Contreras")).toBeNull();

    fireEvent.change(screen.getByLabelText(/filtrar por estado/i), { target: { value: "" } });
    expect(await screen.findByText("Carla Contreras")).toBeInTheDocument();
  });

  test("13. Filtrar por estado muestra solo los pedidos de ese estado", async () => {
    render(<AdminPedidos />);

    await screen.findByText("Daniela Soto");
    fireEvent.change(screen.getByLabelText(/filtrar por estado/i), {
      target: { value: "DESPACHADO" },
    });

    expect(screen.getByText("Raul Pino")).toBeInTheDocument();
    expect(screen.queryByText("Daniela Soto")).toBeNull();
    // El contador aclara que es un filtro y no el total de la lista
    expect(screen.getByText(/Mostrando 1 de 1 pedidos · Despachado \(2 en total\)/))
      .toBeInTheDocument();
  });

  test("14. Un filtro sin resultados avisa que no hay pedidos en ese estado", async () => {
    render(<AdminPedidos />);

    await screen.findByText("Daniela Soto");
    fireEvent.change(screen.getByLabelText(/filtrar por estado/i), {
      target: { value: "ENTREGADO" },
    });

    expect(await screen.findByTestId("pedidos-filtro-vacio")).toHaveTextContent(
      /Ningún pedido en estado "Entregado"/
    );
    // No puede decir "no hay pedidos registrados": los hay, solo que otros
    expect(screen.queryByTestId("pedidos-vacio")).toBeNull();
  });

  // Trampa de paginacion: filtrar con la pagina 2 activa dejaria un rango de
  // slice fuera de tabla (o la pagina vacia). El filtro vuelve a la pagina 1.
  test("15. Cambiar el filtro vuelve a la primera página", async () => {
    const ochoPedidos = Array.from({ length: 8 }, (_, i) => ({
      id: 400 + i,
      cliente: `Cliente ${i + 1}`,
      email: `cliente${i + 1}@ejemplo.cl`,
      fecha: `2026-10-${String(31 - i).padStart(2, "0")}T10:00:00Z`,
      total: 10000 + i,
      estado: i < 5 ? "RECIBIDO" : "DESPACHADO",
      productos: [{ nombre: "Torta de chocolate", cantidad: 1, precioUnitario: 10000, subtotal: 10000 }],
    }));
    obtenerPedidos.mockResolvedValue(ochoPedidos);
    render(<AdminPedidos />);

    await screen.findByText("Cliente 1");
    // 8 pedidos a 5 por pagina: la pagina 2 muestra Cliente 6, 7 y 8
    fireEvent.click(screen.getByRole("button", { name: "Página 2" }));
    expect(await screen.findByText("Cliente 6")).toBeInTheDocument();
    expect(screen.queryByText("Cliente 1")).toBeNull();

    // Filtra a 5 RECIBIDO (1 sola pagina): si no volviera al inicio, la
    // pagina 2 no existiria y la tabla quedaria en blanco
    fireEvent.change(screen.getByLabelText(/filtrar por estado/i), {
      target: { value: "RECIBIDO" },
    });

    expect(await screen.findByText("Cliente 1")).toBeInTheDocument();
    expect(screen.queryByText("Cliente 6")).toBeNull();
    expect(screen.getByText(/Mostrando 5 de 5 pedidos · Recibido \(8 en total\)/))
      .toBeInTheDocument();
  });

  // El panel tiene varias secciones plegables ("Más vendidos", "Qué se vendió",
  // "Ventas de los últimos 7 días"). Todas comparten el mismo boton de
  // pliegue: si Pedidos recibidos usa otro, el panel se ve parchado.
  test("16. El botón de pliegue usa el mismo estilo que las secciones de ventas", async () => {
    render(<AdminPedidos />);

    await screen.findByText("Daniela Soto");
    const btn = screen.getByRole("button", { name: "Cerrar Pedidos recibidos" });

    // La misma clase que usan las secciones de ventas
    expect(btn).toHaveClass("admin-pliegue-btn");
    expect(btn).not.toHaveClass("admin-btn-cerrar");
    // Sin glifo: el texto es exactamente el de las otras secciones
    expect(btn).toHaveTextContent(/^Cerrar$/);
  });

  // El ciclo de vida de un pedido es lineal: Recibido -> En preparacion ->
  // Despachado -> Entregado. Un pedido ya avanzado no vuelve atras (el backend
  // lo rechaza), asi que el panel no debe ofrecer una accion imposible.
  test("17. El select solo ofrece los estados que el pedido puede tomar", async () => {
    render(<AdminPedidos />);

    await screen.findByText("Raul Pino");
    const fila = screen.getByText("Raul Pino").closest("tr");
    const select = fila.querySelector("select.admin-pedidos-estado-select");

    // Raul esta DESPACHADO: solo le queda ENTREGADO
    expect(select.querySelectorAll("option")).toHaveLength(2);
    expect(Array.from(select.options).map((o) => o.value)).toEqual([
      "DESPACHADO",
      "ENTREGADO",
    ]);
  });

  // El aviso no puede prometer un correo que no se envia: RECIBIDO no genera
  // correo (ese aviso ya se mando cuando se recibio el pedido).
  test("18. Elegir el estado actual no promete ningun correo", async () => {
    render(<AdminPedidos />);

    await screen.findByText("Daniela Soto");
    const fila = screen.getByText("Daniela Soto").closest("tr");
    const select = fila.querySelector("select.admin-pedidos-estado-select");
    fireEvent.change(select, { target: { value: "RECIBIDO" } });

    await waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(1));
    const confirmacion = Swal.fire.mock.calls[0][0];
    expect(confirmacion.text).not.toMatch(/le llegar[aá] un correo/i);
    expect(confirmacion.text).toMatch(/no se enviar[aá] ning[uú]n correo/i);
    // Elegir el estado que ya tiene el pedido no es un cambio: no se pide al
    // backend que guarde nada, para no fingir una transición que no ocurrió.
    expect(cambiarEstadoPedido).not.toHaveBeenCalled();
  });

  // El select refleja el estado real del pedido. Si la administradora cancela,
  // no puede quedar mostrando un estado que el pedido no tiene: sería una
  // mentira en pantalla. React además restaura por su cuenta el valor
  // controlado, pero el panel lo revierte a mano y este test fija esa
  // garantía para que un refactor no la rompa en silencio.
  test("19. Al cancelar, el select vuelve a mostrar el estado real del pedido", async () => {
    Swal.fire.mockResolvedValue({ isConfirmed: false });
    render(<AdminPedidos />);

    await screen.findByText("Daniela Soto");
    const fila = screen.getByText("Daniela Soto").closest("tr");
    const select = fila.querySelector("select.admin-pedidos-estado-select");
    fireEvent.change(select, { target: { value: "ENTREGADO" } });

    await waitFor(() => expect(Swal.fire).toHaveBeenCalled());
    expect(select.value).toBe("RECIBIDO");
  });

  // El select ofrece solo los estados que el pedido puede tomar (el actual y los
  // siguientes) y rotula el actual, para que la administradora sepa en que
  // estado esta el pedido y no elija por error una accion imposible.
  test("20. Cada select ofrece el estado actual y los siguientes, y rotula el actual", async () => {
    const estados = [
      { codigo: "RECIBIDO", etiqueta: "Recibido", opciones: 4 },
      { codigo: "EN_PREPARACION", etiqueta: "En preparación", opciones: 3 },
      { codigo: "DESPACHADO", etiqueta: "Despachado", opciones: 2 },
      { codigo: "ENTREGADO", etiqueta: "Entregado", opciones: 1 },
    ];
    obtenerPedidos.mockResolvedValue(
      estados.map((estado, i) => ({
        id: 500 + i,
        cliente: `Cliente ${i + 1}`,
        email: `cliente${i + 1}@ejemplo.cl`,
        fecha: "2026-11-01T10:00:00Z",
        total: 10000,
        estado: estado.codigo,
        productos: [{ nombre: "Torta de chocolate", cantidad: 1, precioUnitario: 10000, subtotal: 10000 }],
      }))
    );
    render(<AdminPedidos />);

    // Por defecto la vista de trabajo oculta los entregados: para revisar el
    // select del pedido entregado se pide el historial completo
    fireEvent.change(screen.getByLabelText(/filtrar por estado/i), { target: { value: "" } });

    await screen.findByText("Cliente 1");
    estados.forEach((estado, i) => {
      const fila = screen.getByText(`Cliente ${i + 1}`).closest("tr");
      const select = fila.querySelector("select.admin-pedidos-estado-select");
      // Solo el estado actual y los que le siguen
      expect(select.querySelectorAll("option")).toHaveLength(estado.opciones);
      // La primera opcion es el estado actual, rotulado como tal
      expect(select.options[0].textContent).toBe(`${estado.etiqueta} (actual)`);
      expect(select.options[0].value).toBe(estado.codigo);
    });
  });

  // Elegir el estado que el pedido YA tiene no es un cambio: el aviso es
  // informativo y no vuelve a pedirle nada al backend.
  test("21. Elegir el estado actual muestra un aviso informativo y no llama al backend", async () => {
    render(<AdminPedidos />);

    await screen.findByText("Daniela Soto");
    const fila = screen.getByText("Daniela Soto").closest("tr");
    const select = fila.querySelector("select.admin-pedidos-estado-select");
    fireEvent.change(select, { target: { value: "RECIBIDO" } });

    await waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(1));
    const confirmacion = Swal.fire.mock.calls[0][0];
    expect(confirmacion.title).toMatch(/ya est[aá] en/i);
    expect(confirmacion.confirmButtonText).toBe("Entendido");
    // No hay nada que cancelar: el aviso no propone cambiar nada
    expect(confirmacion.showCancelButton).toBe(false);
    expect(cambiarEstadoPedido).not.toHaveBeenCalled();
  });

  // El aviso honesto no puede castigar a los estados que SI notifican: esos
  // siguen prometiendo el correo al cliente.
  test("22. Los estados que sí generan correo siguen prometiéndolo", async () => {
    // Se cancela cada aviso para que la unica llamada a Swal sea la del dialogo
    Swal.fire.mockResolvedValue({ isConfirmed: false });
    obtenerPedidos.mockResolvedValue([
      { ...pedidoDaniela, id: 601, cliente: "Ana Recipes", estado: "RECIBIDO" },
      { ...pedidoRaul, id: 602, cliente: "Beto Pastel", estado: "EN_PREPARACION" },
    ]);
    render(<AdminPedidos />);

    await screen.findByText("Ana Recipes");
    // RECIBIDO -> EN_PREPARACION: este estado notifica, asi que avisa del correo
    const filaAna = screen.getByText("Ana Recipes").closest("tr");
    fireEvent.change(filaAna.querySelector("select.admin-pedidos-estado-select"), {
      target: { value: "EN_PREPARACION" },
    });
    await waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(1));
    expect(Swal.fire.mock.calls[0][0].text).toMatch(/le llegar[aá] un correo/i);

    // EN_PREPARACION -> DESPACHADO: este estado tambien notifica
    const filaBeto = screen.getByText("Beto Pastel").closest("tr");
    fireEvent.change(filaBeto.querySelector("select.admin-pedidos-estado-select"), {
      target: { value: "DESPACHADO" },
    });
    await waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(2));
    expect(Swal.fire.mock.calls[1][0].text).toMatch(/le llegar[aá] un correo/i);
  });

  // Un rechazo de pedidos-service NO es "no hay pedidos": decir eso a la
  // administradora seria mentirle sobre su propio negocio (P0-3)
  test("23. Si pedidos-service no responde, la seccion lo dice en vez de fingir que no hay pedidos", async () => {
    obtenerPedidos.mockRejectedValue(new Error("503"));

    render(<AdminPedidos />);

    expect(await screen.findByTestId("pedidos-error")).toBeInTheDocument();
    expect(screen.queryByTestId("pedidos-vacio")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pedidos-cargando")).not.toBeInTheDocument();
  });

  test("24. El aviso de error ofrece Recargar y vuelve a pedir la lista", async () => {
    obtenerPedidos.mockRejectedValueOnce(new Error("503"));
    obtenerPedidos.mockResolvedValue([pedidoDaniela]);

    render(<AdminPedidos />);
    fireEvent.click(await screen.findByTestId("pedidos-reintentar"));

    expect(await screen.findByText("Daniela Soto")).toBeInTheDocument();
    expect(obtenerPedidos).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("pedidos-error")).not.toBeInTheDocument();
  });

  // La lista vacia LEGITIMA sigue mostrando su mensaje de siempre: el estado
  // de error no puede castigar al caso en que efectivamente no hay pedidos
  test("25. Con una lista vacia legitima sigue diciendo que no hay pedidos", async () => {
    obtenerPedidos.mockResolvedValue([]);

    render(<AdminPedidos />);

    expect(await screen.findByTestId("pedidos-vacio")).toBeInTheDocument();
    expect(screen.queryByTestId("pedidos-error")).not.toBeInTheDocument();
  });
});
