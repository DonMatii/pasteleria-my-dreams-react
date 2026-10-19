import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import BotonVolverArriba from "../src/components/BotonVolverArriba";
import "@testing-library/jest-dom";

// Simula la posicion de scroll del navegador y dispara el evento scroll
const simularScroll = (posicion) => {
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value: posicion,
  });
  fireEvent.scroll(window);
};

describe("BotonVolverArriba", () => {
  let scrollToSpy;

  beforeEach(() => {
    scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    simularScroll(0);
  });

  afterEach(() => {
    scrollToSpy.mockRestore();
  });

  it("está oculto mientras la página está arriba del todo", () => {
    render(<BotonVolverArriba />);

    // Existe en el DOM pero con visibility: hidden (fuera del árbol a11y)
    expect(screen.getByTestId("volver-arriba")).not.toBeVisible();
  });

  it("aparece cuando el usuario baja la página", () => {
    render(<BotonVolverArriba />);

    simularScroll(600);

    expect(screen.getByRole("button", { name: /volver arriba/i })).toBeVisible();
  });

  it("vuelve al inicio de la página al hacer clic", () => {
    render(<BotonVolverArriba />);

    simularScroll(600);
    fireEvent.click(screen.getByRole("button", { name: /volver arriba/i }));

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
