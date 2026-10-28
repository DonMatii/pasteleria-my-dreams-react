import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import React from "react";
import Historia from "../src/pages/Historia";
import '@testing-library/jest-dom';

// La historia dejó de ser una sección del Home: ahora es una página propia
// (/historia) con link en el navbar. El copy público es contrato: se fija
// aquí para que nunca se "filtre" lo del curso al sitio.
describe("Página Nuestra historia", () => {
  it("cuenta la historia con nombres reales y sin escuelas del curso", () => {
    render(<Historia />);

    const historia = screen.getByTestId("nuestra-historia");

    // Estructura: título de página y sus tres bloques aprobados
    expect(
      within(historia).getByRole("heading", { level: 1, name: /Nuestra historia/i })
    ).toBeInTheDocument();
    expect(
      within(historia).getByRole("heading", { level: 3, name: /^El nombre$/i })
    ).toBeInTheDocument();
    expect(
      within(historia).getByRole("heading", { level: 3, name: /^La cocina$/i })
    ).toBeInTheDocument();
    expect(
      within(historia).getByRole("heading", { level: 3, name: /Detrás de la web/i })
    ).toBeInTheDocument();

    // Copy público aprobado: con los nombres reales de la familia
    expect(historia).toHaveTextContent(/My Dreams/);
    expect(historia).toHaveTextContent(/Cathi/);
    expect(historia).toHaveTextContent(/Andrés/);
    expect(historia).toHaveTextContent(/Matías/);

    // Decisión de copy: las escuelas quedan fuera del sitio (se lee negocio real)
    expect(historia).not.toHaveTextContent(/duoc/i);
    expect(historia).not.toHaveTextContent(/inacap/i);
  });
});
