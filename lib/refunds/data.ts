import crmData from "@/data/crm.json";
import customerTiersData from "@/data/customer-tiers.json";
import productsData from "@/data/products.json";
import refundPolicyData from "@/data/refund-policy.json";
import type {
  Customer,
  CustomerTier,
  CustomerTierId,
  EnrichedOrder,
  Order,
  Product,
  RefundPolicy,
  RefundRecord,
} from "@/types/refund";

const customers = crmData.customers as Customer[];
const orders = crmData.orders as Order[];
const refundHistory = crmData.refundHistory as RefundRecord[];
const products = productsData as Product[];
const customerTiers = customerTiersData as CustomerTier[];
const refundPolicy = refundPolicyData as RefundPolicy;

export function getCustomers() {
  return customers;
}

export function getOrders() {
  return orders;
}

export function getProducts() {
  return products;
}

export function getRefundPolicy() {
  return refundPolicy;
}

export function getCustomerByEmail(email: string) {
  return customers.find(
    (customer) => customer.email.toLowerCase() === email.toLowerCase(),
  );
}

export function getCustomerById(customerId: string) {
  return customers.find((customer) => customer.id === customerId);
}

export function getTierById(tierId: CustomerTierId) {
  return customerTiers.find((tier) => tier.id === tierId);
}

export function getOrderById(orderId: string) {
  const order = orders.find(
    (candidate) => candidate.id.toLowerCase() === orderId.toLowerCase(),
  );

  if (!order) {
    return undefined;
  }

  return enrichOrder(order);
}

export function getRefundHistoryByCustomerId(customerId: string) {
  return refundHistory.filter((record) => record.customerId === customerId);
}

export function getRefundHistoryByOrderId(orderId: string) {
  return refundHistory.filter((record) => record.orderId === orderId);
}

export function getOrdersByCustomerId(customerId: string) {
  return orders
    .filter((order) => order.customerId === customerId)
    .map((order) => enrichOrder(order));
}

function enrichOrder(order: Order): EnrichedOrder {
  const customer = getCustomerById(order.customerId);
  const product = products.find((candidate) => candidate.id === order.productId);

  if (!customer || !product) {
    throw new Error(`Unable to enrich order ${order.id}.`);
  }

  return {
    ...order,
    customer,
    product,
  };
}
