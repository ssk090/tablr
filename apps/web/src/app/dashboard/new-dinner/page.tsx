"use client";

import { useChat } from "@ai-sdk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useMemo } from "react";
import { getOrCreateChat, deleteMessage, hideSubsequentMessages } from "@/app/actions/chat";
import { 
  Send, Sparkles, UtensilsCrossed, Loader2, MoreVertical, 
  Trash2, Edit3, X, Check, Cog, ArrowRight, CalendarDays, 
  MapPin, Clock, ChefHat, Sparkle, Command, Terminal
} from "lucide-react";
import { cn } from "../../../components/design-system/atoms";
import type { JSONValue } from "ai";
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
type MessagePart = {
  type: "text";
  text: string;
} | {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
} | {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  result: unknown;
} | {
  type: "step-start";
} | {
  type: string;
  [key: string]: unknown;
};

interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  state?: 'call' | 'result';
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
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part: { type: "text"; text: string }) => part.text)
    .join("");
}

const SUGGESTIONS = [
  "did you find any match ?",
  "anyone looking for dinner ?",
  "where is my dinner ?",
  "cancel my request"
];

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
  const partToolCalls = parts.filter((part: MessagePart): part is ToolCallPart => part.type === "tool-call");
  
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
  const partToolResults = parts.filter((part: MessagePart): part is ToolResultPart => part.type === "tool-result");
  
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
function ToolCallDisplay({ toolCall, result }: { toolCall: ToolCallPart; result?: ToolResultPart }) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const toolIcon = {
    recordDiningIntent: ChefHat,
  }[toolCall.toolName] || Cog;
  
  const ToolIcon = toolIcon;
  
  const formatToolName = (name: string) => {
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
  };
  
  const formatArgs = (args: Record<string, unknown>) => {
    return Object.entries(args).map(([key, value]) => ({
      key,
      value,
      icon: key === 'area' ? MapPin : key === 'date' ? CalendarDays : key === 'timeSlot' ? Clock : null,
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
      <div
        className="flex w-full items-center justify-between px-5 py-3 border-b border-primary/5"
      >
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
                Manifested
              </motion.span>
            ) : (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-[9px] font-black text-primary uppercase tracking-widest border border-primary/20"
              >
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                Invoking
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
              Extraction
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {formattedArgs.map(({ key, value, icon: Icon }) => (
              <div 
                key={key}
                className="group relative flex flex-col gap-1 rounded-2xl bg-white/[0.02] border border-white/5 p-3 transition-all hover:bg-white/[0.04] hover:border-primary/20"
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
                Response
              </p>
            </div>
            <div className="relative group">
              <div className="absolute -inset-1 bg-emerald-500/5 blur-lg rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/10 p-4">
                <p className="text-sm font-medium text-emerald-400/90 leading-relaxed italic">
                  "{String(result.result)}"
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function ChatInterface({ chatSession }: { chatSession: ChatSession }) {
  const [localInput, setLocalInput] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Prepare initial messages
  const initialMessages = useMemo((): Message[] => {
    if (!chatSession?.messages) return [];
    return chatSession.messages.map((m): Message => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text" as const, text: m.content }],
    }));
  }, [chatSession]);

  // Initialize chat
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: chatSession.id,
    // @ts-expect-error - Using custom Message type for compatibility
    messages: initialMessages,
  });

  const isSending = status === "streaming" || status === "submitted";

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
    if (!localInput.trim() || isSending) return;

    const text = localInput;
    setLocalInput("");
    
    try {
      console.log("[UI] Sending message to session:", chatSession.id, text);
      await sendMessage({ text });
    } catch (error) {
      console.error("Failed to send message:", error);
      setLocalInput(text);
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      // Update local state
      setMessages(messages.filter(m => m.id !== messageId));
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
      const messageIndex = messages.findIndex(m => m.id === editingMessageId);
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
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-[#050505] overflow-hidden relative selection:bg-primary/30 selection:text-primary-foreground">
      {/* Grain Overlay */}
      <div className="pointer-events-none absolute inset-0 z-50 opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="shrink-0 border-b border-white/5 bg-black/40 px-8 py-5 backdrop-blur-2xl z-20">
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
                <h1 className="text-xl font-bold tracking-tight text-white/90">
                  Tablr <span className="text-primary/80">Concierge</span>
                </h1>
                <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[8px] font-black text-primary uppercase tracking-[0.2em]">
                  Elite
                </span>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.4em] mt-0.5">
                Artisan Intelligence Service
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {status !== "ready" && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 rounded-2xl bg-white/[0.03] border border-white/10 px-4 py-2 text-[10px] font-black text-primary uppercase tracking-widest shadow-2xl"
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
        className="flex-1 overflow-y-auto px-8 py-10 scroll-smooth pb-40 custom-scrollbar"
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
                <div className="relative">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-8 border border-primary/5 rounded-full"
                  />
                  <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-12 border border-primary/5 rounded-full border-dashed"
                  />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/5 text-primary border border-primary/10 backdrop-blur-sm">
                    <Sparkles className="h-10 w-10" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-black tracking-tight text-white/90">
                    Your Personal <span className="text-primary italic">Maître D'</span>
                  </h2>
                  <p className="mx-auto max-w-md text-sm font-medium text-muted-foreground/60 leading-relaxed">
                    I orchestrate social dining experiences that transcend the ordinary. 
                    Where shall we curate your next masterpiece?
                  </p>
                </div>
                
                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 mt-8">
                  {[
                    "Find a romantic spot in Indiranagar",
                    "Best sushi for a group of six",
                    "Italian places with outdoor seating",
                    "Quiet spots for a business dinner"
                  ].map((suggestion, i) => (
                    <motion.button
                      key={suggestion}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => setLocalInput(suggestion)}
                      className="group relative flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.01] p-5 text-left transition-all hover:bg-white/[0.03] hover:border-primary/30"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors border border-primary/10">
                        <Sparkle className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors tracking-tight">{suggestion}</span>
                      <ArrowRight className="absolute right-5 h-4 w-4 text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {messages.map((message, i) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              className={cn(
                "group/msg flex w-full relative",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "flex max-w-[85%] items-start gap-4",
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              )}>
                {/* Avatar / Role Indicator */}
                <div className={cn(
                  "mt-1 shrink-0 flex h-8 w-8 items-center justify-center rounded-xl border transition-all",
                  message.role === "user" 
                    ? "bg-primary/10 border-primary/20 text-primary" 
                    : "bg-white/5 border-white/10 text-white/40"
                )}>
                  {message.role === "user" ? <Command className="h-4 w-4" /> : <ChefHat className="h-4 w-4" />}
                </div>

                <div
                  className={cn(
                    "relative group/bubble",
                    message.role === "user" ? "w-full" : "w-full"
                  )}
                >
                  <div className={cn(
                    "relative rounded-3xl text-sm leading-snug overflow-hidden transition-all",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground shadow-xl shadow-primary/10 font-medium"
                      : "border border-white/5 bg-white/[0.02] backdrop-blur-xl"
                  )}>
                    {editingMessageId === message.id ? (
                      <div className="flex flex-col gap-4 min-w-[280px] p-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none text-white/90 font-medium"
                          autoFocus
                          rows={3}
                        />
                        <div className="flex justify-end gap-2 border-t border-white/5 pt-3">
                          <button 
                            onClick={cancelEdit}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 transition-colors"
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
                          <div className={cn(
                            "px-6 py-3.5",
                            message.role === "assistant" ? "text-white/80 font-medium tracking-tight text-base" : "text-primary-foreground"
                          )}>
                            {getMessageText(message)}
                          </div>
                        )}
                        
                        {/* Tool Calls (for assistant messages) */}
                        {message.role === "assistant" && (() => {
                          const toolCalls = getToolCalls(message);
                          const toolResults = getToolResults(message);
                          return toolCalls.length > 0 ? (
                            <div className="px-5 pb-5">
                              {toolCalls.map((toolCall) => {
                                const result = toolResults.find(r => r.toolCallId === toolCall.toolCallId);
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
                        {message.role === "assistant" && !getMessageText(message) && (() => {
                          const toolResults = getToolResults(message);
                          const toolCalls = getToolCalls(message);
                          // Show if we have tool results but no text and NO tool calls (unusual but possible)
                          if (toolResults.length > 0 && toolResults[0].result && toolCalls.length === 0) {
                            return (
                              <div className="px-7 py-5 border-t border-white/5 bg-emerald-500/5">
                                <p className="text-emerald-400/90 italic">"{String(toolResults[0].result)}"</p>
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
                    <div className={cn(
                      "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/bubble:opacity-100 transition-all duration-300",
                      message.role === "user" ? "-left-12 pr-2" : "-right-12 pl-2"
                    )}>
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === message.id ? null : message.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/5 text-muted-foreground/30 hover:text-primary transition-all hover:scale-110"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      
                      {activeMenuId === message.id && (
                        <div className={cn(
                          "absolute z-30 min-w-[140px] rounded-2xl border border-white/10 bg-black/90 p-1.5 shadow-2xl backdrop-blur-3xl animate-in zoom-in-95 duration-200",
                          message.role === "user" ? "right-full mr-2 top-0" : "left-full ml-2 top-0"
                        )}>
                          {message.role === "user" && (
                            <button 
                              onClick={() => startEdit(message)}
                              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/5 hover:text-primary transition-all"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Edit Ritual
                            </button>
                          )}
                          <button 
                            onClick={() => handleDelete(message.id)}
                            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-destructive/60 hover:bg-destructive/10 hover:text-destructive transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Expunge
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
                System Fault: {error.message || "Concierge Disconnected"}
              </div>
            </motion.div>
          )}
          
          {isSending && !messages.some(m => m.role === 'assistant' && (getMessageText(m) || getToolCalls(m).length > 0)) && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-center gap-4 rounded-3xl border border-white/5 bg-white/[0.02] px-6 py-3 backdrop-blur-xl">
                <div className="flex gap-2">
                  <motion.span 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
                    className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
                  />
                  <motion.span 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                    className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
                  />
                  <motion.span 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
                    className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
                  />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                  Synthesizing
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black via-black/90 to-transparent pt-20 pb-8 px-8">
        <div className="mx-auto max-w-3xl mb-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setLocalInput(suggestion);
                  // Use setTimeout to ensure localInput state is updated before submit
                  setTimeout(() => {
                    const form = document.querySelector('form');
                    if (form) form.requestSubmit();
                  }, 0);
                }}
                className="rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all active:scale-95"
              >
                {suggestion}
              </button>
            ))}
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
                className="w-full rounded-[2rem] border border-white/10 bg-black/60 py-5 pl-8 pr-16 text-base font-medium transition-all focus:border-primary/40 focus:outline-none focus:ring-0 placeholder:text-white/10 text-white/90 backdrop-blur-3xl"
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
            <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.5em]">
              Tablr <span className="text-primary/20">Aether</span> v6.0.4
            </p>
            <div className="h-px w-8 bg-white/5" />
            <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.5em]">
              Encrypted Session
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewDinnerPage() {
  // 1. Get or create chat session
  const { data: chatData, isLoading: isChatLoading } = useQuery({
    queryKey: ["chat-session"],
    queryFn: () => getOrCreateChat(),
  });

  if (isChatLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-[#050505] relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="relative">
            <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full animate-pulse" />
            <ChefHat className="h-12 w-12 text-primary animate-bounce" />
          </div>
          <div className="space-y-2 text-center">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.5em] animate-pulse">
              Summoning Concierge
            </p>
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary/30 to-transparent mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!chatData) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-[#050505]">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-8 py-6 text-center backdrop-blur-xl">
          <p className="text-sm font-bold text-destructive uppercase tracking-widest mb-2">Manifestation Failed</p>
          <p className="text-xs text-destructive/60">The culinary spirits are silent. Please refresh.</p>
        </div>
      </div>
    );
  }

  return <ChatInterface chatSession={chatData as ChatSession} />;
}
