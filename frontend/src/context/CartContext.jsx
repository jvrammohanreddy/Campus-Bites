import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [restaurantId, setRestaurantId] = useState(null);

  const addToCart = useCallback((menuItem) => {
    const addedItem = { ...menuItem, quantity: 1 };
    const replacingRestaurant = restaurantId && restaurantId !== menuItem.restaurantId;

    if (replacingRestaurant) {
      setItems([addedItem]);
      setRestaurantId(menuItem.restaurantId);
      return true;
    }

    setItems((currentItems) => {
      const existing = currentItems.find((item) => item.id === menuItem.id);

      if (existing) {
        return currentItems.map((item) =>
          item.id === menuItem.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...currentItems, addedItem];
    });
    setRestaurantId(menuItem.restaurantId);
    return false;
  }, [restaurantId]);

  const updateQuantity = useCallback((id, change) => {
    setItems((currentItems) =>
      currentItems
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + change) } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setRestaurantId(null);
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = items.length ? 35 : 0;
  const total = subtotal + deliveryFee;

  const value = useMemo(
    () => ({
      items,
      restaurantId,
      addToCart,
      updateQuantity,
      clearCart,
      subtotal,
      deliveryFee,
      total,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    [items, restaurantId, subtotal, deliveryFee, total, addToCart, updateQuantity, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}
