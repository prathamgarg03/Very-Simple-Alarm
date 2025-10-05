"use client";

import { useEffect, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

// 👇 Uses AI SDK style interaction (optional UI libraries can enhance this)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export default function MCPClientPage() {
  const [connected, setConnected] = useState(false);
  const [tools, setTools] = useState<any[]>([]);
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    async function connect() {
      try {
        const client = new Client({ name: "next-mcp-client", version: "1.0.0" });
        const transport = new SSEClientTransport(new URL("http://localhost:4000/sse"));
        await client.connect(transport);

        const availableTools = (await client.listTools()).tools;
        setTools(availableTools);
        setConnected(true);

        // Save client for later calls
        (window as any).mcpClient = client;
      } catch (err) {
        console.error("Error connecting to MCP server:", err);
      }
    }
    connect();
  }, []);

  async function handleSend() {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, `You: ${input}`]);

    // 1. Ask Gemini what to do
    const result = await model.generateContent(input);
    const text = result.response.text();
    setMessages((prev) => [...prev, `Gemini: ${text}`]);

    // 2. If Gemini suggests tool use, you could parse here
    // Example: call MCP addTwoNumbers directly
    if (input.startsWith("add ")) {
      const [_, a, b] = input.split(" ");
      try {
        const client = (window as any).mcpClient;
        const toolResult = await client.callTool("addTwoNumbers", {
          a: Number(a),
          b: Number(b),
        });
        setMessages((prev) => [
          ...prev,
          `MCP Tool Response: ${toolResult.content[0].text}`,
        ]);
      } catch (err) {
        setMessages((prev) => [...prev, `MCP Error: ${String(err)}`]);
      }
    }

    setInput("");
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">MCP Client + Gemini</h1>
      <p className="mb-4">
        Status: {connected ? "✅ Connected to MCP" : "❌ Not connected"}
      </p>
      {tools.length > 0 && (
        <p className="mb-4">Available Tools: {tools.map((t) => t.name).join(", ")}</p>
      )}
      <div className="border p-4 h-80 overflow-y-auto rounded mb-4 bg-gray-100">
        {messages.map((m, i) => (
          <div key={i} className="mb-2">
            {m}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="border flex-1 p-2 rounded"
          placeholder="Ask Gemini or call MCP tool (e.g., add 3 4)..."
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white px-4 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
