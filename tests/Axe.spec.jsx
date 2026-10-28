import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, test, expect, vi, beforeEach } from "vitest";
import React from "react";
import { axe, toHaveNoViolations } from "jest-axe";
import "@testing-library/jest-dom";
import Delicias from "../src/pages/Delicias";
import Contacto from "../src/pages/Contacto";
import AdminLogin from "../src/pages/AdminLogin";
import { CarritoProvider } from "../src/context/CarritoContext";
import * as ProductosService from "../src/service/ProductosService";

expect.extend(toHaveNoViolations);

// Mismo patron que DeliciasPills: aplanarCatalogo real, HTTP mockeado.
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
};

// La regla de contraste de color queda DESACTIVADA por decision de
// diseno: la paleta es de la pasteleria y no se toca. Decision
// documentada en el README; el resto de las reglas corren completas.
const OPCIONES_AXE = {
  rules: {
    "color-contrast": { enabled: false },
  },
};

const montar = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("axe - red de seguridad de accesibilidad en la suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ProductosService.obtenerProductos.mockResolvedValue(CATALOGO);
    ProductosService.obtenerDeliciaDelDia.mockResolvedValue(null);
  });

  test("Delicias no tiene violaciones de axe", async () => {
    const { container } = montar(
      <CarritoProvider>
        <Delicias />
      </CarritoProvider>
    );
    await screen.findByRole("heading", { name: "Torta Moka" });

    const resultados = await axe(container, OPCIONES_AXE);
    expect(resultados).toHaveNoViolations();
  });

  test("Contacto no tiene violaciones de axe", async () => {
    const { container } = montar(<Contacto />);
    await screen.findByRole("heading", { name: /cont[aá]ctanos/i });

    const resultados = await axe(container, OPCIONES_AXE);
    expect(resultados).toHaveNoViolations();
  });

  test("AdminLogin no tiene violaciones de axe", async () => {
    const { container } = montar(<AdminLogin />);
    await screen.findByText(/Acceso de Administrador/i);

    const resultados = await axe(container, OPCIONES_AXE);
    expect(resultados).toHaveNoViolations();
  });
});
