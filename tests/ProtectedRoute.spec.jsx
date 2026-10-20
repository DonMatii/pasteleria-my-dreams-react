import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "../src/components/ProtectedRoute";
import { vi, describe, test, expect, beforeEach } from "vitest";
import React from "react";
import "@testing-library/jest-dom";

// S3: /admin exige rol admin; /pedido conserva el gate actual de teaser/token.
describe("ProtectedRoute con rol", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  const montar = (entrada, elemento, extras = {}) =>
    render(
      <MemoryRouter initialEntries={[entrada]}>
        <Routes>
          <Route path="/admin" element={<ProtectedRoute {...extras}>{elemento}</ProtectedRoute>} />
          <Route path="/pedido" element={<ProtectedRoute {...extras}>{elemento}</ProtectedRoute>} />
          <Route path="/admin/login" element={<div data-testid="llego-admin-login" />} />
          <Route path="/login" element={<div data-testid="llego-login" />} />
        </Routes>
      </MemoryRouter>
    );

  test("sin token, /admin redirige a /admin/login (prop to)", () => {
    montar("/admin", <div data-testid="panel" />, { rol: "admin", to: "/admin/login" });

    expect(screen.getByTestId("llego-admin-login")).toBeInTheDocument();
    expect(screen.queryByTestId("panel")).not.toBeInTheDocument();
  });

  test("sin token en ruta sin teaser, redirige a /login por defecto", () => {
    montar("/pedido", <div data-testid="formulario" />);

    expect(screen.getByTestId("llego-login")).toBeInTheDocument();
    expect(screen.queryByTestId("formulario")).not.toBeInTheDocument();
  });

  test("cliente con Google (userRole=cliente) NO entra a /admin aunque tenga token", () => {
    sessionStorage.setItem("userToken", "token-google");
    sessionStorage.setItem("userRole", "cliente");

    montar("/admin", <div data-testid="panel" />, { rol: "admin", to: "/admin/login" });

    expect(screen.getByTestId("llego-admin-login")).toBeInTheDocument();
    expect(screen.queryByTestId("panel")).not.toBeInTheDocument();
  });

  test("sesión sin userRole (antigua) NO entra a /admin: default-deny", () => {
    sessionStorage.setItem("userToken", "token-viejo");

    montar("/admin", <div data-testid="panel" />, { rol: "admin", to: "/admin/login" });

    expect(screen.getByTestId("llego-admin-login")).toBeInTheDocument();
    expect(screen.queryByTestId("panel")).not.toBeInTheDocument();
  });

  test("sesión admin (userRole=admin) entra a /admin", () => {
    sessionStorage.setItem("userToken", "token-admin");
    sessionStorage.setItem("userRole", "admin");

    montar("/admin", <div data-testid="panel" />, { rol: "admin", to: "/admin/login" });

    expect(screen.getByTestId("panel")).toBeInTheDocument();
    expect(screen.queryByTestId("llego-admin-login")).not.toBeInTheDocument();
  });

  test("/pedido con cualquier sesión sigue mostrando el formulario (comportamiento actual)", () => {
    sessionStorage.setItem("userToken", "token-cliente");
    sessionStorage.setItem("userRole", "cliente");

    montar("/pedido", <div data-testid="formulario" />);

    expect(screen.getByTestId("formulario")).toBeInTheDocument();
  });

  test("invitado en /pedido ve el teaser, no redirige (comportamiento actual)", () => {
    montar(
      "/pedido",
      <div data-testid="formulario" />,
      { teaser: <div data-testid="teaser" /> }
    );

    expect(screen.getByTestId("teaser")).toBeInTheDocument();
    expect(screen.queryByTestId("formulario")).not.toBeInTheDocument();
    expect(screen.queryByTestId("llego-login")).not.toBeInTheDocument();
  });
});
