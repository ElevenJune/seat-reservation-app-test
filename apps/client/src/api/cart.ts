import { useQuery } from "@tanstack/react-query";
import type { GetUserCartResponse } from "@server/constants/types";
import { appRoutes } from "../utils/utils";
import apiClient from "./axios";

export const CART_KEY = ['cart'] as const
export const BOOKED_SEATS_KEY = ['booked-seats'] as const
export const SEATS_STATE = [CART_KEY, BOOKED_SEATS_KEY] as const;

export function useCartContent() {
return useQuery({
    queryKey: CART_KEY,
    queryFn: async () => {
      const response = await apiClient.get<GetUserCartResponse>(
      appRoutes.getCart(),
    );
      return response.data
    },
  })
} 

export function useBookedSeats() {
return useQuery({
    queryKey: BOOKED_SEATS_KEY,
    queryFn: async () => {
      const response = await apiClient.get<GetUserCartResponse>(
      appRoutes.getBookedSeats(),
    );
      return response.data
    },
  })
} 