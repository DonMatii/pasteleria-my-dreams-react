/* eslint-disable no-undef */
import React, { useEffect } from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi, describe, test, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Pedido from "../src/pages/Pedido";
import {
  CarritoProvider,
  useCarrito,
} from "../src/context/CarritoContext";
import {
  obtenerProductos,
  obtenerDeliciaDelDia,
} from "../src/service/ProductosService";
import Swal from "sweetalert2";

// Mockeamos los fetch del catálogo; aplanarCatalogo queda REAL para probar
// el mismo aplanado que usa /delicias (la ventanita lo reutiliza)
vi.mock("../src/service/ProductosService", async (importOriginal) => ({
  ...await importOriginal(),
  obtenerProductos: vi.fn(),
  obtenerDeliciaDelDia: vi.fn(),
}));

// Mock de SweetAlert2 para que no explote en el test
vi.mock("sweetalert2", () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true }),
  },
}));

// Productos del catálogo real (llegan al carrito desde Delicias/Home)
const selvaNegra = { id: 1, nombre: "Selva Negra", precio: 15000, imagenUrl: "selva.jpg" };
const manjarLucuma = { id: 2, nombre: "Manjar Lúcuma", precio: 12000, imagenUrl: "manjar.jpg" };

// Respuesta cruda de GET /api/productos (mapa agrupado por categoría), como la real
const catalogoCrudo = {
  tortas: [
    { id: 9, nombre: "Torta Moka", precio: 15000, imagenUrl: "moka.jpg", categoria: "tortas" },
  ],
  personales: [
    { id: 13, nombre: "Muffins Plátano Arándano", precio: 2500, imagenUrl: "muffin.jpg", categoria: "personales" },
  ],
};

// Siembra el carrito compartido en el mismo provider (flujo real de compra:
// el cliente elige en el catálogo y /pedido es el checkout)
const Sembrador = ({ items }) => {
  const { agregarAlCarrito } = useCarrito();
  useEffect(() => {
    items.forEach((it) => agregarAlCarrito(it, it.cantidad));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

const renderPedido = (items = []) =>
  render(
    <MemoryRouter>
      <CarritoProvider>
        <Sembrador items={items} />
        <Pedido />
      </CarritoProvider>
    </MemoryRouter>
  );

const URL_PEDIDOS = `${import.meta.env.VITE_API_BASE_URL}/api/pedidos`;

const llenarFormularioValido = (items = [{ ...selvaNegra, cantidad: 2 }]) => {
  renderPedido(items);
  fireEvent.change(screen.getByLabelText(/Nombre del Cliente/i), {
    target: { value: "Catherine Test" },
  });
  fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), {
    target: { value: "cat@test.com" },
  });
};

describe("Checkout de Pedido - My Dreams (RF-07)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Por defecto el backend no informa delicia del día: ningún descuento extra
    obtenerDeliciaDelDia.mockRejectedValue(new Error("sin delicia del día"));
    // La ventanita del catálogo responde con el mapa por categoría
    obtenerProductos.mockResolvedValue(catalogoCrudo);
    // Estado limpio: sin flag de primera conexion ni codigo de bienvenida
    localStorage.clear();
  });

  test("1. Con el carrito vacío muestra el estado vacío y el acceso al catálogo", () => {
    renderPedido();

    expect(screen.getByText(/¡Haz tu pedido!/i)).toBeInTheDocument();
    expect(screen.getByTestId("pedido-vacio")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ver nuestras delicias/i })
    ).toHaveAttribute("href", "/delicias");
    // Sin items no se muestra el resumen de precios
    expect(screen.queryByTestId("total-pedido")).not.toBeInTheDocument();
  });

  test("1b. La fila del pedido muestra foto, precio unitario (c/u) y subtotal", () => {
    renderPedido([{ ...selvaNegra, cantidad: 2 }]);

    const fila = screen.getByText("Selva Negra").closest("li");
    expect(within(fila).getByText(/c\/u \$15\.000/)).toBeInTheDocument();
    expect(within(fila).getByText("$30.000")).toBeInTheDocument();
    expect(within(fila).getByAltText("Selva Negra")).toBeInTheDocument();
  });

  test("1c. El resumen jerarquiza subtotal, descuentos y TOTAL final prominente", () => {
    renderPedido([{ ...selvaNegra, cantidad: 2 }]);

    expect(screen.getByTestId("total-pedido")).toHaveTextContent("$30.000");
    expect(screen.getByTestId("total-final")).toHaveTextContent("$30.000");
    // El botón abre la ventanita del catálogo, no navega fuera del checkout
    expect(
      screen.getByRole("button", { name: /Seguir agregando delicias/i })
    ).toBeInTheDocument();
  });

  test("2. La validación bloquea el envío y muestra los errores", async () => {
    global.fetch = vi.fn();

    renderPedido();

    fireEvent.click(screen.getByRole("button", { name: /Registrar pedido/i }));

    expect(await screen.findByText(/Por favor, ingresa tu nombre/i)).toBeInTheDocument();
    expect(screen.getByText(/Ingresa un correo electrónico válido/i)).toBeInTheDocument();
    expect(screen.getByText(/Agrega al menos un producto a tu pedido/i)).toBeInTheDocument();

    // Nada se envía si la validación falla
    expect(global.fetch).not.toHaveBeenCalled();
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({ icon: "warning", title: "Formulario incompleto" })
    );
  });

  test("3. Envío exitoso: POST con el body exacto del contrato y Swal de éxito", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({
        id: 7,
        cliente: "Catherine Test",
        email: "cat@test.com",
        total: 30000,
        productos: [],
        eventoPublicado: true,
        codigoConsulta: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
      }),
    });

    llenarFormularioValido();

    // Total en vivo: precioUnitario (15000) × cantidad (2)
    expect(screen.getByTestId("total-pedido")).toHaveTextContent("30.000");

    fireEvent.click(screen.getByRole("button", { name: /Registrar pedido/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        URL_PEDIDOS,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cliente: "Catherine Test",
            email: "cat@test.com",
            productos: [
              { nombre: "Selva Negra", cantidad: 2, precioUnitario: 15000 },
            ],
          }),
        })
      );
    });

    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: "success",
        title: "¡Pedido registrado!",
        // El modal muestra el codigo opaco de seguimiento (proteccion IDOR)
        text: expect.stringContaining("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"),
      })
    );

    // El formulario se resetea después del éxito: carrito vacío de nuevo
    expect(screen.getByLabelText(/Nombre del Cliente/i)).toHaveValue("");
    expect(screen.getByLabelText(/Correo Electrónico/i)).toHaveValue("");
    expect(screen.queryByTestId("carrito-pedido")).not.toBeInTheDocument();
    expect(screen.getByTestId("pedido-vacio")).toBeInTheDocument();
  });

  test("3b. Acepta varios productos en un mismo pedido (carrito)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({
        id: 9,
        total: 42000,
        productos: [],
        eventoPublicado: true,
        codigoConsulta: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      }),
    });

    llenarFormularioValido([
      { ...selvaNegra, cantidad: 2 },
      { ...manjarLucuma, cantidad: 1 },
    ]);

    // El total suma los dos items (30000 + 12000)
    expect(screen.getByTestId("total-pedido")).toHaveTextContent("42.000");

    fireEvent.click(screen.getByRole("button", { name: /Registrar pedido/i }));

    // El body lleva la lista COMPLETA que el backend espera
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      const cuerpo = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(cuerpo.productos).toEqual([
        { nombre: "Selva Negra", cantidad: 2, precioUnitario: 15000 },
        { nombre: "Manjar Lúcuma", cantidad: 1, precioUnitario: 12000 },
      ]);
    });
  });

  test("4. Un 400 del backend muestra el mensaje que devuelve la API", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi
        .fn()
        .mockResolvedValue({ mensaje: "La cantidad de cada producto debe ser al menos 1" }),
    });

    llenarFormularioValido();

    fireEvent.click(screen.getByRole("button", { name: /Registrar pedido/i }));

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        "Error",
        "La cantidad de cada producto debe ser al menos 1",
        "error"
      );
    });
  });

  test("5. Un fallo de red muestra el Swal de error de conexión", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("sin red"));

    llenarFormularioValido();

    fireEvent.click(screen.getByRole("button", { name: /Registrar pedido/i }));

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith("Error", "Error de conexión.", "error");
    });

    // El botón vuelve a habilitarse
    expect(screen.getByRole("button", { name: /Registrar pedido/i })).toBeEnabled();
  });

  test("6. El campo de código arranca vacío, el cliente lo escribe y se consume tras el éxito", async () => {
    // Ganado en la primera conexión (BienvenidaService): la marca local solo
    // habilita el ahorro en vivo, el código nunca se escribe solo en el campo
    localStorage.setItem("md_codigo_bienvenida", "BIENVENIDO10");

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({
        id: 8,
        total: 27000,
        descuento: 3000,
        descuentoBienvenida: 3000,
        descuentoDelicia: 0,
        codigoDescuento: "BIENVENIDO10",
        productos: [],
        eventoPublicado: true,
        codigoConsulta: "ffffffffffffffffffffffffffffffff",
      }),
    });

    llenarFormularioValido();

    // Feedback de demo: el código no aparece solo; nadie recibe un descuento
    // que no pidió y un cliente que ya lo usó no arranca con un error puesto
    expect(screen.getByLabelText(/Código de descuento/i)).toHaveValue("");
    expect(screen.queryByTestId("descuento-bienvenida")).not.toBeInTheDocument();

    // El cliente lo escribe a mano y recién ahí se ve el ahorro (30000 - 10%)
    fireEvent.change(screen.getByLabelText(/Código de descuento/i), {
      target: { value: "BIENVENIDO10" },
    });
    expect(screen.getByTestId("descuento-bienvenida")).toHaveTextContent("-$3.000");
    expect(screen.getByTestId("total-final")).toHaveTextContent("$27.000");

    fireEvent.click(screen.getByRole("button", { name: /Registrar pedido/i }));

    // El cuerpo del POST incluye el código para que el backend lo persista
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      const cuerpo = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(cuerpo.codigoDescuento).toBe("BIENVENIDO10");
    });

    // Se consume el código: la próxima compra ya no tendrá descuento
    expect(localStorage.getItem("md_codigo_bienvenida")).toBeNull();

    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: "success",
        text: expect.stringContaining(
          "descuento de bienvenida (BIENVENIDO10): -$3.000"
        ),
      })
    );
    // El mensaje no expone el número interno del pedido: para eso está el código
    expect(Swal.fire.mock.calls.at(-1)[0].text).not.toContain("N°");
  });

  test("9. Sin código de bienvenida el mensaje nombra la Delicia del Día y oculta el número interno", async () => {
    // Este correo ya canjeó BIENVENIDO10 en una compra anterior: el backend
    // solo aplica el descuento de la delicia y el mensaje debe decir eso
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({
        id: 15,
        total: 155250,
        descuento: 19250,
        descuentoBienvenida: 0,
        descuentoDelicia: 19250,
        codigoDescuento: null,
        productos: [],
        eventoPublicado: true,
        codigoConsulta: "abcdef0123456789abcdef0123456789",
      }),
    });

    llenarFormularioValido();

    fireEvent.click(screen.getByRole("button", { name: /Registrar pedido/i }));

    await waitFor(() => expect(Swal.fire).toHaveBeenCalled());
    const texto = Swal.fire.mock.calls.at(-1)[0].text;
    expect(texto).toContain("Descuento Delicia del Día (-10%): -$19.250");
    expect(texto).not.toContain("bienvenida");
    expect(texto).not.toContain("N°");
    expect(texto).toContain("abcdef0123456789abcdef0123456789");
  });

  test("7. Un código desconocido bloquea el envío sin llamar al backend", async () => {
    global.fetch = vi.fn();

    llenarFormularioValido();

    fireEvent.change(screen.getByLabelText(/Código de descuento/i), {
      target: { value: "AHORRO50" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Registrar pedido/i }));

    expect(await screen.findByText(/Código de descuento inválido/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("8. El código escrito a mano viaja al backend: el uso único lo decide la base de datos", async () => {
    // Navegador nuevo (sin la marca local): el cliente también puede usar su
    // código legítimo; quien rechaza el doble canje por email es el backend
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({
        id: 12,
        total: 27000,
        descuento: 3000,
        descuentoBienvenida: 3000,
        descuentoDelicia: 0,
        codigoDescuento: "BIENVENIDO10",
        productos: [],
        eventoPublicado: true,
        codigoConsulta: "99999999999999999999999999999999",
      }),
    });

    llenarFormularioValido();

    fireEvent.change(screen.getByLabelText(/Código de descuento/i), {
      target: { value: "BIENVENIDO10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Registrar pedido/i }));

    // El código llega al backend aunque el navegador no tenga la marca local
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      const cuerpo = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(cuerpo.codigoDescuento).toBe("BIENVENIDO10");
    });

    // La confirmación menciona el descuento que aplicó la base de datos
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: "success",
        text: expect.stringContaining("descuento de bienvenida"),
      })
    );
  });

  test("8b. El backend rechaza el BIENVENIDO10 ya canjeado para ese email", async () => {
    // Mismo email en otro navegador: la base de datos lo rechaza con su mensaje
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({
        mensaje: "El código de descuento ya fue canjeado para este email",
      }),
    });

    llenarFormularioValido();

    fireEvent.change(screen.getByLabelText(/Código de descuento/i), {
      target: { value: "BIENVENIDO10" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Registrar pedido/i }));

    await waitFor(() => {
      expect(Swal.fire).toHaveBeenCalledWith(
        "Error",
        "El código de descuento ya fue canjeado para este email",
        "error"
      );
    });
  });

  test("9. El carrito con la delicia del día muestra el -10% y el total resta ambos descuentos", async () => {
    // La delicia llega del backend; match por nombre (trim + ignore case),
    // igual que lo decide pedidos-service
    obtenerDeliciaDelDia.mockResolvedValue({ id: 1, nombre: "  SELVA NEGRA  " });
    // Código de bienvenida vigente: ambos descuentos se acumulan
    localStorage.setItem("md_codigo_bienvenida", "BIENVENIDO10");

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({
        id: 10,
        total: 24000,
        productos: [],
        eventoPublicado: true,
        codigoConsulta: "dddddddddddddddddddddddddddddddd",
      }),
    });

    llenarFormularioValido();

    // El cliente escribe su código a mano: así se acumulan los dos descuentos
    fireEvent.change(screen.getByLabelText(/Código de descuento/i), {
      target: { value: "BIENVENIDO10" },
    });

    // 30.000 en el carrito: bienvenida -3.000 y delicia -3.000 (estimado)
    expect(await screen.findByTestId("descuento-delicia")).toHaveTextContent("-$3.000");
    expect(screen.getByTestId("descuento-bienvenida")).toHaveTextContent("-$3.000");
    // total final = total − bienvenida − delicia
    expect(screen.getByTestId("total-final")).toHaveTextContent("$24.000");
  });

  test("10. Sin la delicia en el carrito no aparece su línea de descuento", async () => {
    // La delicia de hoy es otro producto, no el que está en el carrito
    obtenerDeliciaDelDia.mockResolvedValue({ id: 2, nombre: "Manjar Lúcuma" });
    localStorage.setItem("md_codigo_bienvenida", "BIENVENIDO10");

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({
        id: 11,
        total: 27000,
        productos: [],
        eventoPublicado: true,
        codigoConsulta: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      }),
    });

    llenarFormularioValido();

    // El cliente escribe su código a mano (el campo nunca viene prellenado)
    fireEvent.change(screen.getByLabelText(/Código de descuento/i), {
      target: { value: "BIENVENIDO10" },
    });

    // El descuento de bienvenida sigue intacto y el total solo lo resta a él
    expect(screen.getByTestId("descuento-bienvenida")).toHaveTextContent("-$3.000");
    expect(screen.queryByTestId("descuento-delicia")).not.toBeInTheDocument();
    expect(screen.getByTestId("total-final")).toHaveTextContent("$27.000");
  });

  test("11. Los botones − y + de la fila actualizan subtotal y total en vivo", () => {
    renderPedido([{ ...selvaNegra, cantidad: 2 }]);

    // De 2 a 3 con el botón +: sin input numérico con flechitas de 10px
    fireEvent.click(screen.getByRole("button", { name: /Sumar Selva Negra/i }));

    expect(screen.getByTestId("total-pedido")).toHaveTextContent("$45.000");
    expect(screen.getByTestId("total-final")).toHaveTextContent("$45.000");

    // En 1 el − no llega a 0: la fila no desaparece ni el total se rompe
    fireEvent.click(screen.getByRole("button", { name: /Restar Selva Negra/i }));
    fireEvent.click(screen.getByRole("button", { name: /Restar Selva Negra/i }));

    expect(screen.getByText("Selva Negra")).toBeInTheDocument();
    expect(screen.getByTestId("total-pedido")).toHaveTextContent("$15.000");
  });

  test("12. La ventanita 'Seguir agregando' abre el catálogo y agrega sin salir del checkout", async () => {
    renderPedido([{ ...selvaNegra, cantidad: 2 }]);

    fireEvent.click(screen.getByRole("button", { name: /Seguir agregando delicias/i }));

    // El catálogo carga desde el servicio y se aplana igual que en /delicias
    expect(await screen.findByTestId("modal-catalogo")).toBeInTheDocument();
    expect(await screen.findByText("Torta Moka")).toBeInTheDocument();
    expect(screen.getByText("Muffins Plátano Arándano")).toBeInTheDocument();

    // Agrego 2 muffins desde la ventanita: el total del checkout sube en vivo
    const tarjeta = screen
      .getByText("Muffins Plátano Arándano")
      .closest(".modal-tarjeta");
    fireEvent.click(
      within(tarjeta).getByRole("button", {
        name: /Sumar Muffins Plátano Arándano/i,
      })
    );
    fireEvent.click(within(tarjeta).getByRole("button", { name: "Agregar" }));

    // El mismo toast de carrito que en Home/Delicias confirma la alta
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        toast: true,
        position: "top",
        timer: 3000,
        title: expect.stringMatching(
          /<span class="toast-carrito-nombre">Muffins Plátano Arándano<\/span> agregado al carrito/i
        ),
        html: expect.stringContaining("/img/"),
      })
    );

    // 30.000 de la Selva Negra + 2 × 2.500 de muffins
    expect(screen.getByTestId("total-pedido")).toHaveTextContent("$35.000");
    // La ventanita queda abierta para seguir agregando
    expect(screen.getByTestId("modal-catalogo")).toBeInTheDocument();

    // Cerrar la ventanita vuelve al checkout
    fireEvent.click(screen.getByRole("button", { name: /Cerrar/i }));
    expect(screen.queryByTestId("modal-catalogo")).not.toBeInTheDocument();
  });

  test("12c. La ventanita marca la delicia del día con el badge '-10% hoy'", async () => {
    // Solo el backend confirma cuál es la delicia: solo esa tarjeta lleva badge
    obtenerDeliciaDelDia.mockResolvedValue({
      id: 13,
      nombre: "Muffins Plátano Arándano",
    });

    renderPedido([{ ...selvaNegra, cantidad: 1 }]);

    fireEvent.click(screen.getByRole("button", { name: /Seguir agregando delicias/i }));
    expect(await screen.findByTestId("modal-catalogo")).toBeInTheDocument();

    // Exactamente UNA tarjeta la marca, y es la de la delicia del día
    const badges = screen.getAllByTestId("badge-delicia-modal");
    expect(badges).toHaveLength(1);
    expect(badges[0].closest(".modal-tarjeta")).toHaveTextContent(
      "Muffins Plátano Arándano"
    );
  });

  test("12d. Sin delicia confirmada por el backend, ningún badge aparece", async () => {
    // beforeEach: obtenerDeliciaDelDia rechaza → no se promete ningún descuento
    renderPedido([{ ...selvaNegra, cantidad: 1 }]);

    fireEvent.click(screen.getByRole("button", { name: /Seguir agregando delicias/i }));
    expect(await screen.findByTestId("modal-catalogo")).toBeInTheDocument();

    expect(screen.queryByTestId("badge-delicia-modal")).not.toBeInTheDocument();
  });

  test("12e. La ventanita trae su propio boton de volver arriba al catálogo", async () => {
    renderPedido([{ ...selvaNegra, cantidad: 1 }]);

    fireEvent.click(screen.getByRole("button", { name: /Seguir agregando delicias/i }));
    expect(await screen.findByTestId("modal-catalogo")).toBeInTheDocument();

    // El boton flotante de la pagina hace window.scrollTo: al panel del modal no
    // le mueve nada. El que scrollea el catálogo es el panel, y el boton propio
    // vive DENTRO del overlay, no afuera en la pagina.
    const boton = screen.getByTestId("modal-volver-arriba");
    expect(boton.closest(".modal-overlay")).toBeInTheDocument();
    expect(boton).toHaveAttribute(
      "aria-label",
      "Volver arriba en el catálogo"
    );
  });

  test("12b. Si el catálogo no carga, la ventanita muestra el error en vez de quedarse muda", async () => {
    obtenerProductos.mockRejectedValue(new Error("sin red"));

    renderPedido([{ ...selvaNegra, cantidad: 2 }]);

    fireEvent.click(screen.getByRole("button", { name: /Seguir agregando delicias/i }));

    expect(
      await screen.findByText(/No se pudo cargar el catálogo/i)
    ).toBeInTheDocument();
  });
});
