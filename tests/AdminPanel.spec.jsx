import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";

import AdminPanel from "../src/pages/AdminPanel.jsx";
import * as ProductosService from "../src/service/ProductosService";
import * as EstadisticasService from "../src/service/EstadisticasService";
import * as PedidosService from "../src/service/PedidosService";
import Swal from 'sweetalert2';
import '@testing-library/jest-dom';

// AdminPanel ya NO usa fetch: llama a las funciones del servicio (axios).
vi.mock("../src/service/ProductosService", () => ({
  obtenerProductos: vi.fn(),
  obtenerDeliciaDelDia: vi.fn(),
  crearProducto: vi.fn(),
  actualizarProducto: vi.fn(),
  eliminarProducto: vi.fn(),
  subirImagenProducto: vi.fn(),
}));

// El panel también consulta el microservicio de estadísticas al montar.
vi.mock("../src/service/EstadisticasService", () => ({
  obtenerEstadisticas: vi.fn(),
  guardarMetas: vi.fn(),
  obtenerProductosVistos: vi.fn().mockResolvedValue([]),
}));

// El dashboard pide las ventas por producto a pedidos-service para el periodo elegido,
// y la sección de gestión de pedidos pide el listado y cambia estados.
vi.mock("../src/service/PedidosService", () => ({
  obtenerVentasPorProducto: vi.fn(),
  obtenerPedidos: vi.fn(),
  cambiarEstadoPedido: vi.fn(),
}));

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn(() => Promise.resolve({ isConfirmed: true }))
  }
}));

describe("AdminPanel - Verificación Integral del CRUD", () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.setItem("userToken", "token-test-123");
    sessionStorage.setItem("userName", "Admin");
    
    // Datos simulados iniciales
    ProductosService.obtenerProductos.mockResolvedValue([
      { id: 1, nombre: "Torta Chocolate", precio: 15000, categoria: "Nuestras Tortas", imagenUrl: "torta3Leches.jpg", descripcion: "Deliciosa" }
    ]);
    ProductosService.crearProducto.mockResolvedValue({});
    ProductosService.actualizarProducto.mockResolvedValue({});
    ProductosService.eliminarProducto.mockResolvedValue({});
    EstadisticasService.obtenerEstadisticas.mockResolvedValue({
      totalProductosCatalogo: 1,
      categoriasActivas: 4,
      estadoServicio: "UP",
    });
    PedidosService.obtenerVentasPorProducto.mockResolvedValue([]);
    // Sin pedidos por defecto: la sección nueva muestra su estado vacío
    PedidosService.obtenerPedidos.mockResolvedValue([]);
    EstadisticasService.guardarMetas.mockResolvedValue({});
  });

  it("1. READ: Debe listar productos correctamente", async () => {
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);
    expect(await screen.findByText(/Torta Chocolate/i)).toBeInTheDocument();
    expect(ProductosService.obtenerProductos).toHaveBeenCalled();
  });

  it("2. CREATE: Debe llamar a crearProducto con los datos del formulario", async () => {
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    // El formulario vive en la zona Productos: se abre con su pestaña
    fireEvent.click(screen.getByRole("tab", { name: /productos/i }));

    // Llenamos TODOS los campos que la validación manual requiere
    fireEvent.change(screen.getByLabelText(/Nombre del Producto/i), { target: { value: "Brazo de Reina" } });
    fireEvent.change(screen.getByLabelText(/Precio/i), { target: { value: "8000" } });
    fireEvent.change(screen.getByLabelText(/Descripción/i), { target: { value: "Manjar y bizcocho" } });
    fireEvent.change(screen.getByLabelText(/Sección en Web/i), { target: { value: "Sabores Frutales" } });
    // La foto se sube al elegir el archivo y la URL devuelta viaja en el form
    ProductosService.subirImagenProducto.mockResolvedValue("/uploads/foto-nueva.jpg");
    const archivoFoto = new File(["foto"], "torta.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText(/Foto del producto/i), { target: { files: [archivoFoto] } });
    await waitFor(() => expect(ProductosService.subirImagenProducto).toHaveBeenCalledWith(archivoFoto));

    // Hacemos clic en Publicar
    const botonPublicar = screen.getByRole("button", { name: /Publicar/i });
    fireEvent.click(botonPublicar);

    await waitFor(() => {
      expect(ProductosService.crearProducto).toHaveBeenCalledWith(expect.objectContaining({ 
        nombre: "Brazo de Reina",
        precio: 8000,
        categoria: "Sabores Frutales",
        imagenUrl: "/uploads/foto-nueva.jpg"
      }));
    });
    expect(ProductosService.actualizarProducto).not.toHaveBeenCalled();
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: "success" }));
  });

  it("3. UPDATE: Debe cambiar a modo edición y llamar a actualizarProducto", async () => {
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    // Buscamos el botón de editar (el emoji con su aria-label)
    const botonEditar = await screen.findByLabelText("Editar Torta Chocolate");
    fireEvent.click(botonEditar);

    // El formulario pasa a modo edición con los datos del producto
    expect(screen.getByLabelText(/Nombre del Producto/i)).toHaveValue("Torta Chocolate");

    // Cambiamos el nombre
    fireEvent.change(screen.getByLabelText(/Nombre del Producto/i), { target: { value: "Torta Especial" } });
    
    const botonActualizar = screen.getByRole("button", { name: /Actualizar/i });
    fireEvent.click(botonActualizar);

    await waitFor(() => {
      expect(ProductosService.actualizarProducto).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ nombre: "Torta Especial" })
      );
    });
    expect(ProductosService.crearProducto).not.toHaveBeenCalled();
  });

  it("4. DELETE: Debe pedir confirmación y llamar a eliminarProducto", async () => {
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    const botonEliminar = await screen.findByLabelText("Eliminar Torta Chocolate");
    fireEvent.click(botonEliminar);

    // SweetAlert pide confirmación (mockeada como confirmada)
    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: "warning" }));
      expect(ProductosService.eliminarProducto).toHaveBeenCalledWith(1);
      // carga inicial + recarga tras eliminar
      expect(ProductosService.obtenerProductos).toHaveBeenCalledTimes(2);
    });
  });

  it("5. ERROR: Debe mostrar SweetAlert de error cuando crearProducto falla", async () => {
    ProductosService.crearProducto.mockRejectedValueOnce(new Error("sin conexión"));
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    // El formulario vive en la zona Productos: se abre con su pestaña
    fireEvent.click(screen.getByRole("tab", { name: /productos/i }));

    // Llenamos campos para pasar la validación inicial de "Campos incompletos"
    fireEvent.change(screen.getByLabelText(/Nombre del Producto/i), { target: { value: "Test Error" } });
    fireEvent.change(screen.getByLabelText(/Precio/i), { target: { value: "5000" } });
    fireEvent.change(screen.getByLabelText(/Descripción/i), { target: { value: "Test" } });
    fireEvent.change(screen.getByLabelText(/Sección en Web/i), { target: { value: "Nuestras Tortas" } });
    // La foto se sube al elegir el archivo y la URL devuelta viaja en el form
    ProductosService.subirImagenProducto.mockResolvedValue("/uploads/foto-nueva.jpg");
    const archivoFoto = new File(["foto"], "torta.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText(/Foto del producto/i), { target: { files: [archivoFoto] } });
    await waitFor(() => expect(ProductosService.subirImagenProducto).toHaveBeenCalledWith(archivoFoto));
    
    fireEvent.click(screen.getByRole("button", { name: /Publicar/i }));

    await waitFor(() => {
      // El catch de handleSubmit dispara el Swal de error del servicio
      expect(ProductosService.crearProducto).toHaveBeenCalled();
      expect(Swal.fire).toHaveBeenCalledWith(
        "Error",
        expect.stringMatching(/No se pudo guardar/i),
        "error"
      );
    });
  });

  it("6. ESTADISTICAS: Muestra las ventas de hoy y la ventana de 7 días", async () => {
    EstadisticasService.obtenerEstadisticas.mockResolvedValue({
      totalProductosCatalogo: 1,
      categoriasActivas: 4,
      pedidosTotales: 2,
      montoTotalPedidos: 48990,
      pedidosHoy: 2,
      montoVentasHoy: 48990,
      ventasDiarias: [
        { fecha: "2026-10-21", pedidos: 2, monto: 48990 },
        { fecha: "2026-10-20", pedidos: 0, monto: 0 },
        { fecha: "2026-10-19", pedidos: 0, monto: 0 },
        { fecha: "2026-10-18", pedidos: 0, monto: 0 },
        { fecha: "2026-10-17", pedidos: 0, monto: 0 },
        { fecha: "2026-10-16", pedidos: 0, monto: 0 },
        { fecha: "2026-10-15", pedidos: 0, monto: 0 },
      ],
    });
    // Un pedido del día permite ver la fila con foto dentro de la tarjeta
    PedidosService.obtenerPedidos.mockResolvedValue([
      {
        id: 1,
        fecha: "2026-10-21T12:00:00.000Z",
        productos: [{ nombre: "Torta Chocolate", cantidad: 2, subtotal: 30000 }],
      },
    ]);

    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    // Los dos indicadores del día viven juntos en su propio bloque
    const bloqueVentas = (await screen.findByText(/Ventas hoy/i)).parentElement;
    expect(bloqueVentas).toHaveTextContent("$48.990");

    const bloquePedidos = screen.getByText(/Pedidos hoy/i).parentElement;
    expect(bloquePedidos).toHaveTextContent("2");

    // La ventana es una lista de tarjetas por día (ya no una tabla)
    await screen.findByRole("heading", { name: /últimos 7 días/i });
    const lista = screen.getByTestId("lista-dias");
    expect(within(lista).getAllByRole("article")).toHaveLength(7);
    expect(within(lista).getByText("21-10-2026")).toBeInTheDocument();

    // Los 6 días sin ventas quedan como fila tenue, sin celdas vacías
    expect(within(lista).getAllByText("Sin ventas registradas")).toHaveLength(6);

    // El día con ventas esconde sus productos tras el desplegable (para que la
    // sección no empuje todo hacia abajo) y los muestra al pedirlos
    fireEvent.click(within(lista).getByRole("button", { name: /ver productos/i }));
    const fila = within(lista).getByText("Torta Chocolate").closest("li");
    expect(within(fila).getByText("2 unidades")).toBeInTheDocument();
    expect(within(fila).getByText("$30.000")).toBeInTheDocument();

    // La sección ya no se representa como tabla
    expect(screen.queryByRole("table", { name: /últimos 7 días/i })).not.toBeInTheDocument();
  });

  it("7. No muestra el estado de los microservicios en el panel", async () => {
    EstadisticasService.obtenerEstadisticas.mockResolvedValue({
      totalProductosCatalogo: 1,
      categoriasActivas: 4,
      estadoServicio: "OPERATIVO",
      pedidosTotales: 2,
      montoTotalPedidos: 48990,
    });

    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    await waitFor(() => expect(EstadisticasService.obtenerEstadisticas).toHaveBeenCalled());
    expect(screen.queryByText(/Estado MS/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/OPERATIVO/i)).not.toBeInTheDocument();
  });

  // --- Dashboard de la Mejora 3: periodo, barra de avance y productos vendidos ---

  const statsDashboard = {
    totalProductosCatalogo: 1,
    categoriasActivas: 4,
    pedidosTotales: 18,
    montoTotalPedidos: 822070,
    pedidosHoy: 2,
    montoVentasHoy: 48990,
    ventasDiarias: [],
    ventasPeriodo: {
      dia: { desde: "2026-10-21", hasta: "2026-10-21", pedidos: 2, monto: 48990 },
      semana: { desde: "2026-10-19", hasta: "2026-10-21", pedidos: 5, monto: 120000 },
      mes: { desde: "2026-10-01", hasta: "2026-10-21", pedidos: 18, monto: 822070 },
    },
    metas: { dia: 80000, semana: 400000, mes: 1500000 },
  };

  it("8. PERIODO: cambia las cifras al elegir semana y mes", async () => {
    EstadisticasService.obtenerEstadisticas.mockResolvedValue(statsDashboard);
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    // Por defecto muestra el dia (Hoy)
    expect(await screen.findByText(/Ventas Hoy/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Semana/i }));
    await waitFor(() => {
      expect(screen.getByText(/Ventas esta semana/i).parentElement).toHaveTextContent("$120.000");
    });
    expect(screen.getByText(/Pedidos esta semana/i).parentElement).toHaveTextContent("5");

    fireEvent.click(screen.getByRole("tab", { name: /Mes/i }));
    await waitFor(() => {
      expect(screen.getByText(/Ventas este mes/i).parentElement).toHaveTextContent("$822.070");
    });
    expect(screen.getByText(/Pedidos este mes/i).parentElement).toHaveTextContent("18");
  });

  it("9. BARRA: muestra el avance de ventas hacia la meta del periodo", async () => {
    EstadisticasService.obtenerEstadisticas.mockResolvedValue(statsDashboard);
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    // 48.990 de una meta de 80.000 = 61%
    const barra = await screen.findByRole("progressbar", { name: /Avance de ventas Hoy/i });
    expect(barra).toHaveAttribute("aria-valuenow", "61");
    expect(screen.getByTestId("meta-texto")).toHaveTextContent("$48.990");
    expect(screen.getByTestId("meta-texto")).toHaveTextContent("$80.000");
  });

  it("10. BARRA: sin meta definida avisa que todavia no hay avance", async () => {
    EstadisticasService.obtenerEstadisticas.mockResolvedValue({
      ...statsDashboard,
      metas: { dia: 0, semana: 0, mes: 0 },
    });
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    expect(await screen.findByText(/Todavía no defines una meta/i)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("11. VENDIDOS: muestra cada producto con su imagen y unidades del periodo", async () => {
    EstadisticasService.obtenerEstadisticas.mockResolvedValue(statsDashboard);
    PedidosService.obtenerVentasPorProducto.mockResolvedValue([
      { nombre: "Torta Chocolate", unidades: 6, monto: 90000 },
    ]);
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    // Se acota a la lista del dashboard: el catalogo tambien lista ese mismo producto
    const lista = await screen.findByTestId("lista-vendidos");
    const fila = within(lista).getByText("Torta Chocolate").closest("li");
    expect(within(fila).getByText("6 unidades")).toBeInTheDocument();
    expect(within(fila).getByText("$90.000")).toBeInTheDocument();
    // La foto resuelve contra el catalogo cargado (imagenUrl del producto)
    expect(within(fila).getByRole("img")).toHaveAttribute("src", "/img/torta3Leches.jpg");
  });

  it("12. META: la administradora guarda una nueva meta para el periodo", async () => {
    EstadisticasService.obtenerEstadisticas.mockResolvedValue({
      ...statsDashboard,
      metas: { dia: 0, semana: 0, mes: 0 },
    });
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    fireEvent.click(await screen.findByRole("button", { name: /Editar meta/i }));
    fireEvent.change(screen.getByLabelText(/Meta de ventas Hoy/i), { target: { value: "100000" } });
    fireEvent.click(screen.getByRole("button", { name: /Guardar meta/i }));

    await waitFor(() => {
      expect(EstadisticasService.guardarMetas).toHaveBeenCalledWith(
        expect.objectContaining({ dia: 100000 })
      );
    });
  });

  it("13. TOP: destaca los 3 mas vendidos del periodo con su ranking", async () => {
    EstadisticasService.obtenerEstadisticas.mockResolvedValue(statsDashboard);
    PedidosService.obtenerVentasPorProducto.mockResolvedValue([
      { nombre: "Torta Chocolate", unidades: 6, monto: 90000 },
      { nombre: "Muffins Plátano", unidades: 28, monto: 70000 },
      { nombre: "Merengue Frambuesa", unidades: 18, monto: 270000 },
      { nombre: "Queque Marmoleado", unidades: 8, monto: 48000 },
    ]);
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    const top = await screen.findByTestId("lista-top");
    const items = within(top).getAllByRole("listitem");
    // Siempre por unidades, aunque la lista completa use otro orden
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Muffins Plátano");
    expect(items[0]).toHaveTextContent("28 unidades");
    expect(items[1]).toHaveTextContent("Merengue Frambuesa");
    expect(items[2]).toHaveTextContent("Queque Marmoleado");
  });

  it("14. ORDEN: reordena 'Qué se vendió' al elegir Valor y al invertir", async () => {
    EstadisticasService.obtenerEstadisticas.mockResolvedValue(statsDashboard);
    PedidosService.obtenerVentasPorProducto.mockResolvedValue([
      { nombre: "Torta Chocolate", unidades: 6, monto: 90000 },
      { nombre: "Merengue Frambuesa", unidades: 18, monto: 270000 },
    ]);
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    const lista = await screen.findByTestId("lista-vendidos");
    // Por defecto: unidades descendente -> Merengue (18) antes que Torta (6)
    expect(within(lista).getAllByRole("listitem")[0]).toHaveTextContent("Merengue Frambuesa");

    // Valor (monto) descendente: Merengue ($270.000) primero
    fireEvent.click(screen.getByRole("button", { name: /^Valor/i }));
    expect(within(lista).getAllByRole("listitem")[0]).toHaveTextContent("Merengue Frambuesa");

    // Otra vez Valor invierte a ascendente: Torta ($90.000) primero
    fireEvent.click(screen.getByRole("button", { name: /^Valor/i }));
    expect(within(lista).getAllByRole("listitem")[0]).toHaveTextContent("Torta Chocolate");
  });

  it("15. PLIEGUE: cierra y abre la seccion de 'Qué se vendió'", async () => {
    EstadisticasService.obtenerEstadisticas.mockResolvedValue(statsDashboard);
    PedidosService.obtenerVentasPorProducto.mockResolvedValue([
      { nombre: "Torta Chocolate", unidades: 6, monto: 90000 },
    ]);
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    expect(await screen.findByTestId("lista-vendidos")).toBeInTheDocument();

    const btn = screen.getByRole("button", { name: "Qué se vendió" });
    expect(btn).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(btn);

    // La lista se pliega y el boton queda en estado colapsado
    expect(screen.queryByTestId("lista-vendidos")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Qué se vendió" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );

    // Vuelve a abrirse
    fireEvent.click(screen.getByRole("button", { name: "Qué se vendió" }));
    expect(await screen.findByTestId("lista-vendidos")).toBeInTheDocument();
  });

  it("16. PLIEGUE: cierra y abre la seccion de 'Más vendidos'", async () => {
    EstadisticasService.obtenerEstadisticas.mockResolvedValue(statsDashboard);
    PedidosService.obtenerVentasPorProducto.mockResolvedValue([
      { nombre: "Torta Chocolate", unidades: 6, monto: 90000 },
    ]);
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    expect(await screen.findByTestId("lista-top")).toBeInTheDocument();

    const btn = screen.getByRole("button", { name: "Más vendidos" });
    expect(btn).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(btn);

    expect(screen.queryByTestId("lista-top")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Más vendidos" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );

    fireEvent.click(screen.getByRole("button", { name: "Más vendidos" }));
    expect(await screen.findByTestId("lista-top")).toBeInTheDocument();
  });

  it("17. ACCESIBILIDAD: los botones de la tabla anuncian de qué producto son", async () => {
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    expect(await screen.findByText(/Torta Chocolate/i)).toBeInTheDocument();

    // Los botones viven en la zona Productos (getByRole no ve elementos ocultos)
    fireEvent.click(screen.getByRole("tab", { name: /productos/i }));

    expect(
      screen.getByRole("button", { name: "Editar Torta Chocolate" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Eliminar Torta Chocolate" })
    ).toBeInTheDocument();
  });

  it("18. Al editar, el scroll salta al formulario 'Modificar Dulce' (no al tope)", async () => {
    // jsdom no implementa scrollIntoView: el test lo espias
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;

    render(<MemoryRouter><AdminPanel /></MemoryRouter>);
    expect(await screen.findByText(/Torta Chocolate/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Editar Torta Chocolate"));

    expect(await screen.findByText(/Modificar Dulce/i)).toBeInTheDocument();
    // el scroll lo recibe el contenedor que envuelve el formulario, una sola vez
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy.mock.instances[0]).toContainElement(
      screen.getByText(/Modificar Dulce/i)
    );
  });

  // --- Mejora 4: columnas alineadas con % del total, % en el podio y
  //     barras proporcionales en la ventana de 7 días ---

  it("19. TABLA: 'Qué se vendió' tiene cabecera de columnas y muestra % del total", async () => {
    EstadisticasService.obtenerEstadisticas.mockResolvedValue(statsDashboard);
    PedidosService.obtenerVentasPorProducto.mockResolvedValue([
      { nombre: "Torta Chocolate", unidades: 6, monto: 60000 },
      { nombre: "Merengue Frambuesa", unidades: 18, monto: 40000 },
    ]);
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    const lista = await screen.findByTestId("lista-vendidos");

    // La cabecera nombra las columnas, igual que la tabla de pedidos
    const cabecera = screen.getByTestId("cabecera-vendidos");
    expect(cabecera).toHaveTextContent("Producto");
    expect(cabecera).toHaveTextContent("Unidades");
    expect(cabecera).toHaveTextContent("Valor");
    expect(cabecera).toHaveTextContent("% del total");

    // Cada fila muestra su participacion en el monto total (60.000 + 40.000)
    const filaTorta = within(lista).getByText("Torta Chocolate").closest("li");
    expect(filaTorta).toHaveTextContent("60%");
    const filaMerengue = within(lista).getByText("Merengue Frambuesa").closest("li");
    expect(filaMerengue).toHaveTextContent("40%");
  });

  it("20. TOP: cada medalla muestra su % del total de ventas", async () => {
    EstadisticasService.obtenerEstadisticas.mockResolvedValue(statsDashboard);
    PedidosService.obtenerVentasPorProducto.mockResolvedValue([
      { nombre: "Torta Chocolate", unidades: 6, monto: 60000 },
      { nombre: "Merengue Frambuesa", unidades: 18, monto: 40000 },
    ]);
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    const top = await screen.findByTestId("lista-top");
    const items = within(top).getAllByRole("listitem");
    // El ranking sigue siendo por unidades (18 > 6); el % es del monto total
    expect(items[0]).toHaveTextContent("Merengue Frambuesa");
    expect(items[0]).toHaveTextContent("40%");
    expect(items[1]).toHaveTextContent("Torta Chocolate");
    expect(items[1]).toHaveTextContent("60%");
  });

  it("21. BARRAS: cada día dibuja una barra proporcional a su monto", async () => {
    EstadisticasService.obtenerEstadisticas.mockResolvedValue({
      ...statsDashboard,
      ventasDiarias: [
        { fecha: "2026-10-21", pedidos: 2, monto: 30000 },
        { fecha: "2026-10-20", pedidos: 1, monto: 15000 },
        { fecha: "2026-10-19", pedidos: 0, monto: 0 },
      ],
    });
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    const lista = await screen.findByTestId("lista-dias");
    const barras = within(lista).getAllByTestId("dia-barra");
    // El día sin ventas queda como fila tenue y no lleva barra
    expect(barras).toHaveLength(2);
    // El monto más alto de la ventana marca la escala: 30.000 = 100%, 15.000 = 50%
    expect(barras[0]).toHaveStyle("width: 100%");
    expect(barras[1]).toHaveStyle("width: 50%");
  });
});

// --- P0-3: el dashboard nunca miente (carga, error con reintento, sin ceros falsos) ---
describe("AdminPanel - Dashboard honesto (P0-3)", () => {
  const statsSanos = {
    totalProductosCatalogo: 1,
    categoriasActivas: 4,
    pedidosTotales: 18,
    montoTotalPedidos: 822070,
    pedidosHoy: 2,
    montoVentasHoy: 48990,
    datosCompletos: true,
    ventasDiarias: [
      { fecha: "2026-11-07", pedidos: 2, monto: 48990 },
      { fecha: "2026-11-06", pedidos: 0, monto: 0 },
      { fecha: "2026-11-05", pedidos: 0, monto: 0 },
      { fecha: "2026-11-04", pedidos: 0, monto: 0 },
      { fecha: "2026-11-03", pedidos: 0, monto: 0 },
      { fecha: "2026-11-02", pedidos: 0, monto: 0 },
      { fecha: "2026-11-01", pedidos: 0, monto: 0 },
    ],
    ventasPeriodo: {
      dia: { desde: "2026-11-07", hasta: "2026-11-07", pedidos: 2, monto: 48990 },
      semana: { desde: "2026-11-02", hasta: "2026-11-07", pedidos: 5, monto: 120000 },
      mes: { desde: "2026-11-01", hasta: "2026-11-07", pedidos: 18, monto: 822070 },
    },
    metas: { dia: 80000, semana: 400000, mes: 1500000 },
  };

  // Así responde hoy un backend con la base caída: ceros en todas las cifras y
  // estadoServicio todavía OPERATIVO. datosCompletos=false es lo que lo delata.
  const statsDegradados = {
    ...statsSanos,
    totalProductosCatalogo: 17,
    pedidosTotales: 0,
    montoTotalPedidos: 0,
    pedidosHoy: 0,
    montoVentasHoy: 0,
    datosCompletos: false,
    estadoServicio: "DEGRADADO",
    ventasDiarias: [
      { fecha: "2026-11-07", pedidos: 0, monto: 0 },
      { fecha: "2026-11-06", pedidos: 0, monto: 0 },
      { fecha: "2026-11-05", pedidos: 0, monto: 0 },
      { fecha: "2026-11-04", pedidos: 0, monto: 0 },
      { fecha: "2026-11-03", pedidos: 0, monto: 0 },
      { fecha: "2026-11-02", pedidos: 0, monto: 0 },
      { fecha: "2026-11-01", pedidos: 0, monto: 0 },
    ],
    ventasPeriodo: {
      dia: { desde: "2026-11-07", hasta: "2026-11-07", pedidos: 0, monto: 0 },
      semana: { desde: "2026-11-02", hasta: "2026-11-07", pedidos: 0, monto: 0 },
      mes: { desde: "2026-11-01", hasta: "2026-11-07", pedidos: 0, monto: 0 },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.setItem("userToken", "token-test-123");
    sessionStorage.setItem("userName", "Admin");
    ProductosService.obtenerProductos.mockResolvedValue([
      { id: 1, nombre: "Torta Chocolate", precio: 15000, categoria: "Nuestras Tortas", imagenUrl: "torta3Leches.jpg", descripcion: "Deliciosa" },
    ]);
    PedidosService.obtenerVentasPorProducto.mockResolvedValue([]);
    PedidosService.obtenerPedidos.mockResolvedValue([]);
    EstadisticasService.guardarMetas.mockResolvedValue({});
  });

  it("22. CARGA: muestra el estado de carga mientras estadisticas-service no responde", async () => {
    let confirmarCarga;
    EstadisticasService.obtenerEstadisticas.mockReturnValue(
      new Promise((resolver) => {
        confirmarCarga = resolver;
      })
    );

    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    // Antes de la respuesta el panel dice que está cargando: no se queda mudo
    expect(screen.getByTestId("dashboard-cargando")).toBeInTheDocument();
    expect(screen.getByText(/Cargando ventas/i)).toBeInTheDocument();

    confirmarCarga(statsSanos);
    expect(await screen.findByText(/Ventas Hoy/i)).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-cargando")).not.toBeInTheDocument();
  });

  it("23. ERROR: si estadisticas-service falla ofrece Reintentar y no pinta ninguna cifra", async () => {
    EstadisticasService.obtenerEstadisticas.mockRejectedValueOnce(
      new Error("estadisticas-service caido")
    );

    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    expect(await screen.findByTestId("dashboard-error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reintentar/i })).toBeInTheDocument();
    // Sin el bloque de indicadores no hay ningún $0 haciendo pasar "sin datos" por "sin ventas"
    expect(screen.queryByTestId("kpis-dashboard")).not.toBeInTheDocument();

    // El reintento vuelve a pedir los datos y deja el panel como estaba
    EstadisticasService.obtenerEstadisticas.mockResolvedValue(statsSanos);
    fireEvent.click(screen.getByRole("button", { name: /Reintentar/i }));

    expect(await screen.findByText(/Ventas Hoy/i)).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-error")).not.toBeInTheDocument();
  });

  it("24. DATOS INCOMPLETOS: guiones largos en vez de $0 y sin barra al 0%", async () => {
    EstadisticasService.obtenerEstadisticas.mockResolvedValue(statsDegradados);

    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    // El aviso dice que los datos están incompletos, no que la pastelería no vendió nada
    expect(await screen.findByTestId("aviso-datos-incompletos")).toBeInTheDocument();

    const kpis = screen.getByTestId("kpis-dashboard");
    expect(kpis).toHaveTextContent("—");
    expect(kpis).not.toHaveTextContent("$0");

    // Con meta definida la barra se dibujaría al 0%: sin dato no hay avance que mostrar
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByTestId("meta-sin-datos")).toBeInTheDocument();

    // La ventana de 7 días tampoco puede afirmar "Sin ventas registradas" con la base caída
    expect(screen.queryByTestId("lista-dias")).not.toBeInTheDocument();
    expect(screen.getByTestId("diario-sin-datos")).toBeInTheDocument();
  });

  it("25. VENTAS POR PRODUCTO: si pedidos-service falla no afirma que no se vendió nada", async () => {
    EstadisticasService.obtenerEstadisticas.mockResolvedValue({
      ...statsSanos,
      ventasDiarias: [],
    });
    PedidosService.obtenerVentasPorProducto.mockRejectedValue(new Error("pedidos-service caido"));

    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    expect(await screen.findByTestId("vendidos-sin-datos")).toBeInTheDocument();
    expect(screen.getByTestId("vendidos-sin-datos")).toHaveTextContent(/No se pudieron leer las ventas/i);
    expect(screen.queryByText(/Sin ventas registradas en/i)).not.toBeInTheDocument();
  });

  // Una tabla de productos vacia por un servicio caido se lee como "no hay
  // productos en la pasteleria". El panel tiene que decir que no pudo leerla.
  it("26. CATALOGO: si catalogo-service falla la tabla lo dice en vez de quedar vacía", async () => {
    ProductosService.obtenerProductos.mockRejectedValue(new Error("catalogo-service caido"));

    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    expect(await screen.findByTestId("productos-error")).toBeInTheDocument();
    expect(screen.getByTestId("productos-error")).toHaveTextContent(/No se pudo leer el catálogo/i);
    // Sin filas no hay ningún producto que se pueda editar o eliminar
    expect(screen.queryByLabelText(/Editar /i)).not.toBeInTheDocument();
  });

  it("27. CATALOGO: con el servicio sano la tabla sigue mostrando los productos", async () => {
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    expect(await screen.findByText(/Torta Chocolate/i)).toBeInTheDocument();
    expect(screen.queryByTestId("productos-error")).not.toBeInTheDocument();
  });

  // El listado de pedidos se usa para el detalle de la tabla de 7 dias: si
  // falla, esa seccion no puede afirmar que no hubo detalle de productos
  it("28. PEDIDOS: si pedidos-service falla el detalle diario no afirma 'Sin detalle'", async () => {
    EstadisticasService.obtenerEstadisticas.mockResolvedValue({
      ...statsSanos,
      ventasDiarias: [{ fecha: "2026-11-07", pedidos: 2, monto: 30000 }],
    });
    PedidosService.obtenerPedidos.mockRejectedValue(new Error("pedidos-service caido"));

    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    expect(await screen.findByTestId("diario-detalle-error")).toBeInTheDocument();
    expect(screen.queryByText(/Sin detalle de productos/i)).not.toBeInTheDocument();
  });
});

// --- Pulido del tablero: KPIs agrupados y días compactos (feedback del usuario) ---
describe("AdminPanel - Tablero pulido", () => {
  const statsTablero = {
    totalProductosCatalogo: 19,
    categoriasActivas: 5,
    pedidosTotales: 38,
    montoTotalPedidos: 2060330,
    pedidosHoy: 1,
    montoVentasHoy: 65000,
    datosCompletos: true,
    ventasDiarias: [
      { fecha: "2026-11-07", pedidos: 1, monto: 65000 },
      { fecha: "2026-11-06", pedidos: 0, monto: 0 },
    ],
    ventasPeriodo: {
      dia: { desde: "2026-11-07", hasta: "2026-11-07", pedidos: 1, monto: 65000 },
      semana: { desde: "2026-11-01", hasta: "2026-11-07", pedidos: 1, monto: 65000 },
      mes: { desde: "2026-11-01", hasta: "2026-11-07", pedidos: 1, monto: 65000 },
    },
    metas: { dia: 300000, semana: 400000, mes: 1500000 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.setItem("userToken", "token-test-123");
    sessionStorage.setItem("userName", "Admin");
    ProductosService.obtenerProductos.mockResolvedValue([
      { id: 1, nombre: "Torta Chocolate", precio: 15000, categoria: "Nuestras Tortas", imagenUrl: "torta3Leches.jpg", descripcion: "Deliciosa" },
    ]);
    EstadisticasService.obtenerEstadisticas.mockResolvedValue(statsTablero);
    PedidosService.obtenerVentasPorProducto.mockResolvedValue([]);
    PedidosService.obtenerPedidos.mockResolvedValue([]);
    EstadisticasService.guardarMetas.mockResolvedValue({});
  });

  it("29. Los totales del negocio se agrupan aparte de las cifras del periodo", async () => {
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    // El rótulo separa lo que cambia con Día/Semana/Mes de lo que no cambia
    expect(await screen.findByText("Totales del negocio")).toBeInTheDocument();
    expect(screen.getByText("Ventas totales")).toBeInTheDocument();
    expect(screen.getByText("Pedidos totales")).toBeInTheDocument();
    expect(screen.getByText("Total catálogo")).toBeInTheDocument();
    expect(screen.getByText("Categorías")).toBeInTheDocument();
  });

  it("30. Los productos de cada día se despliegan al pedirlos (sección compacta)", async () => {
    PedidosService.obtenerPedidos.mockResolvedValue([
      {
        id: 900,
        fecha: "2026-11-07T12:00:00Z",
        productos: [{ nombre: "Pastel de bodas My Dreams", cantidad: 1, subtotal: 65000 }],
      },
    ]);
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    await screen.findByTestId("lista-dias");
    // Plegado por defecto: el día no empuja toda la página hacia abajo
    expect(screen.queryByText("Pastel de bodas My Dreams")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /ver productos/i }));
    expect(await screen.findByText("Pastel de bodas My Dreams")).toBeInTheDocument();

    // Y se vuelve a plegar
    fireEvent.click(screen.getByRole("button", { name: /ocultar productos/i }));
    expect(screen.queryByText("Pastel de bodas My Dreams")).toBeNull();
  });

  it("31. Productos más vistos: muestra el top que llega del stream", async () => {
    ProductosService.obtenerProductos.mockResolvedValue([
      { id: 10, nombre: "Tarta de Yogurt", precio: 11000, categoria: "Tartas", imagenUrl: "tartaYogurth.jpg", descripcion: "Ligera" },
    ]);
    EstadisticasService.obtenerProductosVistos.mockResolvedValue([
      { producto_id: 10, vistas: 3 },
      { producto_id: 99, vistas: 1 },
    ]);
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    // El nombre del producto también vive en la tabla del catálogo: las
    // verificaciones se acotan a la sección "Productos más vistos"
    const titulo = await screen.findByText("Productos más vistos");
    const seccionVistos = titulo.closest(".admin-diario");

    expect(await within(seccionVistos).findByText("Tarta de Yogurt")).toBeInTheDocument();
    expect(within(seccionVistos).getByText(/3 vistas/)).toBeInTheDocument();
    // El % del total acompaña a cada fila (3 de 4 vistas = 75%)
    expect(within(seccionVistos).getByText("75%")).toBeInTheDocument();
    // Producto que ya no está en el catálogo: se muestra con su id, sin inventar nombre
    expect(within(seccionVistos).getByText("Producto #99")).toBeInTheDocument();
  });

  it("32. Productos más vistos: top 5 con 'Ver más' para el resto", async () => {
    const muchasVistas = Array.from({ length: 8 }, (_, i) => ({
      producto_id: 100 + i,
      vistas: 8 - i,
    }));
    EstadisticasService.obtenerProductosVistos.mockResolvedValue(muchasVistas);
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    const titulo = await screen.findByText("Productos más vistos");
    const seccionVistos = titulo.closest(".admin-diario");

    // De entrada solo 5 filas y el botón que ofrece el resto
    expect(await within(seccionVistos).findByText("Producto #100")).toBeInTheDocument();
    expect(within(seccionVistos).queryByText("Producto #105")).toBeNull();
    fireEvent.click(within(seccionVistos).getByRole("button", { name: /ver los 8/i }));

    expect(await within(seccionVistos).findByText("Producto #105")).toBeInTheDocument();
    fireEvent.click(within(seccionVistos).getByRole("button", { name: /ver menos/i }));
    expect(within(seccionVistos).queryByText("Producto #105")).toBeNull();
  });

  it("33. El panel se navega por zonas: Resumen, Pedidos y Productos", async () => {
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    // Se espera al estado "ok" del dashboard: el título del estado "cargando"
    // se destruye cuando llegan los datos y rompería las visibilidades
    await screen.findByTestId("kpis-dashboard");

    // De entrada: el resumen visible y las otras zonas guardadas
    expect(screen.getByText(/Resumen de ventas/i)).toBeVisible();
    expect(screen.getByText("Nuevo Ingreso")).not.toBeVisible();

    fireEvent.click(screen.getByRole("tab", { name: /productos/i }));
    expect(screen.getByText("Nuevo Ingreso")).toBeVisible();
    expect(screen.getByText(/Resumen de ventas/i)).not.toBeVisible();

    fireEvent.click(screen.getByRole("tab", { name: /pedidos/i }));
    expect(screen.getByRole("heading", { name: /pedidos recibidos/i })).toBeVisible();
    expect(screen.getByText("Nuevo Ingreso")).not.toBeVisible();
    // La tabla del catálogo vive en la misma zona que el formulario: las dos
    // cosas se ocultan juntas (fuga detectada en la revisión visual)
    expect(screen.getByText("Miniatura")).not.toBeVisible();
    // Atributo hidden presente en las zonas guardadas: lo visual depende del
    // navegador, pero la lógica de las zonas se fija aquí sin depender del CSS
    expect(document.querySelector(".admin-seccion-gestion").closest(".admin-zona")).toHaveAttribute("hidden");
    expect(document.querySelector(".admin-zona")).toHaveAttribute("hidden");
  });
});
