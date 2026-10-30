import { describe, test, expect, vi, beforeEach } from "vitest";
import Swal from "sweetalert2";
import {
  confirmarQuitarProducto,
  confirmarVaciarCarrito,
} from "../src/utils/confirmacionesCarrito";

// Mock de SweetAlert2 para capturar la configuración de cada alert
vi.mock("sweetalert2", () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

const ROSA_INSTITUCIONAL = "#d95386";

describe("Confirmaciones del carrito", () => {
  beforeEach(() => {
    Swal.fire.mockClear();
    Swal.fire.mockResolvedValue({ isConfirmed: true });
  });

  test("Quitar producto: signo de pregunta en color institucional, sin iconHtml (ese era el círculo negro)", async () => {
    await confirmarQuitarProducto("Brownie Chocolate Nuez", vi.fn());

    expect(Swal.fire).toHaveBeenCalledTimes(1);
    const configuracion = Swal.fire.mock.calls[0][0];

    expect(configuracion).toMatchObject({
      icon: "question",
      iconColor: ROSA_INSTITUCIONAL,
      title: "¿Quitar del carrito?",
      text: "¿Seguro que quieres eliminar Brownie Chocolate Nuez?",
      confirmButtonText: "Sí, quitar",
      cancelButtonText: "Cancelar",
    });
    // Sin icon: el contenedor hereda --swal2-color (#545454) y el borde sale negro
    expect(configuracion.iconHtml).toBeUndefined();
  });

  test("Vaciar carrito: mismo color institucional para que los dos alerts se vean consistentes", async () => {
    await confirmarVaciarCarrito({ onConfirm: vi.fn() });

    const configuracion = Swal.fire.mock.calls[0][0];

    expect(configuracion).toMatchObject({
      icon: "warning",
      iconColor: ROSA_INSTITUCIONAL,
      title: "Vaciar carrito",
      confirmButtonText: "Sí, vaciar",
      cancelButtonText: "Cancelar",
    });
  });

  test("Vaciar carrito respeta el texto propio de la vista de pedido", async () => {
    await confirmarVaciarCarrito({
      onConfirm: vi.fn(),
      texto: "¿Seguro que quieres eliminar todos los productos de tu pedido?",
    });

    const configuracion = Swal.fire.mock.calls[0][0];
    expect(configuracion.text).toBe(
      "¿Seguro que quieres eliminar todos los productos de tu pedido?"
    );
  });

  test("Quitar producto solo borra al confirmar", async () => {
    const onConfirm = vi.fn();

    await confirmarQuitarProducto("Selva Negra", onConfirm);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test("Quitar producto cancelado no borra nada", async () => {
    Swal.fire.mockResolvedValue({ isConfirmed: false });
    const onConfirm = vi.fn();

    await confirmarQuitarProducto("Selva Negra", onConfirm);

    expect(onConfirm).not.toHaveBeenCalled();
  });

  test("Vaciar cancelado no borra ni muestra el aviso de carrito vacío", async () => {
    Swal.fire.mockResolvedValue({ isConfirmed: false });
    const onConfirm = vi.fn();

    await confirmarVaciarCarrito({ onConfirm });

    expect(onConfirm).not.toHaveBeenCalled();
    expect(Swal.fire).toHaveBeenCalledTimes(1);
  });

  test("Vaciar confirmado borra y avisa que el carrito quedó vacío", async () => {
    const onConfirm = vi.fn();

    await confirmarVaciarCarrito({ onConfirm });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(Swal.fire).toHaveBeenLastCalledWith(
      "Carrito vacío",
      "Se eliminaron todos los productos.",
      "info"
    );
  });
});
