"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatApiResponse, ChatMessage, DashboardState } from "@/types/refund";

const initialMessages: ChatMessage[] = [
  {
    id: "seed-user-1",
    role: "user",
    content:
      "Hi, I'd like to request a refund for my recent order. The wireless headphones I received are defective - the left earbud stopped working after just 2 days.",
    timestamp: "2024-12-15T10:14:00.000Z",
  },
  {
    id: "seed-assistant-1",
    role: "assistant",
    content:
      "Hello Marcus! I'm sorry to hear about the issue with your headphones. I've located your order ORD-928471 and I'm reviewing the details now.\n\nI can see the order was placed on November 28, 2024 - that's 17 days ago, which falls within our 30-day return window. I'm checking your eligibility now.",
    timestamp: "2024-12-15T10:14:12.000Z",
  },
  {
    id: "seed-user-2",
    role: "user",
    content:
      "Great. I haven't used them much - literally just unboxed and tested. They're still in the original packaging. What do I need to do next?",
    timestamp: "2024-12-15T10:16:00.000Z",
  },
  {
    id: "seed-assistant-2",
    role: "assistant",
    content:
      "Based on my analysis, your refund request looks eligible.\n\nHere's a quick summary of what I've verified:\n- Purchase is within the 30-day refund window\n- Product is a hardware item (eligible category)\n- No previous refunds on this order\n- You're a Gold tier customer\n\nI'm recommending full approval for a refund of $249.99. A human agent will confirm momentarily.",
    timestamp: "2024-12-15T10:16:15.000Z",
  },
];

export function useChat(initialDashboard: DashboardState) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  async function sendMessage(content: string) {
    const trimmed = content.trim();

    if (!trimmed || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((current) => [...current, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          activeCustomerEmail: dashboard.customer.email,
          activeOrderId: dashboard.order.id,
        }),
      });

      const data = (await response.json()) as Partial<ChatApiResponse> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "RefundAI could not process that request.");
      }

      if (!data.message || !data.dashboard) {
        throw new Error("RefundAI returned an incomplete response.");
      }

      const assistantMessage = data.message;

      setDashboard(data.dashboard);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: assistantMessage,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong. Please try again.";

      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "I couldn't complete the refund check just now. Please check the API key or try again in a moment.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return {
    messages,
    dashboard,
    isLoading,
    error,
    scrollRef,
    sendMessage,
  };
}
