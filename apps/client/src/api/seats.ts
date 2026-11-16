import {
  QueryClient,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { LockSeatResponse } from "@server/constants/types";
import { appRoutes } from "../utils/utils";
import { SEATS_STATE } from "./cart";
import apiClient from "./axios";

function lockSeat({
  seatId,
  action,
}: {
  seatId: string;
  action: "lock" | "unlock" | "free";
}) {
  return apiClient.post<LockSeatResponse>(appRoutes.lockSeat(seatId, action));
}

function invalidateSeatState(queryClient: QueryClient) {
  const promises = SEATS_STATE.map((key) =>
    queryClient.invalidateQueries({ queryKey: key }),
  );
  return Promise.all(promises);
}

export function useLockSeat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: lockSeat,
    onSuccess: () => invalidateSeatState(queryClient),
  });
}

export function useBookSeat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<LockSeatResponse>(appRoutes.bookSeats()),
    onSuccess: () => invalidateSeatState(queryClient),
  });
}
