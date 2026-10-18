import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import Header from "../src/components/Header";
import { CarritoProvider } from "../src/context/CarritoContext";
import '@testing-library/jest-dom';

describe("Pruebas de Navegación del Header", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("1. Debe contener los enlaces básicos de navegación", () => {
    render(<MemoryRouter><CarritoProvider><Header /></CarritoProvider></MemoryRouter>);
    expect(screen.getByText(/Inicio/i)).toBeInTheDocument();
    expect(screen.getByText(/Delicias/i)).toBeInTheDocument();
  });

  it("2. Debe mostrar el botón de Admin si el usuario tiene nombre 'admin'", () => {
    // CLAVE: Tu Header.jsx evalúa que el NOMBRE sea 'admin'
    sessionStorage.setItem('userName', 'admin'); 

    render(<MemoryRouter><CarritoProvider><Header /></CarritoProvider></MemoryRouter>);

    // Buscamos el enlace que contiene la palabra Admin, ignorando el emoji
    const adminLink = screen.getByRole('link', { name: /Admin/i });
    expect(adminLink).toBeInTheDocument();
  });
});