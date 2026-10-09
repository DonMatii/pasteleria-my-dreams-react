/* eslint-disable no-undef */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi, describe, test, expect } from "vitest"; // Aseguramos importar vi
import Contacto from "../src/pages/Contacto"; 

// Mock de SweetAlert2 para que no explote en el test
import Swal from 'sweetalert2';
vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true })
  }
}));

describe("Pruebas de Formulario de Contacto - My Dreams", () => {
  
  test("1. Debe mostrar errores de validación cuando los campos están vacíos", async () => {
    render(<Contacto />);
    const boton = screen.getByRole("button", { name: /Enviar mensaje/i });
    fireEvent.click(boton);
    
    expect(await screen.findByText(/Por favor, ingresa tu nombre/i)).toBeInTheDocument();
    expect(await screen.findByText(/Ingresa un correo electrónico válido/i)).toBeInTheDocument();
    expect(screen.getByText(/Selecciona un motivo/i)).toBeInTheDocument();
  });

  test("2. Debe validar que el teléfono tenga 8 dígitos", () => {
    render(<Contacto />);
    const telInput = screen.getByPlaceholderText(/12345678/i);
    
    fireEvent.change(telInput, { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: /Enviar mensaje/i }));
    
    expect(screen.getByText(/El teléfono debe tener 8 dígitos/i)).toBeInTheDocument();
  });

  test("3. El contador de caracteres debe mostrar el espacio restante (500 - largo)", () => {
    render(<Contacto />);
    const textarea = screen.getByPlaceholderText(/Escribe aquí\.\.\./i);
    fireEvent.change(textarea, { target: { value: "Hola" } });
    expect(screen.getByText(/496 caracteres restantes/i)).toBeInTheDocument();
  });

  test("4. Envío exitoso con todos los campos válidos", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    render(<Contacto />);
    
    fireEvent.change(screen.getByPlaceholderText(/Ej: María Pérez/i), { target: { value: "Catherine Test" } });
    fireEvent.change(screen.getByPlaceholderText(/maria@correo.com/i), { target: { value: "cat@test.com" } });
    fireEvent.change(screen.getByPlaceholderText(/12345678/i), { target: { value: "98765432" } });
    
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "consulta" } });

    const textarea = screen.getByPlaceholderText(/Escribe aquí\.\.\./i);
    fireEvent.change(textarea, { target: { value: "Hola, este es un mensaje de prueba con más de veinte caracteres para que pase la validación." } });

    fireEvent.click(screen.getByRole("button", { name: /Enviar mensaje/i }));

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
        icon: 'success',
        title: '¡Mensaje enviado!'
      }));
    });
  });
});