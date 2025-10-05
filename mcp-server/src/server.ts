import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import dotenv from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

dotenv.config();

const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
const server = new McpServer({ name: "alarm-server", version: "1.0.0" });
const app = express();

app.use(cors({ origin: "http://localhost:3000", methods: ["GET", "POST"] }));
app.use(express.json());

// --- Register Alarm Tools ---
server.tool(
  "listAlarms",
  "List all active alarms",
  {},
  async () => {
    const alarms = await convex.query(api.alarm.listActiveAlarms);
    return {
      content: [{ type: "text", text: JSON.stringify(alarms, null, 2) }],
    } as const;
  }
);

server.tool(
  "createAlarm",
  "Create a new alarm",
  {
    time: z.string().describe("Time in HH:MM format"),
    label: z.string().describe("Alarm label/description"),
  },
  async ({ time, label }: { time: string; label: string }) => {
    const result = await convex.mutation(api.alarm.createAlarm, { time, label });
    return {
      content: [{ type: "text", text: `Alarm created with ID: ${result.id}` }],
    } as const;
  }
);

server.tool(
  "deleteAlarm",
  "Delete an alarm",
  {
    id: z.string().describe("Alarm ID"),
  },
  async ({ id }: { id: string }) => {
    await convex.mutation(api.alarm.deleteAlarm, { id } as any);
    return {
      content: [{ type: "text", text: `Alarm ${id} deleted.` }],
    } as const;
  }
);

server.tool(
  "editAlarm",
  "Edit alarm",
  {
    id: z.string().describe("Alarm ID"),
    time: z.string().optional().describe("New time"),
    label: z.string().optional().describe("New label"),
  },
  async ({ id, time, label }: { id: string; time?: string; label?: string }) => {
    await convex.mutation(api.alarm.editAlarm, { id, time, label } as any);
    return {
      content: [{ type: "text", text: `Alarm ${id} updated.` }],
    } as const;
  }
);

// SSE endpoint - GET for establishing connection
app.get("/sse", async (req, res) => {
  console.log("SSE connection established");
  const transport = new SSEServerTransport("/message", res);
  await server.connect(transport);
});

// POST endpoint for receiving messages
app.post("/message", async (req, res) => {
  console.log("Received message:", req.body);
  // The SSEServerTransport handles this automatically
  // This endpoint might not be needed depending on your MCP SDK version
  res.status(200).send();
});

app.listen(4000, () => {
  console.log("MCP Alarm Server running on http://localhost:4000");
  console.log("SSE endpoint: http://localhost:4000/sse");
});