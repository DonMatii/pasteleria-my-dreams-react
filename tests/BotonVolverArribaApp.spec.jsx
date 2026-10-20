import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import App from "../src/App";
import { obtenerProductos } from "../src/service/ProductosService";
import "@testing-library/jest-dom";

// La app completa se monta sin pegar a la API real
vi.mock("../src/service/ProductosService", () => ({
  obtenerProductos: vi.fn(),
  obtenerDeliciaDelDia: vi.fn(),
  aplanarCatalogo: vi.fn((datos) => Object.values(datos).flat()),
}));

const catalogoDePrueba = {
  Tortas: [
    { id: 1, nombre: "Selva Negra", precio: 14500, imagenUrl: "tortaSelvaNegra.jpg", descripcion: "Bizcocho de chocolate." },
  ],
};

const simularScroll = (posicion) => {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value: posicion,
  });
  fireEvent.scroll(window);
};

describe("Botón volver arriba dentro de la App real", () => {
  let scrollToSpy;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    obtenerProductos.mockResolvedValue(catalogoDePrueba);
    scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    simularScroll(0);
  });

  afterEach(() => {
    scrollToSpy.mockRestore();
  });

  it("está montado y aparece al bajar en el Home", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    // Si no estuviera montado en App, esto no encuentra nada
    const boton = screen.getByTestId("volver-arriba");
    expect(boton).not.toBeVisible();

    simularScroll(600);

    expect(boton).toBeVisible();
    fireEvent.click(boton);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
