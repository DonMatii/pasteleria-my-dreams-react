import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";
import React from "react";
import Delicias from "../src/pages/Delicias";
import { CarritoProvider } from "../src/context/CarritoContext";
import * as ProductosService from "../src/service/ProductosService";
import "@testing-library/jest-dom";

// Solo se mockean las llamadas HTTP; aplanarCatalogo corre real
// (mismo patrón que Delicias.spec.jsx).
vi.mock("../src/service/ProductosService", async (importOriginal) => {
  const modulo = await importOriginal();
  return {
    ...modulo,
    obtenerProductos: vi.fn(),
    obtenerDeliciaDelDia: vi.fn(),
  };
});

const CATALOGO = {
  tortas: [
    {
      id: 1,
      nombre: "Torta Moka",
      categoria: "tortas",
      precio: 15000,
      imagenUrl: "tortaMoka.jpg",
      descripcion: "Torta de moka",
    },
  ],
  queques: [
    {
      id: 10,
      nombre: "Queque Naranja",
      categoria: "queques",
      precio: 8000,
      imagenUrl: "quequeNaranja.jpg",
      descripcion: "Queque de naranja",
    },
  ],
};

// Las pills son navegación por anclas (no filtran): una pill por sección
// visible, cada sección con su id, y scroll suave al pulsar (respetando
// prefers-reduced-motion vía matchMedia en el componente).
describe("Delicias - pills de navegación por categoría", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ProductosService.obtenerProductos.mockResolvedValue(CATALOGO);
    ProductosService.obtenerDeliciaDelDia.mockResolvedValue(null);
  });

  const montar = () =>
    render(
      <CarritoProvider>
        <Delicias />
      </CarritoProvider>
    );

  test("muestra una pill por cada sección que tiene productos", async () => {
    montar();
    await screen.findByRole("heading", { name: "Torta Moka" });

    const nav = screen.getByRole("navigation", { name: /categorías del catálogo/i });
    expect(within(nav).getByRole("button", { name: "Nuestras Tortas" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Queques Artesanales" })).toBeInTheDocument();
    // Sección sin productos: sin sección y sin pill
    expect(within(nav).queryByRole("button", { name: "Sabores Frutales" })).not.toBeInTheDocument();
  });

  test("cada sección renderizada lleva el id de su pill como ancla", async () => {
    montar();
    await screen.findByRole("heading", { name: "Torta Moka" });

    expect(document.getElementById("nuestras-tortas")).not.toBeNull();
    expect(document.getElementById("queques-artesanales")).not.toBeNull();
  });

  test("al pulsar una pill hace scroll hacia su sección", async () => {
    // jsdom no implementa scrollIntoView: el test lo espias
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;

    montar();
    await screen.findByRole("heading", { name: "Torta Moka" });

    fireEvent.click(screen.getByRole("button", { name: "Nuestras Tortas" }));

    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });
});
