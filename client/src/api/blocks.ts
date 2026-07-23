import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface CalendarBlock {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface CalendarBlockInput {
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

export const blocksQueryKey = ["calendar-blocks"] as const;

export function useCalendarBlocks(params: { startDate?: string; endDate?: string; date?: string } = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
  return useQuery({
    queryKey: [...blocksQueryKey, params],
    queryFn: () => customFetch<CalendarBlock[]>(`/api/blocks?${query}`),
  });
}

export function useCreateBlock() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: CalendarBlockInput) =>
      customFetch<CalendarBlock>("/api/blocks", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => client.invalidateQueries({ queryKey: blocksQueryKey }),
  });
}

export function useDeleteBlock() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => customFetch(`/api/blocks/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: blocksQueryKey }),
  });
}
