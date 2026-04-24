import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

interface AuthenticatedWS extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws: AuthenticatedWS) => {
  ws.isAlive = true;

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.type === "auth" && data.userId) {
        ws.userId = data.userId;
        ws.send(JSON.stringify({ type: "connected" }));
      }
    } catch {
      // ignore malformed messages
    }
  });

  ws.on("error", () => {
    ws.terminate();
  });
});

// Heartbeat to detect dead connections
const heartbeat = setInterval(() => {
  wss.clients.forEach((client) => {
    const ws = client as AuthenticatedWS;
    if (!ws.isAlive) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on("close", () => clearInterval(heartbeat));

/**
 * Attach our WebSocket server to the HTTP server.
 * Only intercepts upgrades on /ws/messages — everything else
 * (e.g. Vite HMR on /) is left alone so Vite can handle it.
 */
export function setupWebSocketServer(server: Server): void {
  server.on("upgrade", (request, socket, head) => {
    const { pathname } = new URL(request.url ?? "/", `http://${request.headers.host}`);
    if (pathname === "/ws/messages") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
    // All other paths: leave the upgrade event for other handlers (e.g. Vite HMR)
  });
}

export function broadcastMessage(userIds: string[], payload: object): void {
  const data = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    const ws = client as AuthenticatedWS;
    if (
      ws.readyState === WebSocket.OPEN &&
      ws.userId &&
      userIds.includes(ws.userId)
    ) {
      try {
        ws.send(data);
      } catch {
        // client disconnected mid-send
      }
    }
  });
}
