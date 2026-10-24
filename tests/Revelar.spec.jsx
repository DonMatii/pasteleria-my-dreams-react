import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import Revelar from "../src/components/Revelar";

// Registrador de la instancia creada por cada IntersectionObserver mockeado.
// Permite disparar la interseccion a mano y verificar el ciclo oculto -> visible.
let instanciaObserver = null;

const mockIntersectionObserver = () => {
  // Function (no arrow): el componente lo invoca con `new`
  window.IntersectionObserver = vi.fn(function (callback) {
    const instancia = {
      callback,
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    };
    instanciaObserver = instancia;
    return instancia;
  });
};

describe("Revelar (animacion de entrada al hacer scroll)", () => {
  beforeEach(() => {
    instanciaObserver = null;
    delete window.IntersectionObserver;
    delete window.matchMedia;
  });

  afterEach(() => {
    cleanup();
    delete window.IntersectionObserver;
    delete window.matchMedia;
  });

  it("mantiene el contenido visible cuando el navegador no soporta IntersectionObserver", () => {
    render(
      <Revelar as="div" data-testid="bloque">
        Seccion importante
      </Revelar>
    );

    const bloque = screen.getByTestId("bloque");
    expect(bloque).toBeInTheDocument();
    expect(bloque).not.toHaveClass("revelar");
    expect(bloque).not.toHaveClass("revelar-activo");
  });

  it("arranca oculto con IntersectionObserver disponible y se revela al entrar en pantalla", () => {
    mockIntersectionObserver();

    render(
      <Revelar as="div" data-testid="bloque">
        Seccion importante
      </Revelar>
    );

    const bloque = screen.getByTestId("bloque");
    expect(window.IntersectionObserver).toHaveBeenCalledTimes(1);
    expect(bloque).toHaveClass("revelar");
    expect(bloque).not.toHaveClass("revelar-activo");

    act(() => {
      instanciaObserver.callback([{ isIntersecting: true }]);
    });

    expect(bloque).toHaveClass("revelar-activo");

    // Una vez visible deja de observarse: sin loops ni trabajo infinito
    expect(instanciaObserver.disconnect).toHaveBeenCalledTimes(1);
  });

  it("nunca oculta el contenido si el usuario prefiero menos movimiento", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    mockIntersectionObserver();

    render(
      <Revelar as="div" data-testid="bloque">
        Seccion importante
      </Revelar>
    );

    const bloque = screen.getByTestId("bloque");
    expect(bloque).not.toHaveClass("revelar");
    expect(bloque).not.toHaveClass("revelar-activo");
  });

  it("usa el elemento y las clases que se le pidan", () => {
    mockIntersectionObserver();

    render(
      <Revelar as="section" className="seccion-catalogo" data-testid="seccion">
        Catalogo
      </Revelar>
    );

    const seccion = screen.getByTestId("seccion");
    expect(seccion.tagName).toBe("SECTION");
    expect(seccion).toHaveClass("seccion-catalogo");
    expect(seccion).toHaveClass("revelar");
  });
});
