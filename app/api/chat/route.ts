import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { NextResponse } from "next/server";
import {
  getCustomerByEmail,
  getOrderById,
  getRefundHistoryByCustomerId,
  getRefundPolicy,
} from "@/lib/refunds/data";
import { buildDashboardState } from "@/lib/refunds/dashboard";
import { validateRefundPolicy } from "@/lib/refunds/policy";
import {
  agentFinalAnswerSchema,
  chatApiRequestSchema,
  createReasoningLogSchema,
  getCustomerSchema,
  getOrderSchema,
  getRefundHistorySchema,
  validateRefundPolicySchema,
} from "@/lib/refunds/schemas";
import type { ChatApiResponse, ReasoningLog } from "@/types/refund";

export const runtime = "nodejs";

const MODEL = "gpt-4.1-mini";

const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "getCustomer",
      description: "Look up a customer profile by email address.",
      parameters: {
        type: "object",
        properties: {
          email: {
            type: "string",
            description: "Customer email address.",
          },
        },
        required: ["email"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getOrder",
      description: "Retrieve an order by order id.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "E-commerce order id, for example ORD-928471.",
          },
        },
        required: ["orderId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getRefundHistory",
      description: "Get refund history records for a customer.",
      parameters: {
        type: "object",
        properties: {
          customerId: {
            type: "string",
            description: "Customer id, for example CUS-44821.",
          },
        },
        required: ["customerId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "validateRefundPolicy",
      description:
        "Validate the refund policy against the order. Prefer passing orderId after getOrder has been called.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "Order id to validate.",
          },
          order: {
            type: "object",
            description: "Full order object if already available.",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createReasoningLog",
      description:
        "Record a customer-visible reasoning step after completing a tool-backed step.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Short title such as Customer Found.",
          },
          description: {
            type: "string",
            description: "One sentence summary of what happened.",
          },
          status: {
            type: "string",
            enum: ["complete", "failed", "info"],
          },
        },
        required: ["title", "description"],
        additionalProperties: false,
      },
    },
  },
];

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 500 },
      );
    }

    const payload = chatApiRequestSchema.parse(await request.json());
    const openai = new OpenAI({ apiKey });
    const reasoningLogs: ReasoningLog[] = [];
    let activeCustomerEmail =
      payload.activeCustomerEmail ?? "marcus.reynolds@email.com";
    let activeOrderId = payload.activeOrderId ?? "ORD-928471";

    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: [
          "You are RefundAI, an e-commerce refund support agent.",
          "For refund decisions, call tools before answering: getCustomer, getOrder, getRefundHistory, then validateRefundPolicy.",
          "Use createReasoningLog only for important extra customer-visible steps that are not already covered by those tools.",
          "Base approval or denial only on tool results and the refund policy.",
          "Be concise, warm, and specific. Mention the refund amount for approvals.",
          "Final response must be JSON only, shaped as {\"customerMessage\":\"...\"}.",
          `Active context: customer email ${activeCustomerEmail}, order ${activeOrderId}.`,
          `Policy date for this mock CRM is ${getRefundPolicy().evaluationDate}.`,
        ].join(" "),
      },
      {
        role: "user",
        content: payload.message,
      },
    ];

    let finalContent = "";

    for (let step = 0; step < 8; step += 1) {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.2,
      });

      const assistantMessage = completion.choices[0]?.message;

      if (!assistantMessage) {
        throw new Error("OpenAI did not return a message.");
      }

      messages.push(assistantMessage as ChatCompletionMessageParam);

      if (!assistantMessage.tool_calls?.length) {
        finalContent = assistantMessage.content ?? "";
        break;
      }

      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type !== "function") {
          continue;
        }

        const result = executeToolCall(toolCall.function.name, toolCall.function.arguments, {
          reasoningLogs,
          get activeCustomerEmail() {
            return activeCustomerEmail;
          },
          set activeCustomerEmail(value: string) {
            activeCustomerEmail = value;
          },
          get activeOrderId() {
            return activeOrderId;
          },
          set activeOrderId(value: string) {
            activeOrderId = value;
          },
        });

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }

    if (!finalContent) {
      messages.push({
        role: "user",
        content:
          "Return the final answer now as JSON only: {\"customerMessage\":\"...\"}.",
      });

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages,
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      finalContent = completion.choices[0]?.message.content ?? "";
    }

    const answer = parseFinalAnswer(finalContent);
    const dashboard = buildDashboardState(
      activeCustomerEmail,
      activeOrderId,
      normalizeReasoningLogs(reasoningLogs, activeOrderId),
    );

    const response: ChatApiResponse = {
      message: answer.customerMessage,
      dashboard,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong while processing the refund request.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type ToolExecutionState = {
  reasoningLogs: ReasoningLog[];
  activeCustomerEmail: string;
  activeOrderId: string;
};

function executeToolCall(
  name: string,
  rawArguments: string,
  state: ToolExecutionState,
) {
  const raw = parseToolArguments(rawArguments);

  switch (name) {
    case "getCustomer": {
      const args = getCustomerSchema.parse(raw);
      const customer = getCustomerByEmail(args.email);

      if (!customer) {
        appendLog(state.reasoningLogs, {
          title: "Customer Not Found",
          description: `No customer matched ${args.email}`,
          status: "failed",
        });

        return { found: false };
      }

      state.activeCustomerEmail = customer.email;
      appendLog(state.reasoningLogs, {
        title: "Customer Found",
        description: `Matched ${customer.id} in database`,
        status: "complete",
      });

      return { found: true, customer };
    }

    case "getOrder": {
      const args = getOrderSchema.parse(raw);
      const order = getOrderById(args.orderId);

      if (!order) {
        appendLog(state.reasoningLogs, {
          title: "Order Not Found",
          description: `No order matched ${args.orderId}`,
          status: "failed",
        });

        return { found: false };
      }

      state.activeOrderId = order.id;
      state.activeCustomerEmail = order.customer.email;
      appendLog(state.reasoningLogs, {
        title: "Order Retrieved",
        description: `${order.id} - $${order.total.toFixed(2)} - ${order.status}`,
        status: "complete",
      });

      return { found: true, order };
    }

    case "getRefundHistory": {
      const args = getRefundHistorySchema.parse(raw);
      const history = getRefundHistoryByCustomerId(args.customerId);
      const activeOrderRefund = history.find(
        (record) =>
          record.orderId.toLowerCase() === state.activeOrderId.toLowerCase() &&
          record.status === "approved",
      );

      appendLog(state.reasoningLogs, {
        title: "Previous Refund Check",
        description: activeOrderRefund
          ? `Approved refund already exists for ${state.activeOrderId}`
          : "No prior refund on this order",
        status: activeOrderRefund ? "failed" : "complete",
      });

      return { history };
    }

    case "validateRefundPolicy": {
      const args = validateRefundPolicySchema.parse(raw);
      const orderId = args.orderId ?? args.order?.id ?? state.activeOrderId;
      const result = validateRefundPolicy(orderId);

      state.activeOrderId = result.order.id;
      state.activeCustomerEmail = result.order.customer.email;
      appendLog(state.reasoningLogs, {
        title: "Policy Loaded",
        description: `${result.order.product.category} return policy v${result.policy.version}`,
        status: "complete",
      });
      appendLog(state.reasoningLogs, {
        title: "Eligibility Checked",
        description: `${result.ruleResults.filter((rule) => rule.passed).length}/${result.ruleResults.length} policy checks passed`,
        status: result.approved ? "complete" : "failed",
      });
      appendLog(state.reasoningLogs, {
        title: result.approved ? "Refund Approved" : "Refund Denied",
        description: result.approved
          ? `Full refund approved - ${result.confidence}% confidence`
          : `${result.reasons[0]} - ${result.confidence}% confidence`,
        status: result.approved ? "complete" : "failed",
      });

      return result;
    }

    case "createReasoningLog": {
      const args = createReasoningLogSchema.parse(raw);
      const log = appendLog(state.reasoningLogs, args);

      return { log };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

function parseToolArguments(rawArguments: string) {
  if (!rawArguments) {
    return {};
  }

  return JSON.parse(rawArguments) as unknown;
}

function appendLog(
  logs: ReasoningLog[],
  input: Pick<ReasoningLog, "title" | "description" | "status">,
) {
  const existingIndex = logs.findIndex((log) => log.title === input.title);
  const nextLog: ReasoningLog = {
    id: `${input.title.toLowerCase().replaceAll(" ", "-")}-${Date.now()}`,
    timestamp: new Date(Date.now() + logs.length * 1000).toISOString(),
    ...input,
  };

  if (existingIndex >= 0) {
    logs[existingIndex] = nextLog;
    return nextLog;
  }

  logs.push(nextLog);
  return nextLog;
}

function normalizeReasoningLogs(logs: ReasoningLog[], orderId: string) {
  if (logs.length > 0) {
    return logs;
  }

  const result = validateRefundPolicy(orderId);

  return [
    {
      id: "fallback-policy",
      timestamp: new Date().toISOString(),
      status: "complete" as const,
      title: "Eligibility Checked",
      description: `${result.ruleResults.filter((rule) => rule.passed).length}/${result.ruleResults.length} policy checks passed`,
    },
    {
      id: "fallback-decision",
      timestamp: new Date(Date.now() + 1000).toISOString(),
      status: result.approved ? ("complete" as const) : ("failed" as const),
      title: result.approved ? "Refund Approved" : "Refund Denied",
      description: result.approved
        ? `Full refund approved - ${result.confidence}% confidence`
        : `${result.reasons[0]} - ${result.confidence}% confidence`,
    },
  ];
}

function parseFinalAnswer(content: string) {
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as unknown;
    return agentFinalAnswerSchema.parse(parsed);
  } catch {
    return agentFinalAnswerSchema.parse({
      customerMessage:
        cleaned ||
        "I completed the refund review, but could not format the response cleanly. Please try again.",
    });
  }
}
