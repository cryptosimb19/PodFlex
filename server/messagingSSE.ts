import type { Response } from "express";

interface SSEClient {
  res: Response;
  heartbeat: NodeJS.Timeout;
}

const connections = new Map<string, Set<SSEClient>>();

export function addSSEClient(userId: string, res: Response): () => void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 25000);

  const client: SSEClient = { res, heartbeat };

  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(client);

  res.write("data: {\"type\":\"connected\"}\n\n");

  return () => {
    clearInterval(heartbeat);
    connections.get(userId)?.delete(client);
    if (connections.get(userId)?.size === 0) {
      connections.delete(userId);
    }
  };
}

export function notifyUsers(userIds: string[], payload: object): void {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  userIds.forEach(userId => {
    connections.get(userId)?.forEach(client => {
      try {
        client.res.write(data);
      } catch {
        // Client disconnected
      }
    });
  });
}
