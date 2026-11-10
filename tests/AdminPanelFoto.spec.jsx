import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";

import AdminPanel from "../src/pages/AdminPanel.jsx";
import * as ProductosService from "../src/service/ProductosService";
import * as EstadisticasService from "../src/service/EstadisticasService";
import * as PedidosService from "../src/service/PedidosService";
import '@testing-library/jest-dom';

vi.mock("../src/service/ProductosService", () => ({
  obtenerProductos: vi.fn(),
  obtenerDeliciaDelDia: vi.fn(),
  crearProducto: vi.fn(),
  actualizarProducto: vi.fn(),
  eliminarProducto: vi.fn(),
  subirImagenProducto: vi.fn(),
}));

vi.mock("../src/service/EstadisticasService", () => ({
  obtenerEstadisticas: vi.fn(),
  guardarMetas: vi.fn(),
}));

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

// Foto de producto desde el admin (S1-S3): al elegir el archivo se sube solo y
// se muestra la vista previa, sin tocar la carpeta del front ni hacer commit.
describe("AdminPanel - Foto de producto", () => {

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.setItem("userToken", "token-test-123");
    sessionStorage.setItem("userName", "Admin");
    ProductosService.obtenerProductos.mockResolvedValue([
      { id: 1, nombre: "Torta Chocolate", precio: 15000, categoria: "Nuestras Tortas", imagenUrl: "torta3Leches.jpg", descripcion: "Deliciosa" }
    ]);
    EstadisticasService.obtenerEstadisticas.mockResolvedValue({
      totalProductosCatalogo: 1,
      categoriasActivas: 4,
      estadoServicio: "UP",
    });
    PedidosService.obtenerVentasPorProducto.mockResolvedValue([]);
    PedidosService.obtenerPedidos.mockResolvedValue([]);
    EstadisticasService.guardarMetas.mockResolvedValue({});
    ProductosService.crearProducto.mockResolvedValue({});
  });

  it("al elegir una foto se sube y se muestra la vista previa", async () => {
    ProductosService.subirImagenProducto.mockResolvedValue("/uploads/foto-nueva.jpg");
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    const archivo = new File(["foto"], "torta.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText(/Foto del producto/i), { target: { files: [archivo] } });

    await waitFor(() => expect(ProductosService.subirImagenProducto).toHaveBeenCalledWith(archivo));
    const vistaPrevia = await screen.findByAltText(/vista previa/i);
    expect(vistaPrevia).toHaveAttribute("src", "/uploads/foto-nueva.jpg");
    // El estado habla en criollo: la foto quedo lista
    expect(screen.getByText(/foto lista/i)).toBeInTheDocument();
  });

  it("si la subida falla se avisa y el formulario sigue util", async () => {
    ProductosService.subirImagenProducto.mockRejectedValue(new Error("500"));
    render(<MemoryRouter><AdminPanel /></MemoryRouter>);

    const archivo = new File(["foto"], "torta.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText(/Foto del producto/i), { target: { files: [archivo] } });

    expect(await screen.findByText(/no se pudo subir la imagen/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Foto del producto/i)).toBeInTheDocument();
  });
});
