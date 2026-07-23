import type { Server as HttpServer } from "node:http";
import { Server as SocketServer } from "socket.io";
import { env } from "../config/env.js";

let io: SocketServer | undefined;

export function initializeRealtime(server: HttpServer): SocketServer {
  io = new SocketServer(server, { cors: { origin: env.clientOrigin } });
  return io;
}

export function emitCalendarChanged(): void {
  io?.emit("calendar:changed");
}
