import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import App from "../src/App";
import {
  obtenerProductos,
  obtenerDeliciaDelDia,
  aplanarCatalogo,
} from "../src/service/ProductosService";
import * as EstadisticasService from "../src/service/EstadisticasService";
import * as PedidosService from "../src/service/PedidosService";
import "@testing-library/jest-dom";

// Todas las páginas públicas usan fondoPagina.jpeg como fondo de pantalla
// completa (clase fondo-pagina); fondoHistoria.jpeg vive solo como fondo
// de la cita de /historia. El confeti de pastelitos se retiró por
// decisión del cliente.
vi.mock("../src/service/ProductosService", () => ({
  obtenerProductos: vi.fn(),
  obtenerDeliciaDelDia: vi.fn(),
  aplanarCatalogo: vi.fn((datos) => Object.values(datos || {}).flat()),
  crearProducto: vi.fn(),
  actualizarProducto: vi.fn(),
  eliminarProducto: vi.fn(),
}));

vi.mock("../src/service/EstadisticasService", () => ({
  obtenerEstadisticas: vi.fn(),
  guardarMetas: vi.fn(),
}));

vi.mock("../src/service/PedidosService", () => ({
  obtenerVentasPorProducto: vi.fn(),
}));

vi.mock("sweetalert2", () => ({
  default: { fire: vi.fn(() => Promise.resolve({ isConfirmed: true })) },
}));

// Login usa el botón de Google: con un stub alcanza para verificar el fondo
vi.mock("@react-oauth/google", () => ({
  GoogleLogin: () => <button data-testid="google-login-stub" />,
}));

const montar = (ruta) =>
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>
  );

describe("Fondos de imagen en las páginas internas", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    obtenerProductos.mockResolvedValue({
      tortas: [
        { id: 1, nombre: "Torta Moka", precio: 15000, imagenUrl: "moka.jpg", categoria: "tortas" },
      ],
    });
    // /pedido pasa por ProtectedRoute: exige token (sin rol específico)
    sessionStorage.setItem("userToken", "tok-de-prueba");
  });

  it("Delicias: el main lleva el fondo de página", async () => {
    montar("/delicias");
    const titulo = await screen.findByRole("heading", { level: 1, name: /Nuestro Catálogo/i });
    expect(titulo.closest("main")).toHaveClass("fondo-pagina");
  });

  it("Contacto: el main lleva el fondo de página", async () => {
    montar("/contacto");
    const titulo = await screen.findByRole("heading", { level: 1, name: /Contáctanos/i });
    expect(titulo.closest("main")).toHaveClass("fondo-pagina");
  });

  it("Pedido: el main lleva el fondo de página", async () => {
    montar("/pedido");
    const titulo = await screen.findByRole("heading", { level: 1, name: /Haz tu pedido/i });
    expect(titulo.closest("main")).toHaveClass("fondo-pagina");
  });

  it("Pedido sin sesión (teaser): el main también lleva el fondo", async () => {
    sessionStorage.removeItem("userToken");
    montar("/pedido");
    const titulo = await screen.findByRole("heading", { level: 1, name: /Haz tu pedido/i });
    expect(titulo.closest("main")).toHaveClass("fondo-pagina");
  });

  it("Estado: el main lleva el fondo de página", async () => {
    montar("/estado");
    const titulo = await screen.findByRole("heading", { level: 1, name: /Consulta tu pedido/i });
    expect(titulo.closest("main")).toHaveClass("fondo-pagina");
  });

  it("Historia: el main lleva el mismo fondo de página que el resto", async () => {
    montar("/historia");
    const titulo = await screen.findByRole("heading", { level: 1, name: /Nuestra historia/i });
    expect(titulo.closest("main")).toHaveClass("fondo-pagina");
  });

  it("Inicio: el main lleva el fondo de página", async () => {
    montar("/");
    const titulo = await screen.findByRole("heading", {
      level: 1,
      name: /Bienvenido a Pastelería My Dreams/i,
    });
    expect(titulo.closest("main")).toHaveClass("fondo-pagina");
  });

  it("Login: el main lleva el fondo de página", async () => {
    montar("/login");
    const titulo = await screen.findByRole("heading", { level: 1, name: /Pastelería My Dreams/i });
    expect(titulo.closest("main")).toHaveClass("fondo-pagina");
  });

  it("AdminLogin: el main lleva el fondo de página", async () => {
    montar("/admin/login");
    const titulo = await screen.findByRole("heading", { level: 1, name: /Pastelería My Dreams/i });
    expect(titulo.closest("main")).toHaveClass("fondo-pagina");
  });

  it("Panel de administración: el contenedor raíz lleva el fondo de página", async () => {
    sessionStorage.setItem("userRole", "admin");
    sessionStorage.setItem("userName", "Admin");
    obtenerProductos.mockResolvedValue([
      {
        id: 1,
        nombre: "Torta Chocolate",
        precio: 15000,
        categoria: "Nuestras Tortas",
        imagenUrl: "torta3Leches.jpg",
        descripcion: "Deliciosa",
      },
    ]);
    EstadisticasService.obtenerEstadisticas.mockResolvedValue({
      totalProductosCatalogo: 1,
      categoriasActivas: 4,
      estadoServicio: "UP",
    });
    PedidosService.obtenerVentasPorProducto.mockResolvedValue([]);

    montar("/admin");
    const titulo = await screen.findByRole("heading", { level: 1, name: /Gestión My Dreams/i });
    expect(titulo.closest(".admin-layout-container")).toHaveClass("fondo-pagina");
  });
});
