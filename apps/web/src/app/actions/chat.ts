"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@tablr/database";

export async function getOrCreateChat() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // For now, we just use one main chat per user
  // In the future, this could be extended to multiple conversations
  let chat = await prisma.chat.findFirst({
    where: { profileId: userId },
    include: { 
      messages: { 
        where: { hidden: false },
        orderBy: { createdAt: "asc" } 
      } 
    },
    orderBy: { createdAt: "desc" },
  });

  if (!chat) {
    chat = await prisma.chat.create({
      data: {
        profileId: userId,
        title: "Main Conversation",
      },
      include: { 
        messages: {
          where: { hidden: false }
        }
      },
    });
  }

  return chat;
}

export async function deleteMessage(messageId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return await prisma.message.update({
    where: { id: messageId, profileId: userId },
    data: { hidden: true },
  });
}

export async function hideSubsequentMessages(messageId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const targetMessage = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!targetMessage || !targetMessage.chatId) return;

  // Mark this message and all messages created after it in the same chat as hidden
  return await prisma.message.updateMany({
    where: {
      chatId: targetMessage.chatId,
      createdAt: { gte: targetMessage.createdAt },
      profileId: userId,
    },
    data: { hidden: true },
  });
}

export async function getChatMessages(chatId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const messages = await prisma.message.findMany({
    where: { chatId, hidden: false },
    orderBy: { createdAt: "asc" },
  });

  return messages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
    createdAt: m.createdAt,
  }));
}
