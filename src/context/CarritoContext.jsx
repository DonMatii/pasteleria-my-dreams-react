import { createContext, useContext, useState, useCallback } from "react";

// Contexto compartido del carrito entre Delicias y Pedido.
// items = [{ id, nombre, precio, cantidad }]
const CarritoContext = createContext(null);

export function CarritoProvider({ children }) {
  const [items, setItems] = useState([]);

  const agregarAlCarrito = useCallback((producto, cantidad = 1) => {
    const existente = items.find((it) => String(it.id) === String(producto.id));
    if (existente) {
      setItems((prev) =>
        prev.map((it) =>
          String(it.id) === String(producto.id)
            ? { ...it, cantidad: it.cantidad + cantidad }
            : it
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: producto.id,
          nombre: producto.nombre,
          precio: Number(producto.precio || 0),
          cantidad: Number(cantidad) || 1,
        },
      ]);
    }
  }, [items]);

  const quitarItem = useCallback((id) => {
    setItems((prev) => prev.filter((it) => String(it.id) !== String(id)));
  }, []);

  const cambiarCantidad = useCallback((id, nueva) => {
    const cantidad = Number(String(nueva).replace(/\D/g, ""));
    if (!cantidad || cantidad < 1) return;
    setItems((prev) =>
      prev.map((it) => (String(it.id) === String(id) ? { ...it, cantidad } : it))
    );
  }, []);

  const limpiarCarrito = useCallback(() => {
    setItems([]);
  }, []);

  const total = items.reduce(
    (suma, it) => suma + Number(it.precio) * Number(it.cantidad),
    0
  );

  const cantidadTotal = items.reduce((suma, it) => suma + Number(it.cantidad), 0);

  const valor = {
    items,
    agregarAlCarrito,
    quitarItem,
    cambiarCantidad,
    limpiarCarrito,
    total,
    cantidadTotal,
  };

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}

export function useCarrito() {
  const ctx = useContext(CarritoContext);
  if (!ctx) {
    throw new Error("useCarrito debe usarse dentro de un CarritoProvider");
  }
  return ctx;
}

export default CarritoContext;
