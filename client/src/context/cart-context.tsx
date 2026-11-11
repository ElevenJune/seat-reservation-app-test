import { createContext, useState, use, useEffect } from "react";
import apiClient from "../api/axios";
import type { GetUserCartResponse } from "@server/schemas/events.schema";
import { appRoutes } from "../utils/utils";

export type CartContextType = {
  count: number;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextType | null>(null);

export const useCart = () => {
  const useCartContext = use(CartContext);

  if (!useCartContext) {
    throw new Error("useCart has to be used within <CartProvider>");
  }

  return useCartContext;
};
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState<number>(0);

  const refresh = () => {
    return apiClient
      .get<GetUserCartResponse>(appRoutes.getCart())
      .then((response) => {
        setCount(response.data.lockedSeats.length);
      });
  };

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <CartContext value={{ count, refresh }}>{children}</CartContext>;
}
