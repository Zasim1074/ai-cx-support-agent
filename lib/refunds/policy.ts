import { getOrderById, getRefundHistoryByOrderId, getRefundPolicy } from "./data";
import type { EnrichedOrder, PolicyRuleResult, PolicyValidationResult } from "@/types/refund";

export function validateRefundPolicy(orderId: string): PolicyValidationResult {
  const order = getOrderById(orderId);

  if (!order) {
    throw new Error(`Order not found for policy validation: ${orderId}`);
  }

  return validateRefundPolicyForOrder(order);
}

export function validateRefundPolicyForOrder(
  order: EnrichedOrder,
): PolicyValidationResult {
  const policy = getRefundPolicy();
  const previousRefundsForOrder = getRefundHistoryByOrderId(order.id);
  const evaluationDate = new Date(policy.evaluationDate);
  const purchaseDate = new Date(`${order.purchaseDate}T00:00:00.000Z`);
  const daysSincePurchase = Math.max(
    0,
    Math.floor(
      (evaluationDate.getTime() - purchaseDate.getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );

  const withinWindow = daysSincePurchase <= policy.rules.refundWindowDays;
  const productConditionAllowed = !order.used || order.condition === "defective";
  const digitalAllowed =
    order.product.type !== "digital" || policy.rules.digitalProductsRefundable;
  const giftCardAllowed =
    order.product.type !== "gift_card" || policy.rules.giftCardsRefundable;
  const refundCountAllowed =
    previousRefundsForOrder.filter((record) => record.status === "approved")
      .length < policy.rules.maxRefundsPerOrder;

  const ruleResults: PolicyRuleResult[] = [
    {
      id: "refund-window",
      label: "Refund within 30 days of purchase",
      passed: withinWindow,
      detail: `${daysSincePurchase} days elapsed - ${
        withinWindow ? "eligible" : "outside refund window"
      }`,
    },
    {
      id: "condition",
      label: "Product must be unused or defective",
      passed: productConditionAllowed,
      detail:
        order.condition === "defective"
          ? "Customer reported defect - verified"
          : order.used
            ? "Product has been used - not eligible"
            : "Product unused - verified",
    },
    {
      id: "digital",
      label: "Digital products not refundable",
      passed: digitalAllowed,
      detail:
        order.product.type === "digital"
          ? "Digital delivery - not eligible"
          : "Physical product - eligible",
    },
    {
      id: "gift-card",
      label: "Gift cards excluded from refunds",
      passed: giftCardAllowed,
      detail:
        order.product.type === "gift_card"
          ? "Gift card purchase - not eligible"
          : "Standard purchase - eligible",
    },
    {
      id: "one-refund",
      label: "One refund per order",
      passed: refundCountAllowed,
      detail: refundCountAllowed
        ? "First refund on this order - eligible"
        : "Approved refund already exists for this order",
    },
  ];

  const failedRules = ruleResults.filter((rule) => !rule.passed);
  const approved = failedRules.length === 0;
  const confidence = approved ? 97 : Math.max(72, 94 - failedRules.length * 7);

  return {
    status: approved ? "approved" : "denied",
    approved,
    confidence,
    refundAmount: approved ? order.total : 0,
    daysSincePurchase,
    reasons: approved
      ? ["All refund policy checks passed."]
      : failedRules.map((rule) => rule.detail),
    ruleResults,
    order,
    policy,
  };
}
