import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import TeaserPedido from "../src/components/TeaserPedido";
import "@testing-library/jest-dom";

// El teaser usa <Link>: se monta con Router propio (igual que en la app real)
const renderTeaser = () =>
  render(
    <MemoryRouter>
      <TeaserPedido />
    </MemoryRouter>
  );

describe("TeaserPedido", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("ofrece reclamar el código de bienvenida en la primera conexión", () => {
    renderTeaser();

    // El código es de un solo uso por email: el CTA no promete un 10% repetible
    expect(screen.getByTestId("teaser-cta")).toHaveTextContent(
      "Iniciar sesión y reclamar mi código"
    );
    expect(screen.getByTestId("teaser-descuento")).toBeInTheDocument();
  });

  it("solo pide iniciar sesión cuando el navegador ya conectó antes", () => {
    localStorage.setItem("md_primera_conexion", "1");
    renderTeaser();

    expect(screen.getByTestId("teaser-cta")).toHaveTextContent(/^Iniciar sesión$/);
    expect(screen.queryByTestId("teaser-descuento")).not.toBeInTheDocument();
  });
});
