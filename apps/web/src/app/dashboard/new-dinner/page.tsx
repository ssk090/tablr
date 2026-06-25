"use client";

import { useChat } from "@ai-sdk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  clearChatHistory,
  deleteMessage,
  getOrCreateChat,
  hideSubsequentMessages,
} from "@/app/actions/chat";
import { sendDinnerInvite } from "@/app/actions/invite";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Send,
  Sparkles,
  Loader2,
  MoreVertical,
  Trash2,
  Edit3,
  X,
  Check,
  Cog,
  ArrowRight,
  CalendarDays,
  MapPin,
  Clock,
  ChefHat,
  Sparkle,
  Command,
  Terminal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "../../../components/design-system/atoms";
import { Ripple } from "@/components/ui/ripple";

import { motion, AnimatePresence } from "framer-motion";

// Types for chat session data from database
interface StoredMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: Date;
}

interface ChatSession {
  id: string;
  messages: StoredMessage[];
}

// Message type compatible with useChat from @ai-sdk/react
type MessagePart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
    }
  | {
      type: "tool-result";
      toolCallId: string;
      toolName: string;
      result: unknown;
    }
  | {
      type: "step-start";
    }
  | {
      type: string;
      [key: string]: unknown;
    };

interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  state?: "call" | "result";
}

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content?: string;
  parts?: MessagePart[];
  toolInvocations?: ToolInvocation[]; // Standard AI SDK v6 tool invocations
  createdAt?: Date;
};

// Helper to extract text from message parts in AI SDK v6
function getMessageText(message: Message): string {
  if (typeof message.content === "string") return message.content;
  if (!message.parts) return "";
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text",
    )
    .map((part: { type: "text"; text: string }) => part.text)
    .join("");
}

const FALLBACK_SUGGESTIONS = [
  "did you find any match ?",
  "anyone looking for dinner ?",
  "where is my dinner ?",
  "cancel my request",
] as const;

// Tool call types for AI SDK v6
interface ToolCallPart {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

interface ToolResultPart {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  result: unknown;
}

// Helper to extract tool calls from message parts or toolInvocations
function getToolCalls(message: Message): ToolCallPart[] {
  const parts = message.parts || [];
  const partToolCalls = parts.filter(
    (part: MessagePart): part is ToolCallPart => part.type === "tool-call",
  );

  const toolInvocations = message.toolInvocations || [];
  const invocationToolCalls = toolInvocations.map((ti: ToolInvocation) => ({
    type: "tool-call" as const,
    toolCallId: ti.toolCallId,
    toolName: ti.toolName,
    args: ti.args,
  }));

  return [...partToolCalls, ...invocationToolCalls];
}

// Helper to extract tool results from message parts or toolInvocations
function getToolResults(message: Message): ToolResultPart[] {
  const parts = message.parts || [];
  const partToolResults = parts.filter(
    (part: MessagePart): part is ToolResultPart => part.type === "tool-result",
  );

  const toolInvocations = message.toolInvocations || [];
  const invocationToolResults = toolInvocations
    .filter((ti: ToolInvocation) => "result" in ti)
    .map((ti: ToolInvocation) => ({
      type: "tool-result" as const,
      toolCallId: ti.toolCallId,
      toolName: ti.toolName,
      result: ti.result,
    }));

  return [...partToolResults, ...invocationToolResults];
}

// Tool call display component
function ToolCallDisplay({
  toolCall,
  result,
}: {
  toolCall: ToolCallPart;
  result?: ToolResultPart;
}) {


  const toolIcon =
    {
      recordDiningIntent: ChefHat,
      checkAvailableDiners: Sparkles,
    }[toolCall.toolName] || Cog;

  const ToolIcon = toolIcon;

  const formatToolName = (name: string) => {
    return name
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const formatArgs = (args: Record<string, unknown>) => {
    return Object.entries(args).map(([key, value]) => ({
      key,
      value,
      icon:
        key === "area"
          ? MapPin
          : key === "date"
            ? CalendarDays
            : key === "timeSlot"
              ? Clock
              : null,
    }));
  };

  const formattedArgs = formatArgs(toolCall.args);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="my-4 rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 backdrop-blur-md overflow-hidden shadow-2xl shadow-primary/5"
    >
      {/* Header */}
      <div className="flex w-full items-center justify-between px-5 py-3 border-b border-primary/5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute -inset-2 bg-primary/20 blur-xl rounded-full animate-pulse" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <ToolIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                {formatToolName(toolCall.toolName)}
              </p>
              <Terminal className="h-3 w-3 text-primary/40" />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground/40 italic">
              Executing concierge ritual...
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[9px] font-black text-emerald-500 uppercase tracking-widest border border-emerald-500/20 shadow-lg shadow-emerald-500/5"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Done
              </motion.span>
            ) : (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-[9px] font-black text-primary uppercase tracking-widest border border-primary/20"
              >
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                Working
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-4 space-y-4">
        {/* Parameters */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent" />
            <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.3em]">
              Details
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {formattedArgs.map(({ key, value, icon: Icon }) => (
              <div
                key={key}
                className="group relative flex flex-col gap-1 rounded-2xl bg-muted/30 border border-border/60 p-3 transition-all hover:bg-muted/60 hover:border-primary/20"
              >
                <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-wider flex items-center gap-1.5">
                  {Icon && <Icon className="h-2.5 w-2.5" />}
                  {key}
                </span>
                <span className="text-sm font-semibold text-foreground/90 truncate">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Result */}
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
              <p className="text-[9px] font-black text-emerald-500/40 uppercase tracking-[0.3em]">
                Result
              </p>
            </div>
            <ToolResultView toolName={toolCall.toolName} result={result.result} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ── Person Card Component ──────────────────────────────────────────

function PersonCard({
  profileId,
  name,
  professionalTitle,
  company,
  bio,
  interests,
  preferredCuisines,
  preferredNeighborhoods,
  diningIntent,
}: {
  readonly profileId: string;
  readonly name: string;
  readonly professionalTitle?: string | null;
  readonly company?: string | null;
  readonly bio?: string | null;
  readonly interests?: readonly string[];
  readonly preferredCuisines?: readonly string[];
  readonly preferredNeighborhoods?: readonly string[];
  readonly diningIntent?: {
    readonly date?: string;
    readonly timeSlot?: string;
    readonly preferredArea?: string | null;
    readonly preferredTime?: string | null;
  } | null;
}) {
  const queryClient = useQueryClient();

  const invite = useMutation({
    mutationFn: () => sendDinnerInvite(profileId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Invite sent to ${name}!`, {
          description: "They'll be notified of your interest.",
        });
      } else if (result.error) {
        toast.error(result.error);
      }
    },
    onError: (error) => {
      toast.error("Failed to send invite", {
        description: error instanceof Error ? error.message : "Something went wrong.",
      });
    },
  });

  return (
    <div className="group rounded-2xl border border-border/60 bg-secondary/20 p-5 transition-all hover:bg-secondary/30 hover:border-primary/30">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <a
            href={`/dashboard/profiles/${profileId}`}
            className="font-bold text-foreground hover:text-primary transition-colors"
          >
            {name}
          </a>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[professionalTitle, company].filter(Boolean).join(" · ") || "Tablr member"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => invite.mutate()}
          disabled={invite.isPending}
          className="shrink-0 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
        >
          {invite.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Send Invite"
          )}
        </button>
      </div>

      {bio && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground line-clamp-2">{bio}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {preferredCuisines && preferredCuisines.length > 0 && (
          <span className="text-[10px] font-semibold text-primary/70">
            🍽 {preferredCuisines.slice(0, 3).join(", ")}
          </span>
        )}
        {preferredNeighborhoods && preferredNeighborhoods.length > 0 && (
          <span className="text-[10px] font-semibold text-accent/70">
            📍 {preferredNeighborhoods.slice(0, 3).join(", ")}
          </span>
        )}
        {interests && interests.length > 0 && (
          <span className="text-[10px] font-semibold text-muted-foreground/50">
            🎯 {interests.slice(0, 3).join(", ")}
          </span>
        )}
      </div>

      {diningIntent?.preferredArea && (
        <p className="mt-2 text-[10px] font-medium text-muted-foreground/40">
          Looking for {diningIntent.timeSlot?.toLowerCase() ?? "dinner"}{" "}
          {diningIntent.preferredTime ? `at ${diningIntent.preferredTime} ` : ""}
          {diningIntent.date ? `on ${diningIntent.date} ` : ""}
          in {diningIntent.preferredArea}
        </p>
      )}
    </div>
  );
}

function ToolResultView({ toolName, result }: { toolName: string; result: unknown }) {
  if (toolName === "findRestaurants" && result && typeof result === "object") {
    const data = result as {
      message?: string;
      restaurants?: Array<{
        id: string;
        name: string;
        area: string;
        cuisine?: string[];
        rating?: number;
        costForTwo?: number;
        ambiance?: string[];
        highlights?: string[];
      }>;
    };

    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/10 p-4">
          <p className="text-sm font-semibold text-emerald-400/90">{data.message ?? "Here are a few spots."}</p>
        </div>
        {data.restaurants?.map((restaurant) => (
          <div key={restaurant.id} className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-foreground">{restaurant.name}</p>
                <p className="text-xs text-muted-foreground">{restaurant.area}</p>
              </div>
              {restaurant.rating != null && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">★ {restaurant.rating}</span>}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {[...(restaurant.cuisine ?? []), ...(restaurant.ambiance ?? []), ...(restaurant.highlights ?? [])].slice(0, 5).join(" · ")}
            </p>
            {restaurant.costForTwo != null && <p className="mt-2 text-xs text-primary">₹{restaurant.costForTwo} for two</p>}
          </div>
        ))}
      </div>
    );
  }

  if (toolName === "checkAvailableDiners" && result && typeof result === "object") {
    const data = result as {
      message?: string;
      matchCount?: number;
      cards?: Array<{
        profileId: string;
        name: string;
        professionalTitle?: string | null;
        company?: string | null;
        bio?: string | null;
        interests?: readonly string[];
        preferredCuisines?: readonly string[];
        preferredNeighborhoods?: readonly string[];
        diningIntent?: { date?: string; timeSlot?: string; preferredArea?: string | null; preferredTime?: string | null };
        profilePath?: string;
      }>;
    };

    return (
      <div className="space-y-3">
        {data.message && (
          <p className="text-sm font-semibold text-foreground/80">{data.message}</p>
        )}
        {data.cards?.map((card) => (
          <PersonCard
            key={card.profileId}
            profileId={card.profileId}
            name={card.name}
            professionalTitle={card.professionalTitle}
            company={card.company}
            bio={card.bio}
            interests={card.interests}
            preferredCuisines={card.preferredCuisines}
            preferredNeighborhoods={card.preferredNeighborhoods}
            diningIntent={card.diningIntent}
          />
        ))}
      </div>
    );
  }

  if (toolName === "recordDiningIntent" && result && typeof result === "object") {
    const data = result as {
      status?: string;
      message?: string;
      otherDinerCount?: number;
      otherDiners?: Array<{
        profileId?: string;
        name: string;
        professionalTitle?: string | null;
        company?: string | null;
        bio?: string | null;
        interests?: readonly string[];
        preferredCuisines?: readonly string[];
        preferredNeighborhoods?: readonly string[];
        preferredArea?: string | null;
        preferredTime?: string | null;
      }>;
    };

    return (
      <div className="space-y-3">
        {data.message && (
          <p className="text-sm font-semibold text-emerald-400/90">{data.message}</p>
        )}
        {data.otherDiners && data.otherDiners.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
              Other diners available
            </p>
            {data.otherDiners.map((diner, i) => (
              diner.profileId ? (
                <PersonCard
                  key={`other-diner-${i}`}
                  profileId={diner.profileId}
                  name={diner.name}
                  professionalTitle={diner.professionalTitle}
                  company={diner.company}
                  bio={diner.bio}
                  interests={diner.interests}
                  preferredCuisines={diner.preferredCuisines}
                  preferredNeighborhoods={diner.preferredNeighborhoods}
                  diningIntent={{
                    preferredArea: diner.preferredArea,
                    preferredTime: diner.preferredTime,
                  }}
                />
              ) : null
            ))}
          </div>
        )}
      </div>
    );
  }

  const text = typeof result === "string" ? result : JSON.stringify(result);
  return (
    <div className="relative rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/10 p-4">
      <p className="text-sm font-medium text-emerald-400/90 leading-relaxed italic">{text}</p>
    </div>
  );
}

function FormattedAssistantText({ text }: { text: string }) {
  const itemRegex = /(\d+)\.\s+\*\*([^*]+)\*\*\s*-\s*([^\d]+?)(?=\s+\d+\.\s+\*\*|$)/g;
  const items = [...text.matchAll(itemRegex)].map((match) => ({
    number: match[1],
    title: match[2],
    description: match[3].trim(),
  }));

  if (items.length === 0) return <>{text}</>;

  const intro = text.slice(0, text.indexOf(`${items[0].number}.`)).trim();

  return (
    <div className="space-y-4">
      {intro && <p>{intro}</p>}
      <div className="grid gap-3">
        {items.map((item) => (
          <div key={`${item.number}-${item.title}`} className="rounded-2xl border border-border/60 bg-secondary/20 p-4">
            <div className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                {item.number}
              </span>
              <div>
                <p className="font-bold text-foreground">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatInterface({ chatSession, autoPrompt }: { chatSession: ChatSession; autoPrompt?: string }) {
  const queryClient = useQueryClient();
  const [localInput, setLocalInput] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [suggestions, setSuggestions] = useState<readonly string[]>(FALLBACK_SUGGESTIONS);
  const scrollRef = useRef<HTMLDivElement>(null);
  const suggestionsScrollRef = useRef<HTMLDivElement>(null);

  // Prepare initial messages
  const initialMessages = useMemo((): Message[] => {
    if (!chatSession?.messages) return [];
    return chatSession.messages.map(
      (m): Message => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        parts: [{ type: "text" as const, text: m.content }],
      }),
    );
  }, [chatSession]);

  // Initialize chat
  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: chatSession.id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: initialMessages as any,
  });

  const isSending = status === "streaming" || status === "submitted";
  const autoPromptSent = useRef(false);

  useEffect(() => {
    if (autoPrompt && !autoPromptSent.current && status === "ready" && messages.length === 0) {
      autoPromptSent.current = true;
      const timer = setTimeout(() => {
        sendMessage({ text: autoPrompt });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrompt, status, messages.length, sendMessage]);

  const sendText = useCallback(
    async (text: string): Promise<void> => {
      const trimmedText = text.trim();
      if (!trimmedText || isSending) return;

      setLocalInput("");

      try {
        console.log("[UI] Sending message to session:", chatSession.id, trimmedText);
        await sendMessage({ text: trimmedText });
      } catch (error) {
        console.error("Failed to send message:", error);
        setLocalInput(trimmedText);
      }
    },
    [chatSession.id, isSending, sendMessage],
  );

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalInput(e.target.value);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendText(localInput);
  };

  const suggestionsFallback = useMemo(() => FALLBACK_SUGGESTIONS, []);

  const scrollSuggestions = (direction: "left" | "right"): void => {
    suggestionsScrollRef.current?.scrollBy({
      left: direction === "left" ? -280 : 280,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (isSending) return;

    if (messages.length === 0) {
      return;
    }

    const abortController = new AbortController();
    const suggestionMessages = messages
      .slice(-8)
      .map((message) => ({
        role: message.role,
        text: getMessageText(message),
      }))
      .filter((message) => message.text.trim().length > 0);

    if (suggestionMessages.length === 0) return;

    const fetchSuggestions = async (): Promise<void> => {
      try {
        const response = await fetch("/api/chat/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: suggestionMessages }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`suggestions request failed: ${response.status}`);
        }

        const data = (await response.json()) as { suggestions?: string[] };
        if (data.suggestions?.length) {
          setSuggestions(data.suggestions);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Failed to fetch suggestions:", error);
        setSuggestions(suggestionsFallback);
      }
    };

    void fetchSuggestions();

    return () => {
      abortController.abort();
    };
  }, [isSending, messages, suggestionsFallback]);

  const handleClearHistory = async () => {
    if (messages.length === 0 || isClearingHistory) return;

    setIsClearingHistory(true);
    try {
      await clearChatHistory();
      setMessages([]);
      setSuggestions(FALLBACK_SUGGESTIONS);
      setActiveMenuId(null);
      await queryClient.invalidateQueries({ queryKey: ["chat-session"] });
    } catch (err) {
      console.error("Clear history failed:", err);
    } finally {
      setIsClearingHistory(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      // Update local state
      setMessages(messages.filter((m) => m.id !== messageId));
      setActiveMenuId(null);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const startEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditValue(getMessageText(message));
    setActiveMenuId(null);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditValue("");
  };

  const handleEditSave = async () => {
    if (!editValue.trim() || !editingMessageId) return;

    try {
      // 1. Mark this and subsequent messages as hidden in DB
      await hideSubsequentMessages(editingMessageId);

      // 2. Fork the conversation in local state
      const messageIndex = messages.findIndex((m) => m.id === editingMessageId);
      const forkedHistory = messages.slice(0, messageIndex);
      setMessages(forkedHistory);

      // 3. Send the new message
      const text = editValue;
      setEditingMessageId(null);
      setEditValue("");
      await sendMessage({ text });
    } catch (err) {
      console.error("Edit failed:", err);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background text-foreground overflow-hidden relative selection:bg-primary/30 selection:text-primary-foreground">
      {/* Grain Overlay */}
      <div className="pointer-events-none absolute inset-0 z-50 opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="shrink-0 border-b border-border/60 bg-background/70 px-8 py-5 backdrop-blur-2xl z-20">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute -inset-2 bg-primary/20 blur-xl rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/20 shadow-inner">
                <ChefHat className="h-6 w-6" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Tablr <span className="text-primary/80">Concierge</span>
                </h1>
                <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[8px] font-black text-primary uppercase tracking-[0.2em]">
                  Beta
                </span>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.4em] mt-0.5">
                Dining Concierge
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleClearHistory}
              disabled={messages.length === 0 || isClearingHistory || isSending}
              className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-30"
              aria-label="Clear chat history"
            >
              {isClearingHistory ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Clear
            </button>
            {status !== "ready" && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 rounded-2xl bg-muted/40 border border-border px-4 py-2 text-[10px] font-black text-primary uppercase tracking-widest shadow-2xl"
              >
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </div>
                {status}
              </motion.div>
            )}
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-8 py-10 scroll-smooth custom-scrollbar"
      >
        <div className="mx-auto max-w-3xl space-y-10">
          <AnimatePresence>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center space-y-8 py-20 text-center"
              >
                <div className="relative flex h-56 w-56 items-center justify-center overflow-hidden rounded-full">
                  <Ripple
                    mainCircleSize={96}
                    mainCircleOpacity={0.16}
                    numCircles={5}
                    className="text-primary"
                  />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl ">
                    <Sparkles className="h-10 w-10" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-black tracking-tight text-foreground">
                    Your Personal{" "}
                    <span className="text-primary italic">Dinner Guide</span>
                  </h2>
                  <p className="mx-auto max-w-md text-sm font-medium text-muted-foreground/60 leading-relaxed">
                    I help you find dining partners, coordinate plans,
                    and book tables. Ready to eat?
                  </p>
                </div>

                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 mt-8">
                  {[
                    "Find a romantic spot in Indiranagar",
                    "Best sushi for a group of six",
                    "Italian places with outdoor seating",
                    "Quiet spots for a business dinner",
                  ].map((suggestion, i) => (
                    <motion.button
                      key={suggestion}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => setLocalInput(suggestion)}
                      className="group relative flex items-center gap-4 rounded-2xl border border-border/60 bg-muted/30 p-5 text-left transition-all hover:bg-muted/40 hover:border-primary/30"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors border border-primary/10">
                        <Sparkle className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors tracking-tight">
                        {suggestion}
                      </span>
                      <ArrowRight className="absolute right-5 h-4 w-4 text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              className={cn(
                "group/msg flex w-full relative",
                message.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "flex max-w-[85%] items-start gap-4",
                  message.role === "user" ? "flex-row-reverse" : "flex-row",
                )}
              >
                {/* Avatar / Role Indicator */}
                <div
                  className={cn(
                    "mt-1 shrink-0 flex h-8 w-8 items-center justify-center rounded-xl border transition-all",
                    message.role === "user"
                      ? "bg-primary/10 border-primary/20 text-primary"
                      : "bg-muted/50 border-border text-muted-foreground",
                  )}
                >
                  {message.role === "user" ? (
                    <Command className="h-4 w-4" />
                  ) : (
                    <ChefHat className="h-4 w-4" />
                  )}
                </div>

                <div
                  className={cn(
                    "relative group/bubble",
                    message.role === "user" ? "w-full" : "w-full",
                  )}
                >
                  <div
                    className={cn(
                      "relative rounded-3xl text-sm leading-snug overflow-hidden transition-all",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground shadow-xl shadow-primary/10 font-medium"
                        : "border border-border/60 bg-muted/30 backdrop-blur-xl",
                    )}
                  >
                    {editingMessageId === message.id ? (
                      <div className="flex flex-col gap-4 min-w-[280px] p-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none text-foreground font-medium"
                          autoFocus
                          rows={3}
                        />
                        <div className="flex justify-end gap-2 border-t border-border/60 pt-3">
                          <button
                            onClick={cancelEdit}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-muted/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-colors"
                          >
                            <X className="h-3 w-3" /> Cancel
                          </button>
                          <button
                            onClick={handleEditSave}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all active:scale-95"
                          >
                            <Check className="h-3 w-3" /> Save & Fork
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Text Content */}
                        {getMessageText(message) && (
                          <div
                            className={cn(
                              "px-6 py-3.5",
                              message.role === "assistant"
                                ? "text-foreground font-medium tracking-tight text-base"
                                : "text-primary-foreground",
                            )}
                          >
                            {message.role === "assistant" ? (
                              <FormattedAssistantText text={getMessageText(message)} />
                            ) : (
                              getMessageText(message)
                            )}
                          </div>
                        )}

                        {/* Tool Calls (for assistant messages) */}
                        {message.role === "assistant" &&
                          (() => {
                            const toolCalls = getToolCalls(message);
                            const toolResults = getToolResults(message);
                            return toolCalls.length > 0 ? (
                              <div className="px-5 pb-5">
                                {toolCalls.map((toolCall) => {
                                  const result = toolResults.find(
                                    (r) => r.toolCallId === toolCall.toolCallId,
                                  );
                                  return (
                                    <ToolCallDisplay
                                      key={toolCall.toolCallId}
                                      toolCall={toolCall}
                                      result={result}
                                    />
                                  );
                                })}
                              </div>
                            ) : null;
                          })()}

                        {/* Show tool result text inline if no text content and no dedicated tool display was shown */}
                        {message.role === "assistant" &&
                          !getMessageText(message) &&
                          (() => {
                            const toolResults = getToolResults(message);
                            const toolCalls = getToolCalls(message);
                            // Show if we have tool results but no text and NO tool calls (unusual but possible)
                            if (
                              toolResults.length > 0 &&
                              toolResults[0].result &&
                              toolCalls.length === 0
                            ) {
                              return (
                                <div className="px-7 py-5 border-t border-border/60 bg-emerald-500/5">
                                  <p className="text-emerald-400/90 italic">
                                    &ldquo;{String(toolResults[0].result)}&rdquo;
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          })()}
                      </>
                    )}
                  </div>

                  {/* Message Actions Menu */}
                  {editingMessageId !== message.id && (
                    <div
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/bubble:opacity-100 transition-all duration-300",
                        message.role === "user"
                          ? "-left-12 pr-2"
                          : "-right-12 pl-2",
                      )}
                    >
                      <button
                        onClick={() =>
                          setActiveMenuId(
                            activeMenuId === message.id ? null : message.id,
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted/50 text-muted-foreground/30 hover:text-primary transition-all hover:scale-110"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {activeMenuId === message.id && (
                        <div
                          className={cn(
                            "absolute z-30 min-w-[140px] rounded-2xl border border-border bg-background/95 p-1.5 shadow-2xl backdrop-blur-3xl animate-in zoom-in-95 duration-200",
                            message.role === "user"
                              ? "right-full mr-2 top-0"
                              : "left-full ml-2 top-0",
                          )}
                        >
                          {message.role === "user" && (
                            <button
                              onClick={() => startEdit(message)}
                              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted/50 hover:text-primary transition-all"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(message.id)}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-destructive/60 hover:bg-destructive/10 hover:text-destructive transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-center"
            >
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-destructive shadow-2xl backdrop-blur-md">
                Error: {error.message || "Connection lost"}
              </div>
            </motion.div>
          )}

          {isSending &&
            !messages.some(
              (m) =>
                m.role === "assistant" &&
                (getMessageText(m) || getToolCalls(m).length > 0),
            ) && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex justify-start"
              >
                <div className="flex items-center gap-4 rounded-3xl border border-border/60 bg-muted/30 px-6 py-3 backdrop-blur-xl">
                  <div className="flex gap-2">
                    <motion.span
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
                      className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                    />
                    <motion.span
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        delay: 0.2,
                      }}
                      className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                    />
                    <motion.span
                      animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        delay: 0.4,
                      }}
                      className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                    />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">
                    Thinking
                  </span>
                </div>
              </motion.div>
            )}
        </div>
      </div>

      {/* Input Area */}
      <div className="shrink-0 z-30 border-t border-border/60 bg-background/95 px-8 pb-8 pt-4 backdrop-blur-2xl">
        <div className="mx-auto max-w-3xl mb-4">
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollSuggestions("left")}
              className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground shadow-xl backdrop-blur-xl transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary active:scale-95"
              aria-label="Scroll suggestions left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="pointer-events-none absolute left-10 top-0 bottom-0 z-10 w-10 bg-gradient-to-r from-background to-transparent" />
            <div
              ref={suggestionsScrollRef}
              className="flex flex-1 snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={suggestions.join("|")}
                  initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="flex gap-2"
                >
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={isSending}
                      onClick={() => void sendText(suggestion)}
                      className="snap-start whitespace-nowrap rounded-full bg-muted/50 border border-border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                    >
                      {suggestion}
                    </button>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="pointer-events-none absolute right-10 top-0 bottom-0 z-10 w-10 bg-gradient-to-l from-background to-transparent" />

            <button
              type="button"
              onClick={() => scrollSuggestions("right")}
              className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground shadow-xl backdrop-blur-xl transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary active:scale-95"
              aria-label="Scroll suggestions right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <form onSubmit={onSubmit} className="mx-auto max-w-3xl relative">
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 rounded-[2rem] blur opacity-0 group-focus-within:opacity-100 transition duration-1000 group-hover:duration-200" />
            <div className="relative">
              <input
                value={localInput}
                onChange={handleInputChange}
                placeholder="Direct the concierge..."
                className="w-full rounded-[2rem] border border-border bg-background/80 py-5 pl-8 pr-16 text-base font-medium transition-all focus:border-primary/40 focus:outline-none focus:ring-0 placeholder:text-muted-foreground/40 text-foreground backdrop-blur-3xl"
              />
              <button
                disabled={isSending || !localInput.trim()}
                type="submit"
                className="absolute right-2.5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-[1.5rem] bg-primary text-primary-foreground transition-all hover:scale-105 active:scale-95 disabled:opacity-20 disabled:hover:scale-100 shadow-xl shadow-primary/20"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-6">
            <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.5em]">
              Tablr <span className="text-primary/20">Aether</span> v6.0.4
            </p>
            <div className="h-px w-8 bg-muted/50" />
            <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.5em]">
              Secured Session
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewDinnerPage() {
  const searchParams = useSearchParams();
  const autoPrompt = searchParams.get("prompt") === "check" ? "anyone looking for dinner ?" : null;

  // 1. Get or create chat session
  const { data: chatData, isLoading: isChatLoading } = useQuery({
    queryKey: ["chat-session"],
    queryFn: () => getOrCreateChat(),
  });

  if (isChatLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-background text-foreground relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="relative">
            <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full animate-pulse" />
            <ChefHat className="h-12 w-12 text-primary animate-bounce" />
          </div>
          <div className="space-y-2 text-center">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.5em] animate-pulse">
              Loading Concierge
            </p>
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary/30 to-transparent mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!chatData) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-background text-foreground">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-8 py-6 text-center backdrop-blur-xl">
          <p className="text-sm font-bold text-destructive uppercase tracking-widest mb-2">
            Manifestation Failed
          </p>
          <p className="text-xs text-destructive/60">
            The culinary spirits are silent. Please refresh.
          </p>
        </div>
      </div>
    );
  }

  return <ChatInterface chatSession={chatData as ChatSession} autoPrompt={autoPrompt ?? undefined} />;
}
