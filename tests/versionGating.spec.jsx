import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";

vi.mock("../src/service/apiClient", () => ({
  default: { get: vi.fn() },
  URL_BASE: "http://test",
}));

import apiClient from "../src/service/apiClient";
import { VersionProvider, useVersion } from "../src/context/VersionContext";
import VersionGate from "../src/components/VersionGate";

// Sistema de permisos por versión (demo de las tres versiones): cada usuario de
// Google accede solo a las funciones de su versión, y el rechazo se comunica
// claramente (en la demo, ver el rechazo es parte de probar los permisos).
const Probador = () => {
  const { version, tieneVersion } = useVersion();
  return (
    <div>
      <span data-testid="version">{version}</span>
      <span data-testid="puede-v2">{tieneVersion(2) ? "si" : "no"}</span>
    </div>
  );
};

describe("Sistema de permisos por versión", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("usuario V1: versión 1 y sin acceso a funciones de la V2", async () => {
    sessionStorage.setItem("userEmail", "catherine.godoy.g@gmail.com");
    sessionStorage.setItem("userRole", "cliente");
    apiClient.get.mockResolvedValue({ data: { email: "catherine.godoy.g@gmail.com", version: 1 } });

    render(<VersionProvider><Probador /></VersionProvider>);

    await waitFor(() => expect(screen.getByTestId("version")).toHaveTextContent("1"));
    expect(screen.getByTestId("puede-v2")).toHaveTextContent("no");
  });

  it("usuario V3: acceso a todas las funciones", async () => {
    sessionStorage.setItem("userEmail", "contacto.donmatii@gmail.com");
    sessionStorage.setItem("userRole", "cliente");
    apiClient.get.mockResolvedValue({ data: { email: "contacto.donmatii@gmail.com", version: 3 } });

    render(<VersionProvider><Probador /></VersionProvider>);

    await waitFor(() => expect(screen.getByTestId("version")).toHaveTextContent("3"));
    expect(screen.getByTestId("puede-v2")).toHaveTextContent("si");
  });

  it("el administrador tiene todas las funciones sin consultar versión", async () => {
    sessionStorage.setItem("userRole", "admin");

    render(<VersionProvider><Probador /></VersionProvider>);

    await waitFor(() => expect(screen.getByTestId("version")).toHaveTextContent("3"));
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("la compuerta denega educadamente las funciones de versiones posteriores", async () => {
    sessionStorage.setItem("userEmail", "catherine.godoy.g@gmail.com");
    sessionStorage.setItem("userRole", "cliente");
    apiClient.get.mockResolvedValue({ data: { version: 1 } });

    render(
      <MemoryRouter>
        <VersionProvider>
          <VersionGate minima={2}>
            <p>Función de la versión 2</p>
          </VersionGate>
        </VersionProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText(/no está en tu versión/i)).toBeInTheDocument();
    expect(screen.queryByText("Función de la versión 2")).toBeNull();
  });

  it("sin versión habilitada (403) todo queda denegado", async () => {
    sessionStorage.setItem("userEmail", "desconocido@ejemplo.cl");
    sessionStorage.setItem("userRole", "cliente");
    apiClient.get.mockRejectedValue(new Error("403"));

    render(<VersionProvider><Probador /></VersionProvider>);

    await waitFor(() => expect(screen.getByTestId("version")).toHaveTextContent("0"));
    expect(screen.getByTestId("puede-v2")).toHaveTextContent("no");
  });

  it("sin email en la sesión se conserva el acceso completo (invitados y sesiones previas)", async () => {
    sessionStorage.setItem("userToken", "token-sin-email");
    sessionStorage.setItem("userRole", "cliente");

    render(<VersionProvider><Probador /></VersionProvider>);

    await waitFor(() => expect(screen.getByTestId("version")).toHaveTextContent("3"));
    expect(screen.getByTestId("puede-v2")).toHaveTextContent("si");
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("al iniciar sesión en caliente (sin recargar) se consulta la versión del nuevo usuario", async () => {
    // La app arranca sin sesión: acceso completo de invitado
    const { rerender } = render(<VersionProvider><Probador /></VersionProvider>);
    await waitFor(() => expect(screen.getByTestId("version")).toHaveTextContent("3"));

    // El usuario inicia sesión con Google sin recargar la página (SPA)
    sessionStorage.setItem("userEmail", "mat.suazog@duocuc.cl");
    sessionStorage.setItem("userRole", "cliente");
    apiClient.get.mockResolvedValue({ data: { email: "mat.suazog@duocuc.cl", version: 2 } });

    rerender(<VersionProvider><Probador /></VersionProvider>);

    await waitFor(() => expect(screen.getByTestId("version")).toHaveTextContent("2"));
    expect(screen.getByTestId("puede-v2")).toHaveTextContent("si");
    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/usuarios/version",
      { params: { email: "mat.suazog@duocuc.cl" } }
    );
  });
});
