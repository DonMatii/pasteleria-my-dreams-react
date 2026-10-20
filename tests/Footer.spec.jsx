import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, test, expect } from "vitest";
import React from "react";
import Footer from "../src/components/Footer";
import "@testing-library/jest-dom";

// El footer es la única puerta visible hacia el panel de administración
// (práctica profesional: la consola admin no se anuncia en la navegación principal).
describe("Footer con acceso de administración", () => {
  const montar = () =>
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

  test("muestra el copyright del proyecto", () => {
    montar();
    expect(screen.getByText(/Todos los derechos reservados/i)).toBeInTheDocument();
  });

  test("incluye el enlace discreto al panel de administración", () => {
    montar();
    const enlace = screen.getByRole("link", { name: /Panel de administración/i });
    expect(enlace).toHaveAttribute("href", "/admin/login");
  });
});
