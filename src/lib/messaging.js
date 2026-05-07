import { supabase } from "./supabase";

const DIRECTORY_CACHE_TTL_MS = 60 * 1000;
let directoryCache = null;
let directoryCacheFetchedAt = 0;
let directoryCachePromise = null;

export function buildThreadId(userAId, userBId) {
  return [String(userAId || ""), String(userBId || "")]
    .filter(Boolean)
    .sort()
    .join("__");
}

function normalizeMessage(row) {
  const senderRelation = Array.isArray(row.sender) ? row.sender[0] || null : row.sender || null;
  const recipientRelation = Array.isArray(row.recipient) ? row.recipient[0] || null : row.recipient || null;

  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    senderName:
      senderRelation?.display_name ||
      senderRelation?.email ||
      row.sender_email ||
      "User",
    senderEmail: senderRelation?.email || row.sender_email || "",
    recipientId: row.recipient_id,
    recipientName:
      recipientRelation?.display_name ||
      recipientRelation?.email ||
      row.recipient_email ||
      "User",
    recipientEmail: recipientRelation?.email || row.recipient_email || "",
    body: row.body,
    createdAt: row.created_at,
    deliveredAt: row.delivered_at,
    readAt: row.read_at,
  };
}

async function fetchMessagingDirectory({ force = false } = {}) {
  const now = Date.now();
  if (!force && directoryCache && now - directoryCacheFetchedAt < DIRECTORY_CACHE_TTL_MS) {
    return directoryCache;
  }

  if (!force && directoryCachePromise) {
    return directoryCachePromise;
  }

  directoryCachePromise = supabase.rpc("list_message_contacts").then(({ data, error }) => {
    if (error) {
      throw error;
    }

    directoryCache = Array.isArray(data) ? data : [];
    directoryCacheFetchedAt = Date.now();
    return directoryCache;
  }).finally(() => {
    directoryCachePromise = null;
  });

  return directoryCachePromise;
}

export async function fetchMessagingContacts(currentUserId) {
  const rows = await fetchMessagingDirectory();
  return rows.filter((user) => String(user.id) !== String(currentUserId));
}

export async function fetchThreadsForUser(userId) {
  const normalizedUserId = String(userId || "");
  if (!normalizedUserId) {
    return [];
  }

  const { data, error } = await supabase
    .from("direct_messages")
    .select(`
      id,
      thread_id,
      sender_id,
      recipient_id,
      body,
      created_at,
      delivered_at,
      read_at,
      sender:users!direct_messages_sender_id_fkey(id, display_name, email),
      recipient:users!direct_messages_recipient_id_fkey(id, display_name, email)
    `)
    .or(`sender_id.eq.${normalizedUserId},recipient_id.eq.${normalizedUserId}`)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const grouped = new Map();
  const directoryRows = await fetchMessagingDirectory();
  const directory = new Map(directoryRows.map((user) => [String(user.id), user]));

  (data || []).map(normalizeMessage).map((message) => {
    const senderContact = directory.get(String(message.senderId));
    const recipientContact = directory.get(String(message.recipientId));

    return {
      ...message,
      senderName:
        senderContact?.display_name ||
        senderContact?.email ||
        message.senderName,
      senderEmail:
        senderContact?.email ||
        message.senderEmail,
      recipientName:
        recipientContact?.display_name ||
        recipientContact?.email ||
        message.recipientName,
      recipientEmail:
        recipientContact?.email ||
        message.recipientEmail,
    };
  }).forEach((message) => {
    if (!grouped.has(message.threadId)) {
      grouped.set(message.threadId, []);
    }
    grouped.get(message.threadId).push(message);
  });

  return Array.from(grouped.entries())
    .map(([threadId, threadMessages]) => {
      const orderedMessages = threadMessages
        .slice()
        .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
      const lastMessage = orderedMessages[orderedMessages.length - 1];
      const participant =
        String(lastMessage.senderId) === normalizedUserId
          ? {
              id: lastMessage.recipientId,
              display_name: lastMessage.recipientName,
              email: lastMessage.recipientEmail,
            }
          : {
              id: lastMessage.senderId,
              display_name: lastMessage.senderName,
              email: lastMessage.senderEmail,
            };
      const unreadCount = orderedMessages.filter(
        (message) => String(message.recipientId) === normalizedUserId && !message.readAt
      ).length;

      return {
        id: threadId,
        participant,
        messages: orderedMessages,
        unreadCount,
        lastMessageAt: lastMessage.createdAt,
        lastMessagePreview: lastMessage.body,
      };
    })
    .sort((left, right) => new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime());
}

export async function sendDirectMessage({ sender, recipient, body }) {
  const trimmedBody = String(body || "").trim();
  if (!sender?.id || !recipient?.id || !trimmedBody) {
    throw new Error("Sender, recipient, and message body are required.");
  }

  const payload = {
    thread_id: buildThreadId(sender.id, recipient.id),
    sender_id: sender.id,
    recipient_id: recipient.id,
    body: trimmedBody,
  };

  const { data, error } = await supabase
    .from("direct_messages")
    .insert([payload])
    .select(`
      id,
      thread_id,
      sender_id,
      recipient_id,
      body,
      created_at,
      delivered_at,
      read_at,
      sender:users!direct_messages_sender_id_fkey(id, display_name, email),
      recipient:users!direct_messages_recipient_id_fkey(id, display_name, email)
    `)
    .single();

  if (error) {
    throw error;
  }

  return normalizeMessage(data);
}

export async function markThreadAsRead(userId, threadId) {
  const normalizedUserId = String(userId || "");
  const normalizedThreadId = String(threadId || "");
  if (!normalizedUserId || !normalizedThreadId) {
    return;
  }

  const { error } = await supabase
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_id", normalizedThreadId)
    .eq("recipient_id", normalizedUserId)
    .is("read_at", null);

  if (error) {
    throw error;
  }
}

export async function markMessagesAsDelivered(userId, messageIds) {
  const normalizedUserId = String(userId || "");
  const normalizedMessageIds = Array.isArray(messageIds)
    ? messageIds
        .map((messageId) => Number(messageId))
        .filter((messageId) => Number.isFinite(messageId))
    : [];

  if (!normalizedUserId || normalizedMessageIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("direct_messages")
    .update({ delivered_at: new Date().toISOString() })
    .eq("recipient_id", normalizedUserId)
    .is("delivered_at", null)
    .in("id", normalizedMessageIds);

  if (error) {
    throw error;
  }
}

export function subscribeToUserMessages(userId, onChange) {
  const normalizedUserId = String(userId || "");
  if (!normalizedUserId) {
    return null;
  }

  const channel = supabase
    .channel(`direct-messages-${normalizedUserId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "direct_messages",
        filter: `recipient_id=eq.${normalizedUserId}`,
      },
      onChange
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "direct_messages",
        filter: `sender_id=eq.${normalizedUserId}`,
      },
      onChange
    )
    .subscribe();

  return channel;
}

export function subscribeToWorkspacePresence(currentUser, onChange) {
  const normalizedUserId = String(currentUser?.id || "");
  if (!normalizedUserId) {
    return null;
  }

  const channel = supabase.channel("workspace-presence", {
    config: {
      presence: {
        key: normalizedUserId,
      },
    },
  });

  const emitPresenceState = () => {
    const state = channel.presenceState();
    const nextPresence = {};

    Object.entries(state).forEach(([userId, entries]) => {
      if (!Array.isArray(entries) || entries.length === 0) {
        return;
      }

      const latestEntry = entries[entries.length - 1] || {};
      nextPresence[String(userId)] = {
        userId: String(userId),
        displayName: latestEntry.display_name || latestEntry.displayName || "",
        email: latestEntry.email || "",
        onlineAt: latestEntry.online_at || latestEntry.onlineAt || null,
        isOnline: true,
      };
    });

    onChange(nextPresence);
  };

  channel
    .on("presence", { event: "sync" }, emitPresenceState)
    .on("presence", { event: "join" }, emitPresenceState)
    .on("presence", { event: "leave" }, emitPresenceState)
    .subscribe(async (status) => {
      if (status !== "SUBSCRIBED") {
        return;
      }

      await channel.track({
        user_id: normalizedUserId,
        display_name: currentUser?.display_name || currentUser?.displayName || "",
        email: currentUser?.email || "",
        online_at: new Date().toISOString(),
      });
    });

  return channel;
}
