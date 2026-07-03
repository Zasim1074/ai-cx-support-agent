import { z } from "zod";

export const chatApiRequestSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(1200),
  activeCustomerEmail: z.string().email().optional(),
  activeOrderId: z.string().trim().min(3).optional(),
});

export const createReasoningLogSchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().min(2),
  status: z.enum(["complete", "failed", "info"]).default("complete"),
});

export const getCustomerSchema = z.object({
  email: z.string().email(),
});

export const getOrderSchema = z.object({
  orderId: z.string().trim().min(3),
});

export const getRefundHistorySchema = z.object({
  customerId: z.string().trim().min(3),
});

export const validateRefundPolicySchema = z.object({
  orderId: z.string().trim().min(3).optional(),
  order: z
    .object({
      id: z.string(),
      customerId: z.string(),
      productId: z.string(),
      purchaseDate: z.string(),
      deliveryDate: z.string(),
      status: z.string(),
      quantity: z.number(),
      total: z.number(),
      condition: z.string(),
      issueDescription: z.string(),
      used: z.boolean(),
    })
    .optional(),
});

export const agentFinalAnswerSchema = z.object({
  customerMessage: z.string().trim().min(1),
});
