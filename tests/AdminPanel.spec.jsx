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
}));

// El panel también consulta el microservicio de estadísticas al montar.
vi.mock("../src/service/EstadisticasService", () => ({
  obtenerEstadisticas: vi.fn(),
  guardarMetas: vi.fn(),
}));

// El dashboard pide las ventas por producto a pedidos-service para el periodo elegido.
vi.mock("../src/service/PedidosService", () => ({
  obtenerVentasPorProducto: vi.fn(),
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
    EstadisticasService.guardarMetas.mockResolvedValue({});
  });

  it("1. READ: Debe listar productos correctamente", async () => {
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);
    expect(await screen.findByText(/Torta Chocolate/i)).toBeInTheDocument();
    expect(ProductosService.obtenerProductos).toHaveBeenCalled();
  });

  it("2. CREATE: Debe llamar a crearProducto con los datos del formulario", async () => {
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    // Llenamos TODOS los campos que la validación manual requiere
    fireEvent.change(screen.getByLabelText(/Nombre del Producto/i), { target: { value: "Brazo de Reina" } });
    fireEvent.change(screen.getByLabelText(/Precio/i), { target: { value: "8000" } });
    fireEvent.change(screen.getByLabelText(/Descripción/i), { target: { value: "Manjar y bizcocho" } });
    fireEvent.change(screen.getByLabelText(/Sección en Web/i), { target: { value: "Sabores Frutales" } });
    fireEvent.change(screen.getByLabelText(/Imagen del Archivo/i), { target: { value: "alfajor.jpg" } });

    // Hacemos clic en Publicar
    const botonPublicar = screen.getByRole("button", { name: /Publicar/i });
    fireEvent.click(botonPublicar);

    await waitFor(() => {
      expect(ProductosService.crearProducto).toHaveBeenCalledWith(expect.objectContaining({ 
        nombre: "Brazo de Reina",
        precio: 8000,
        categoria: "Sabores Frutales",
        imagenUrl: "alfajor.jpg"
      }));
    });
    expect(ProductosService.actualizarProducto).not.toHaveBeenCalled();
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: "success" }));
  });

  it("3. UPDATE: Debe cambiar a modo edición y llamar a actualizarProducto", async () => {
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    // Buscamos el botón de editar (el emoji con su aria-label)
    const botonEditar = await screen.findByLabelText("✏️");
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

    const botonEliminar = await screen.findByLabelText("🗑️");
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

    // Llenamos campos para pasar la validación inicial de "Campos incompletos"
    fireEvent.change(screen.getByLabelText(/Nombre del Producto/i), { target: { value: "Test Error" } });
    fireEvent.change(screen.getByLabelText(/Precio/i), { target: { value: "5000" } });
    fireEvent.change(screen.getByLabelText(/Descripción/i), { target: { value: "Test" } });
    fireEvent.change(screen.getByLabelText(/Sección en Web/i), { target: { value: "Nuestras Tortas" } });
    fireEvent.change(screen.getByLabelText(/Imagen del Archivo/i), { target: { value: "alfajor.jpg" } });
    
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

    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    // Los dos indicadores del día viven juntos en su propio bloque
    const bloqueVentas = (await screen.findByText(/Ventas hoy/i)).parentElement;
    expect(bloqueVentas).toHaveTextContent("$48.990");

    const bloquePedidos = screen.getByText(/Pedidos hoy/i).parentElement;
    expect(bloquePedidos).toHaveTextContent("2");

    // La ventana es una tabla propia con cabecera más los 7 días
    await screen.findByRole("heading", { name: /últimos 7 días/i });
    const tabla = screen.getByRole("table", { name: /últimos 7 días/i });
    expect(within(tabla).getAllByRole("row")).toHaveLength(8);
    expect(within(tabla).getByText("21-10-2026")).toBeInTheDocument();
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
});
