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

  it("2. Debe mostrar el botón de Admin solo con sesión de administrador (userRole)", () => {
    // CLAVE: el Header ahora evalúa el ROL del login (separación admin/cliente), no el nombre
    sessionStorage.setItem('userName', 'admin');
    sessionStorage.setItem('userRole', 'admin');

    render(<MemoryRouter><CarritoProvider><Header /></CarritoProvider></MemoryRouter>);

    // Buscamos el enlace que contiene la palabra Admin, ignorando el emoji
    const adminLink = screen.getByRole('link', { name: /Admin/i });
    expect(adminLink).toBeInTheDocument();
  });

  it("3. Un cliente con Google no ve el botón de Admin", () => {
    sessionStorage.setItem('userName', 'Cliente Test');
    sessionStorage.setItem('userRole', 'cliente');

    render(<MemoryRouter><CarritoProvider><Header /></CarritoProvider></MemoryRouter>);

    expect(screen.queryByRole('link', { name: /Admin/i })).not.toBeInTheDocument();
  });
});