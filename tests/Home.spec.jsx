import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import Home from "../src/pages/Home";
import { CarritoProvider } from "../src/context/CarritoContext";
import { obtenerProductos } from "../src/service/ProductosService";
import '@testing-library/jest-dom';

// El Home ahora lee el catálogo real: nunca pega a la API en los tests
vi.mock("../src/service/ProductosService", () => ({
  obtenerProductos: vi.fn(),
  aplanarCatalogo: vi.fn((datos) => Object.values(datos).flat()),
}));

// Respuesta simulada de GET /api/productos (Map agrupado por categoría)
const catalogoDePrueba = {
  Tortas: [
    { id: 1, nombre: "Selva Negra", precio: 14500, imagenUrl: "tortaSelvaNegra.jpg", descripcion: "Bizcocho de chocolate." },
    { id: 2, nombre: "Manjar Lúcuma", precio: 12000, imagenUrl: "tortaManjarLucuma.jpg", descripcion: "Crema de manjar." },
    { id: 3, nombre: "Tres Leches", precio: 13000, imagenUrl: "torta3Leches.jpg", descripcion: "Húmeda y suave." },
  ],
  Personales: [
    { id: 4, nombre: "Brownie de Nuez", precio: 3500, imagenUrl: "brownieChocolateNuez.jpg", descripcion: "Intenso sabor chocolate." },
    { id: 5, nombre: "Muffin de Arándano", precio: 2500, imagenUrl: "muffinsPlatanoArandano.jpg", descripcion: "Esponjoso y dulce." },
  ],
};

const renderHome = () =>
  render(
    <CarritoProvider>
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    </CarritoProvider>
  );

describe("Pruebas de la Página Principal (Home)", () => {
  beforeEach(() => {
    // Estado limpio: el banner de bienvenida depende de localStorage y sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    obtenerProductos.mockResolvedValue(catalogoDePrueba);
  });

  it("debe renderizar el título principal y el eslogan", () => {
    renderHome();

    expect(screen.getByText(/Bienvenido a Pastelería My Dreams/i)).toBeInTheDocument();
    expect(screen.getByText(/sabores que iluminan tus sueños/i)).toBeInTheDocument();
  });

  it("debe mostrar la delicia del día con su precio y botón de alta", async () => {
    renderHome();

    const seccion = await screen.findByTestId("delicia-dia");
    expect(seccion).toBeInTheDocument();
    // El botón abre el modal de cantidad y da de alta en el carrito
    expect(screen.getByRole("button", { name: /Agregar al carrito/i })).toBeInTheDocument();
  });

  it("debe mostrar 3 favoritos distintos de la delicia del día", async () => {
    renderHome();

    // 1 delicia + 3 favoritos = 4 tarjetas con producto
    const titulos = await screen.findAllByRole("heading", { level: 3 });
    expect(titulos).toHaveLength(4);

    // Ningún producto se repite entre delicia y favoritos
    const nombres = titulos.map((t) => t.textContent);
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it("debe mostrar los nombres y precios con formato chileno", async () => {
    renderHome();

    await screen.findByTestId("delicia-dia");
    expect(screen.getAllByText(/\$[\d.]+/).length).toBeGreaterThanOrEqual(4);
  });

  it("usa los productos de respaldo si la API no responde", async () => {
    obtenerProductos.mockRejectedValue(new Error("sin conexión"));

    renderHome();

    // El fallback evita que la home quede vacía
    expect(await screen.findByText(/Kutchen de Manzana/i)).toBeInTheDocument();
  });

  it("debe tener un único botón que redirige al catálogo, el del hero", () => {
    renderHome();

    // Cathi: un solo CTA al catálogo (no duplicar "Ver delicias" + "Ver catálogo")
    const enlacesCatalogo = screen
      .getAllByRole("link")
      .filter((enlace) => enlace.getAttribute("href") === "/delicias");
    expect(enlacesCatalogo).toHaveLength(1);
    expect(enlacesCatalogo[0]).toHaveTextContent(/Ver nuestras delicias/i);
  });

  it("muestra el banner de bienvenida solo con código pendiente y sesión activa", () => {
    localStorage.setItem("md_codigo_bienvenida", "BIENVENIDO10");
    sessionStorage.setItem("userName", "Catherine");

    renderHome();

    expect(screen.getByTestId("banner-bienvenida")).toBeInTheDocument();
    expect(screen.getByTestId("codigo-bienvenida-home")).toHaveTextContent("BIENVENIDO10");
    expect(screen.getByRole("link", { name: /Usar mi descuento/i })).toHaveAttribute(
      "href",
      "/pedido"
    );
  });

  it("no muestra el banner sin sesión de cliente", () => {
    localStorage.setItem("md_codigo_bienvenida", "BIENVENIDO10");

    renderHome();

    expect(screen.queryByTestId("banner-bienvenida")).not.toBeInTheDocument();
  });
});
