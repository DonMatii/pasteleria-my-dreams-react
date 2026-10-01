import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";

import AdminPanel from "../src/pages/AdminPanel.jsx";
import * as ProductosService from "../src/service/ProductosService";
import * as EstadisticasService from "../src/service/EstadisticasService";
import Swal from 'sweetalert2';
import '@testing-library/jest-dom';

// AdminPanel ya NO usa fetch: llama a las funciones del servicio (axios).
vi.mock("../src/service/ProductosService", () => ({
  obtenerProductos: vi.fn(),
  crearProducto: vi.fn(),
  actualizarProducto: vi.fn(),
  eliminarProducto: vi.fn(),
}));

// El panel también consulta el microservicio de estadísticas al montar.
vi.mock("../src/service/EstadisticasService", () => ({
  obtenerEstadisticas: vi.fn(),
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
});
