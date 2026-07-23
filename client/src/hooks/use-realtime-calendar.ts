import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";

export function useRealtimeCalendar(): void {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || window.location.origin);
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-blocks"] });
      queryClient.invalidateQueries({
        predicate: (query) => JSON.stringify(query.queryKey).includes("appointments"),
      });
    };
    socket.on("calendar:changed", refresh);
    return () => {
      socket.disconnect();
    };
  }, [queryClient]);
}
