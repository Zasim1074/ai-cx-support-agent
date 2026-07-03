import {
  getCustomerByEmail,
  getOrderById,
  getRefundHistoryByCustomerId,
  getRefundPolicy,
  getTierById,
} from "./data";
import { validateRefundPolicy } from "./policy";
import type { DashboardState, ReasoningLog } from "@/types/refund";

export function getDefaultDashboardState(): DashboardState {
  return buildDashboardState(
    "marcus.reynolds@email.com",
    "ORD-928471",
    createInitialReasoningLogs(),
  );
}

export function buildDashboardState(
  customerEmail: string,
  orderId: string,
  reasoningLogs: ReasoningLog[],
): DashboardState {
  const customer = getCustomerByEmail(customerEmail);
  const order = getOrderById(orderId);

  if (!customer) {
    throw new Error(`Customer not found for ${customerEmail}.`);
  }

  if (!order) {
    throw new Error(`Order not found for ${orderId}.`);
  }

  const tier = getTierById(customer.tierId);

  if (!tier) {
    throw new Error(`Tier not found for ${customer.tierId}.`);
  }

  return {
    customer,
    tier,
    order,
    refundHistory: getRefundHistoryByCustomerId(customer.id),
    policy: getRefundPolicy(),
    policyValidation: validateRefundPolicy(order.id),
    reasoningLogs,
  };
}

export function createInitialReasoningLogs(): ReasoningLog[] {
  const policy = getRefundPolicy();
  const baseDate = new Date(policy.evaluationDate);
  const times = [0, 2, 3, 4, 6, 7, 9];

  return [
    {
      id: "initial-customer",
      timestamp: new Date(baseDate.getTime() + times[0] * 1000).toISOString(),
      status: "complete",
      title: "Customer Found",
      description: "Matched CUS-44821 in database",
    },
    {
      id: "initial-order",
      timestamp: new Date(baseDate.getTime() + times[1] * 1000).toISOString(),
      status: "complete",
      title: "Order Retrieved",
      description: "ORD-928471 - $249.99 - Delivered",
    },
    {
      id: "initial-policy",
      timestamp: new Date(baseDate.getTime() + times[2] * 1000).toISOString(),
      status: "complete",
      title: "Policy Loaded",
      description: "Electronics return policy v2.4",
    },
    {
      id: "initial-window",
      timestamp: new Date(baseDate.getTime() + times[3] * 1000).toISOString(),
      status: "complete",
      title: "Days Since Purchase",
      description: "17 days - within 30-day window",
    },
    {
      id: "initial-product",
      timestamp: new Date(baseDate.getTime() + times[4] * 1000).toISOString(),
      status: "complete",
      title: "Product Eligibility",
      description: "Electronics - refundable category",
    },
    {
      id: "initial-history",
      timestamp: new Date(baseDate.getTime() + times[5] * 1000).toISOString(),
      status: "complete",
      title: "Previous Refund Check",
      description: "No prior refund on this order",
    },
    {
      id: "initial-decision",
      timestamp: new Date(baseDate.getTime() + times[6] * 1000).toISOString(),
      status: "complete",
      title: "Final Decision",
      description: "Full refund approved - 97% confidence",
    },
  ];
}
