export type CustomerTierId = "standard" | "silver" | "gold" | "platinum";

export type ProductType = "physical" | "digital" | "gift_card";

export type RefundDecisionStatus = "approved" | "denied" | "pending";

export type Customer = {
  id: string;
  name: string;
  email: string;
  tierId: CustomerTierId;
  memberSince: string;
  totalOrders: number;
  totalSpent: number;
  avatarUrl: string;
};

export type CustomerTier = {
  id: CustomerTierId;
  name: string;
  priorityMultiplier: number;
  benefits: string[];
};

export type Product = {
  id: string;
  name: string;
  category: string;
  type: ProductType;
  price: number;
  refundable: boolean;
};

export type OrderCondition =
  | "unopened"
  | "unused"
  | "used"
  | "worn"
  | "downloaded"
  | "defective";

export type Order = {
  id: string;
  customerId: string;
  productId: string;
  purchaseDate: string;
  deliveryDate: string;
  status: string;
  quantity: number;
  total: number;
  condition: OrderCondition;
  issueDescription: string;
  used: boolean;
};

export type RefundRecord = {
  id: string;
  customerId: string;
  orderId: string;
  createdAt: string;
  status: "approved" | "denied";
  amount: number;
  reason: string;
};

export type RefundPolicy = {
  id: string;
  name: string;
  version: string;
  evaluationDate: string;
  currency: string;
  rules: {
    refundWindowDays: number;
    productMustBeUnusedOrDefective: boolean;
    digitalProductsRefundable: boolean;
    giftCardsRefundable: boolean;
    maxRefundsPerOrder: number;
  };
  processingTimeline: {
    approvalReviewHours: number;
    refundBusinessDaysMin: number;
    refundBusinessDaysMax: number;
  };
};

export type EnrichedOrder = Order & {
  customer: Customer;
  product: Product;
};

export type PolicyRuleResult = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
};

export type PolicyValidationResult = {
  status: Exclude<RefundDecisionStatus, "pending">;
  approved: boolean;
  confidence: number;
  refundAmount: number;
  daysSincePurchase: number;
  reasons: string[];
  ruleResults: PolicyRuleResult[];
  order: EnrichedOrder;
  policy: RefundPolicy;
};

export type ReasoningLog = {
  id: string;
  timestamp: string;
  status: "complete" | "failed" | "info";
  title: string;
  description: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export type DashboardState = {
  customer: Customer;
  tier: CustomerTier;
  order: EnrichedOrder;
  refundHistory: RefundRecord[];
  policy: RefundPolicy;
  policyValidation: PolicyValidationResult;
  reasoningLogs: ReasoningLog[];
};

export type ChatApiRequest = {
  message: string;
  activeCustomerEmail?: string;
  activeOrderId?: string;
};

export type ChatApiResponse = {
  message: string;
  dashboard: DashboardState;
};
