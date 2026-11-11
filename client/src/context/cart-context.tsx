import { createContext, useState } from "react";
import apiClient from "../api/axios";
import type { GetUserCartResponse } from "@server/schemas/events.schema";
import { appRoutes } from "../utils/utils";
import type { CartContextType } from "../types/cart";

export const CartContext = createContext<CartContextType | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [count, setCount] = useState<number>(0);

  function getUserCart() {
    return apiClient
      .get<GetUserCartResponse>(appRoutes.getCart())
      .then((response) => {
        setCount(response.data.lockedSeats.length);
      });
  }
  const refresh = () => {
    return getUserCart();
  };

  return (
    <CartContext.Provider value={{ count, refresh }}>
      {children}
    </CartContext.Provider>
  );
};
