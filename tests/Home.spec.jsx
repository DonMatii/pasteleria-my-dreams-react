import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import Home from "../src/pages/Home";
import '@testing-library/jest-dom';

describe("Pruebas de la Página Principal (Home)", () => {
  beforeEach(() => {
    // Estado limpio: el banner de bienvenida depende de localStorage y sessionStorage
    localStorage.clear();
    sessionStorage.clear();
  });
  it("debe renderizar el título principal y el eslogan", () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    
    // Verifica el título principal que programamos hoy
    expect(screen.getByText(/Bienvenido a Pastelería My Dreams/i)).toBeInTheDocument();
    expect(screen.getByText(/sabores que iluminan tus sueños/i)).toBeInTheDocument();
  });

  it("debe mostrar los productos destacados con sus imágenes", () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    // Verificamos que se rendericen las imágenes de los favoritos
    const imagenes = screen.getAllByRole("img");
    // Al menos deben estar las 3 de los productos destacados
    expect(imagenes.length).toBeGreaterThanOrEqual(3);
  });

  it("debe mostrar los nombres y precios de los favoritos", () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    
    // Verificamos productos específicos que definimos en el array de Home.jsx
    expect(screen.getByText(/Kutchen de Manzana/i)).toBeInTheDocument();
    expect(screen.getByText(/Pie de Limón/i)).toBeInTheDocument();
    expect(screen.getByText(/Torta Crema Piña/i)).toBeInTheDocument();
    
    // Verifica que los precios con formato estén presentes
    expect(screen.getByText("$5.500")).toBeInTheDocument();
  });

  it("debe tener el botón que redirige al catálogo completo", () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
    
    const botonCatalogo = screen.getByRole("link", { name: /Ver Catálogo Completo/i });
    expect(botonCatalogo).toHaveAttribute("href", "/delicias");
  });

  it("muestra el banner de bienvenida solo con código pendiente y sesión activa", () => {
    localStorage.setItem("md_codigo_bienvenida", "BIENVENIDO10");
    sessionStorage.setItem("userName", "Catherine");

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(screen.getByTestId("banner-bienvenida")).toBeInTheDocument();
    expect(screen.getByTestId("codigo-bienvenida-home")).toHaveTextContent("BIENVENIDO10");
    expect(screen.getByRole("link", { name: /Usar mi descuento/i })).toHaveAttribute(
      "href",
      "/pedido"
    );
  });

  it("no muestra el banner sin sesión de cliente", () => {
    localStorage.setItem("md_codigo_bienvenida", "BIENVENIDO10");

    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(screen.queryByTestId("banner-bienvenida")).not.toBeInTheDocument();
  });
});