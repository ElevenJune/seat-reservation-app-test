import {
  createContext,
  useState,
  use,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import apiClient from "../api/axios";
import type { GetUserCartResponse } from "@server/constants/types";
import { appRoutes } from "../utils/utils";

export type CartContextType = {
  count: number;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextType | null>(null);

export const useCart = () => {
  const ctx = use(CartContext);

  if (!ctx) {
    throw new Error("useCart has to be used within <CartProvider>");
  }

  return ctx;
};
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState<number>(0);

  const refresh = useCallback(async () => {
    const response = await apiClient.get<GetUserCartResponse>(
      appRoutes.getCart(),
    );
    setCount(response.data.lockedSeats.length);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);
  const value = useMemo(() => ({ count, refresh }), [count, refresh]);

  return <CartContext value={value}>{children}</CartContext>;
}
