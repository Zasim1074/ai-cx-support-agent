"use client";

import {
  Bell,
  Bot,
  Boxes,
  BriefcaseBusiness,
  Check,
  CircleDollarSign,
  Download,
  FileText,
  Grid2X2,
  Loader2,
  Mic,
  Package,
  Paperclip,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from "@/hooks/use-chat";
import {
  formatCurrency,
  formatLongDate,
  formatMonthYear,
  formatShortDate,
  formatTime,
} from "@/lib/refunds/format";
import { cn } from "@/lib/utils";
import type { ChatMessage, DashboardState, ReasoningLog } from "@/types/refund";

type RefundDashboardProps = {
  initialDashboard: DashboardState;
};

const quickActions = [
  {
    label: "Check refund eligibility",
    icon: ShieldCheck,
    prompt: "Please check refund eligibility for this order.",
  },
  {
    label: "Find order",
    icon: Search,
    prompt: "Find the active order and summarize the key details.",
  },
  {
    label: "Explain policy",
    icon: FileText,
    prompt: "Explain the refund policy checks for this request.",
  },
  {
    label: "Track shipment",
    icon: Package,
    prompt: "Check the delivery status and explain how it affects the refund.",
  },
];

export function RefundDashboard({ initialDashboard }: RefundDashboardProps) {
  const { messages, dashboard, isLoading, error, scrollRef, sendMessage } =
    useChat(initialDashboard);
  const [message, setMessage] = useState("");

  const decision = dashboard.policyValidation;
  const approved = decision.approved;
  const statusLabel = approved ? "APPROVED" : "DENIED";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedMessage = message;
    setMessage("");
    await sendMessage(submittedMessage);
  }

  async function handleQuickPrompt(prompt: string) {
    await sendMessage(prompt);
  }

  function downloadReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      customer: dashboard.customer,
      order: dashboard.order,
      refundHistory: dashboard.refundHistory,
      policyValidation: dashboard.policyValidation,
      reasoningLogs: dashboard.reasoningLogs,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${dashboard.order.id}-refund-report.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="flex h-dvh min-h-180 flex-col overflow-hidden bg-slate-50 text-slate-900">
      <TopBar dashboard={dashboard} />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px]">
        <section className="flex min-h-0 flex-col border-r border-slate-200 bg-slate-50">
          <ConversationHeader dashboard={dashboard} />
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto flex max-w-225 flex-col gap-5">
              <DateDivider value={dashboard.policy.evaluationDate} />
              {messages.map((chatMessage) => (
                <ChatBubble
                  key={chatMessage.id}
                  message={chatMessage}
                  customerName={dashboard.customer.name}
                  customerAvatar={dashboard.customer.avatarUrl}
                />
              ))}

              {isLoading ? <TypingIndicator /> : null}

              {error ? (
                <Alert
                  variant="destructive"
                  className="border-red-200 bg-red-50 text-red-700"
                >
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <div ref={scrollRef} />
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
            <div className="mx-auto max-w-225">
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isLoading}
                    className="rounded-full border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
                    onClick={() => handleQuickPrompt(action.prompt)}
                  >
                    <action.icon className="size-3.5 text-blue-600" />
                    {action.label}
                  </Button>
                ))}
              </div>

              <form className="relative" onSubmit={handleSubmit}>
                <Textarea
                  value={message}
                  disabled={isLoading}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="Type a message or use a quick action..."
                  className="min-h-14 resize-none rounded-xl border-slate-200 bg-slate-50 py-4 pl-4 pr-28 text-sm shadow-sm focus-visible:ring-blue-500/20"
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-slate-500"
                    aria-label="Attach file"
                  >
                    <Paperclip className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-slate-500"
                    aria-label="Record voice note"
                  >
                    <Mic className="size-4" />
                  </Button>
                  <Button
                    type="submit"
                    size="icon-lg"
                    disabled={isLoading || !message.trim()}
                    className="rounded-lg bg-blue-600 hover:bg-blue-700"
                    aria-label="Send message"
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </section>

        <aside className="hidden min-h-0 overflow-y-auto bg-slate-50 p-5 lg:block">
          <div className="space-y-4">
            <CustomerCard dashboard={dashboard} />
            <OrderCard dashboard={dashboard} />
            <ReasoningCard logs={dashboard.reasoningLogs} />
            <PolicyCard dashboard={dashboard} />
            <DecisionCard dashboard={dashboard} />
            <ActionsCard
              approved={approved}
              isLoading={isLoading}
              onApprove={() =>
                handleQuickPrompt(
                  `Approve the refund for ${dashboard.order.id} and explain the next steps.`,
                )
              }
              onDeny={() =>
                handleQuickPrompt(
                  `Deny the refund for ${dashboard.order.id} if the policy requires it and explain why.`,
                )
              }
              onEscalate={() =>
                handleQuickPrompt(
                  `Escalate ${dashboard.order.id} to a human support agent and summarize the context.`,
                )
              }
              onDownload={downloadReport}
            />
          </div>
        </aside>
      </div>

      <div className="border-t border-slate-200 bg-white p-3 lg:hidden">
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-center text-sm font-semibold",
            approved
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700",
          )}
        >
          {statusLabel} - {decision.confidence}% confidence
        </div>
      </div>
    </main>
  );
}

function TopBar({ dashboard }: { dashboard: DashboardState }) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-blue-600 text-white">
          <BriefcaseBusiness className="size-5" />
        </div>
        <span className="text-lg font-bold tracking-tight">RefundAI</span>
      </div>

      <div className="hidden w-full max-w-md items-center rounded-lg border border-slate-200 bg-slate-100 px-3 sm:flex">
        <Search className="size-4 text-slate-400" />
        <Input
          aria-label="Search tickets customers or orders"
          placeholder="Search tickets, customers, orders..."
          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <IconButton label="Apps">
          <Grid2X2 className="size-4" />
        </IconButton>
        <IconButton label="Notifications" hasDot>
          <Bell className="size-4" />
        </IconButton>
        <Avatar size="lg">
          <AvatarImage src={dashboard.customer.avatarUrl} alt="" />
          <AvatarFallback>{getInitials(dashboard.customer.name)}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

function IconButton({
  label,
  hasDot,
  children,
}: {
  label: string;
  hasDot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      className="relative rounded-lg border-slate-200 bg-white text-slate-500"
      aria-label={label}
    >
      {children}
      {hasDot ? (
        <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500 ring-2 ring-white" />
      ) : null}
    </Button>
  );
}

function ConversationHeader({ dashboard }: { dashboard: DashboardState }) {
  return (
    <div className="flex shrink-0 items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
      <Avatar className="size-12">
        <AvatarImage src={dashboard.customer.avatarUrl} alt="" />
        <AvatarFallback>{getInitials(dashboard.customer.name)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold">{dashboard.customer.name}</h1>
        <p className="truncate text-sm text-slate-500">
          {dashboard.customer.email}
        </p>
      </div>

      <div className="ml-auto hidden items-center gap-3 md:flex">
        <Badge className="bg-blue-50 text-blue-700">
          <Package className="size-3" />
          {dashboard.order.id}
        </Badge>
        <Badge className="bg-yellow-100 text-yellow-700">
          <CircleDollarSign className="size-3" />
          Refund Pending
        </Badge>
        <span className="h-5 w-px bg-slate-200" />
        <span className="flex items-center gap-2 text-sm text-slate-500">
          <span className="size-2 rounded-full bg-emerald-500" />
          Active
        </span>
      </div>
    </div>
  );
}

function DateDivider({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-4 text-center text-xs font-semibold text-slate-400">
      <span className="h-px flex-1 bg-slate-200" />
      <span>{formatLongDate(value)}</span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function ChatBubble({
  message,
  customerName,
  customerAvatar,
}: {
  message: ChatMessage;
  customerName: string;
  customerAvatar: string;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "grid gap-2",
        isUser
          ? "grid-cols-[minmax(0,1fr)_36px]"
          : "grid-cols-[36px_minmax(0,1fr)]",
      )}
    >
      {!isUser ? <AgentIcon /> : null}

      <div
        className={cn(
          "min-w-0",
          isUser ? "col-start-1 row-start-1 justify-self-end" : "",
        )}
      >
        <div
          className={cn(
            "mb-1 text-xs font-semibold text-slate-400",
            isUser ? "text-right" : "",
          )}
        >
          {isUser ? customerName : "RefundAI Agent"}
        </div>
        <div
          className={cn(
            "max-w-170 whitespace-pre-line rounded-xl px-4 py-3 text-sm leading-6 shadow-sm",
            isUser
              ? "rounded-br-sm bg-blue-600 text-white"
              : "rounded-bl-sm border border-slate-200 bg-white text-slate-800",
          )}
        >
          {message.content}
        </div>
        <div
          className={cn(
            "mt-1 text-xs text-slate-400",
            isUser ? "text-right" : "",
          )}
        >
          {formatTime(message.timestamp)}
          {!isUser ? " - AI" : ""}
        </div>
      </div>

      {isUser ? (
        <Avatar className="col-start-2 row-start-1 mt-7 size-8">
          <AvatarImage src={customerAvatar} alt="" />
          <AvatarFallback>{getInitials(customerName)}</AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  );
}

function AgentIcon() {
  return (
    <div className="mt-7 flex size-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
      <Bot className="size-4" />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-2">
      <AgentIcon />
      <div>
        <div className="mb-1 text-xs font-semibold text-slate-400">
          RefundAI Agent is typing...
        </div>
        <div className="flex w-fit gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="size-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.2s]" />
          <span className="size-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.1s]" />
          <span className="size-2 animate-bounce rounded-full bg-slate-300" />
        </div>
      </div>
    </div>
  );
}

function CustomerCard({ dashboard }: { dashboard: DashboardState }) {
  const previousRefunds = dashboard.refundHistory.filter(
    (refund) => refund.status === "approved",
  ).length;

  return (
    <PanelCard
      title="Customer Information"
      icon={<UserRound className="size-4 text-blue-600" />}
    >
      <div className="flex items-center gap-3">
        <Avatar className="size-12">
          <AvatarImage src={dashboard.customer.avatarUrl} alt="" />
          <AvatarFallback>{getInitials(dashboard.customer.name)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-bold">{dashboard.customer.name}</div>
          <div className="text-sm text-slate-500">{dashboard.customer.email}</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <InfoItem label="Customer ID" value={dashboard.customer.id} />
        <InfoItem
          label="Loyalty Tier"
          value={
            <Badge className="bg-yellow-100 text-yellow-700">
              <ShieldCheck className="size-3" />
              {dashboard.tier.name}
            </Badge>
          }
        />
        <InfoItem
          label="Total Orders"
          value={dashboard.customer.totalOrders.toLocaleString()}
        />
        <InfoItem label="Previous Refunds" value={previousRefunds} />
        <InfoItem
          label="Member Since"
          value={formatMonthYear(dashboard.customer.memberSince)}
        />
        <InfoItem
          label="Total Spent"
          value={formatCurrency(dashboard.customer.totalSpent)}
        />
      </div>
    </PanelCard>
  );
}

function OrderCard({ dashboard }: { dashboard: DashboardState }) {
  return (
    <PanelCard
      title="Order Details"
      icon={<Boxes className="size-4 text-blue-600" />}
    >
      <div className="grid grid-cols-2 gap-4 text-sm">
        <InfoItem label="Order Number" value={dashboard.order.id} />
        <InfoItem
          label="Purchase Date"
          value={formatShortDate(dashboard.order.purchaseDate)}
        />
        <InfoItem label="Product" value={dashboard.order.product.name} wide />
        <InfoItem label="Category" value={dashboard.order.product.category} />
        <InfoItem label="Price" value={formatCurrency(dashboard.order.total)} />
        <InfoItem
          label="Delivery Date"
          value={formatShortDate(dashboard.order.deliveryDate)}
        />
        <InfoItem
          label="Status"
          value={
            <Badge className="bg-yellow-100 text-yellow-700">
              Refund Pending
            </Badge>
          }
        />
      </div>
    </PanelCard>
  );
}

function ReasoningCard({ logs }: { logs: ReasoningLog[] }) {
  const completeCount = logs.filter((log) => log.status === "complete").length;

  return (
    <PanelCard
      title="AI Agent Reasoning Logs"
      icon={<Sparkles className="size-4 text-blue-600" />}
      action={
        <Badge className="bg-emerald-100 text-emerald-700">
          {completeCount}/{logs.length} Complete
        </Badge>
      }
    >
      <div className="space-y-0">
        {logs.map((log, index) => (
          <div key={log.id} className="relative flex gap-3 pb-4 last:pb-0">
            {index < logs.length - 1 ? (
              <span className="absolute left-2.75 top-7 h-full w-px bg-slate-200" />
            ) : null}
            <LogIcon status={log.status} isFinal={index === logs.length - 1} />
            <div className="min-w-0">
              <div
                className={cn(
                  "text-sm font-bold",
                  index === logs.length - 1 ? "text-blue-600" : "text-slate-800",
                )}
              >
                {log.title}
              </div>
              <p className="text-xs leading-5 text-slate-500">
                {log.description}
              </p>
              <p className="text-xs text-slate-400">{formatTime(log.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function PolicyCard({ dashboard }: { dashboard: DashboardState }) {
  return (
    <PanelCard
      title="Refund Policy Summary"
      icon={<Shield className="size-4 text-blue-600" />}
    >
      <div className="space-y-3">
        {dashboard.policyValidation.ruleResults.map((rule) => (
          <div key={rule.id} className="flex gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                rule.passed
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-red-100 text-red-600",
              )}
            >
              {rule.passed ? <Check className="size-3" /> : <X className="size-3" />}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-800">
                {rule.label}
              </div>
              <div className="text-xs text-slate-500">{rule.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function DecisionCard({ dashboard }: { dashboard: DashboardState }) {
  const { policyValidation } = dashboard;
  const approved = policyValidation.approved;

  return (
    <div
      className={cn(
        "rounded-xl border p-6 text-center shadow-sm",
        approved
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-900",
      )}
    >
      <div
        className={cn(
          "mx-auto mb-4 flex size-14 items-center justify-center rounded-full text-white",
          approved ? "bg-emerald-600" : "bg-red-600",
        )}
      >
        {approved ? <Check className="size-7" /> : <X className="size-7" />}
      </div>
      <div className="text-2xl font-extrabold">
        {approved ? "APPROVED" : "DENIED"}
      </div>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-6">
        {approved
          ? `Full refund of ${formatCurrency(policyValidation.refundAmount)} approved. Customer meets all eligibility criteria.`
          : policyValidation.reasons.join(" ")}
      </p>
      <Badge
        className={cn(
          "mt-4",
          approved ? "bg-white text-emerald-700" : "bg-white text-red-700",
        )}
      >
        <Sparkles className="size-3" />
        AI Confidence: {policyValidation.confidence}%
      </Badge>
    </div>
  );
}

function ActionsCard({
  approved,
  isLoading,
  onApprove,
  onDeny,
  onEscalate,
  onDownload,
}: {
  approved: boolean;
  isLoading: boolean;
  onApprove: () => void;
  onDeny: () => void;
  onEscalate: () => void;
  onDownload: () => void;
}) {
  return (
    <PanelCard title="Actions">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          disabled={isLoading}
          onClick={onApprove}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Check className="size-4" />
          Approve Refund
        </Button>
        <Button
          type="button"
          disabled={isLoading || approved}
          onClick={onDeny}
          className="border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
          variant="secondary"
        >
          <X className="size-4" />
          Deny Refund
        </Button>
        <Button
          type="button"
          disabled={isLoading}
          onClick={onEscalate}
          className="border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
          variant="secondary"
        >
          <Users className="size-4" />
          Escalate to Human
        </Button>
        <Button
          type="button"
          onClick={onDownload}
          className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          variant="secondary"
        >
          <Download className="size-4" />
          Download Report
        </Button>
      </div>
    </PanelCard>
  );
}

function PanelCard({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0 rounded-xl border border-slate-200 bg-white py-0 shadow-sm ring-0">
      <CardHeader className="border-b border-slate-200 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold">
            {icon}
            {title}
          </CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent className="px-4 py-4">{children}</CardContent>
    </Card>
  );
}

function InfoItem({
  label,
  value,
  wide,
}: {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn("min-w-0", wide ? "col-span-2" : "")}>
      <div className="text-xs font-semibold text-slate-400">{label}</div>
      <div className="mt-0.5 wrap-break-word text-sm font-bold text-slate-800">
        {value}
      </div>
    </div>
  );
}

function LogIcon({
  status,
  isFinal,
}: {
  status: ReasoningLog["status"];
  isFinal: boolean;
}) {
  const iconClass =
    status === "failed"
      ? "bg-red-100 text-red-600"
      : isFinal
        ? "bg-blue-600 text-white"
        : "bg-emerald-100 text-emerald-600";

  return (
    <span
      className={cn(
        "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full",
        iconClass,
      )}
    >
      {status === "failed" ? <X className="size-3" /> : <Check className="size-3" />}
    </span>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
