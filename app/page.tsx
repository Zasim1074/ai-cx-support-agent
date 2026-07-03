import { RefundDashboard } from "@/components/refunds/refund-dashboard";
import { getDefaultDashboardState } from "@/lib/refunds/dashboard";

export default function Home() {
  const dashboard = getDefaultDashboardState();

  return <RefundDashboard initialDashboard={dashboard} />;
}