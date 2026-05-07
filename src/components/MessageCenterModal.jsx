import React, { useEffect, useMemo, useState } from "react";

function formatMessageDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getPresenceMeta(userId, presenceByUserId) {
  const entry = presenceByUserId?.[String(userId)];
  return {
    isOnline: Boolean(entry?.isOnline),
    label: entry?.isOnline ? "Online" : "Offline",
  };
}

function HeaderIcon({ expanded = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {expanded ? (
        <>
          <path d="M9 15H5v4" />
          <path d="M15 9h4V5" />
          <path d="M5 19l5-5" />
          <path d="M19 5l-5 5" />
        </>
      ) : (
        <>
          <path d="M15 3h6v6" />
          <path d="M9 21H3v-6" />
          <path d="M21 3l-7 7" />
          <path d="M3 21l7-7" />
        </>
      )}
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12" />
      <path d="M18 6l-12 12" />
    </svg>
  );
}

export default function MessageCenterModal({
  open,
  currentUser,
  contacts,
  contactsLoading,
  presenceByUserId,
  threads,
  threadsLoading,
  selectedThreadId,
  onClose,
  onSelectThread,
  onSendMessage,
}) {
  const [composeMode, setComposeMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [draft, setDraft] = useState("");

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [selectedThreadId, threads]
  );

  useEffect(() => {
    if (!open) {
      setComposeMode(false);
      setFullscreen(false);
      setRecipientId("");
      setDraft("");
      return;
    }

    if (selectedThread) {
      setComposeMode(false);
    }
  }, [open, selectedThread]);

  useEffect(() => {
    if (!composeMode || recipientId || contacts.length === 0) {
      return;
    }

    setRecipientId(String(contacts[0].id));
  }, [composeMode, contacts, recipientId]);

  if (!open) {
    return null;
  }

  const selectedPresence = getPresenceMeta(selectedThread?.participant?.id, presenceByUserId);

  const handleStartCompose = () => {
    setComposeMode(true);
    setDraft("");
    setRecipientId((currentRecipientId) => currentRecipientId || String(contacts[0]?.id || ""));
  };

  const handleSubmit = () => {
    const trimmedDraft = draft.trim();
    if (!trimmedDraft) {
      return;
    }

    const nextRecipientId = composeMode
      ? recipientId
      : selectedThread?.participant?.id;

    if (!nextRecipientId) {
      return;
    }

    onSendMessage(nextRecipientId, trimmedDraft);
    setDraft("");
    setComposeMode(false);
  };

  return (
    <div className="messageCenterOverlay" role="presentation" onClick={onClose}>
      <div
        className={`messageCenterDialog${fullscreen ? " fullscreen" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Messages"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="messageCenterSidebar">
          <div className="messageCenterSidebarHeader">
            <div>
              <div className="messageCenterEyebrow">Workspace Messaging</div>
              <h2>Messages</h2>
            </div>
            <button type="button" className="messageCenterComposeBtn" onClick={handleStartCompose}>
              New Message
            </button>
          </div>

          <div className="messageThreadList">
            {threads.length ? (
              threads.map((thread) => (
                (() => {
                  const presence = getPresenceMeta(thread.participant?.id, presenceByUserId);

                  return (
                    <button
                      key={thread.id}
                      type="button"
                      className={`messageThreadItem${selectedThreadId === thread.id && !composeMode ? " active" : ""}`}
                      onClick={() => {
                        setComposeMode(false);
                        onSelectThread(thread.id);
                      }}
                    >
                      <div className="messageThreadHeader">
                        <span className="messageThreadIdentity">
                          <span className={`messagePresenceDot${presence.isOnline ? " online" : ""}`} aria-hidden="true" />
                          <span className="messageThreadName">{thread.participant?.display_name || thread.participant?.email || "User"}</span>
                        </span>
                        {thread.unreadCount ? <span className="messageThreadUnread">{thread.unreadCount}</span> : null}
                      </div>
                      <div className="messageThreadStatus">{presence.label}</div>
                      <div className="messageThreadMeta">
                        <span className="messageThreadPreview">{thread.lastMessagePreview}</span>
                        <span className="messageThreadTime">{formatMessageDate(thread.lastMessageAt)}</span>
                      </div>
                    </button>
                  );
                })()
              ))
            ) : threadsLoading ? (
              <div className="messageThreadEmpty">
                <strong>Loading messages...</strong>
                <span>Please wait while your conversations are synced.</span>
              </div>
            ) : (
              <div className="messageThreadEmpty">
                <strong>No messages yet.</strong>
                <span>Start a new conversation with another user.</span>
              </div>
            )}
          </div>
        </div>

        <div className="messageCenterContent">
          <div className="messageCenterTopbar">
            <div>
              <div className="messageCenterTitle">
                {composeMode
                  ? "Compose Message"
                  : selectedThread?.participant?.display_name || selectedThread?.participant?.email || "Messages"}
              </div>
              <div className="messageCenterSubtitle">
                {composeMode
                  ? "Send a direct message to another workspace user."
                  : (
                    <>
                      <span>{selectedThread?.participant?.email || currentUser?.email || ""}</span>
                      {selectedThread ? (
                        <span className={`messagePresenceBadge${selectedPresence.isOnline ? " online" : ""}`}>
                          <span className={`messagePresenceDot${selectedPresence.isOnline ? " online" : ""}`} aria-hidden="true" />
                          {selectedPresence.label}
                        </span>
                      ) : null}
                    </>
                  )}
              </div>
            </div>
            <div className="messageCenterHeaderActions">
              <button
                type="button"
                className="messageCenterClose"
                onClick={() => setFullscreen((current) => !current)}
                aria-label={fullscreen ? "Exit fullscreen" : "Open fullscreen"}
              >
                <HeaderIcon expanded={fullscreen} />
              </button>
              <button type="button" className="messageCenterClose" onClick={onClose} aria-label="Close messages">
                <CloseIcon />
              </button>
            </div>
          </div>

          <div className="messageCenterConversation">
            {composeMode ? (
              <div className="messageComposePanel">
                <label className="messageField">
                  <span>Recipient</span>
                  <select
                    className="messageSelect"
                    value={recipientId}
                    onChange={(event) => setRecipientId(event.target.value)}
                    disabled={contactsLoading || contacts.length === 0}
                  >
                    {contacts.length ? (
                      contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.display_name
                            ? `${contact.display_name} (${contact.email || "No email"})${getPresenceMeta(contact.id, presenceByUserId).isOnline ? " - Online" : ""}`
                            : contact.email || "Unknown user"}
                        </option>
                      ))
                    ) : (
                      <option value="">{contactsLoading ? "Loading users..." : "No users available"}</option>
                    )}
                  </select>
                </label>
              </div>
            ) : selectedThread ? (
              <div className="messageBubbleList">
                {selectedThread.messages.map((message) => {
                  const isCurrentUser = String(message.senderId) === String(currentUser?.id);

                  return (
                    <div
                      key={message.id}
                      className={`messageBubbleRow${isCurrentUser ? " mine" : ""}`}
                    >
                      <div className={`messageBubble${isCurrentUser ? " mine" : ""}`}>
                        <div className="messageBubbleAuthor">
                          {isCurrentUser ? "You" : message.senderName || message.senderEmail || "User"}
                        </div>
                        <div className="messageBubbleText">{message.body}</div>
                        <div className="messageBubbleTime">{formatMessageDate(message.createdAt)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="messageConversationEmpty">
                <strong>Select a thread to continue.</strong>
                <span>Or start a new message from the left panel.</span>
              </div>
            )}
          </div>

          <div className="messageComposer">
            <textarea
              className="messageTextarea"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                composeMode
                  ? "Write your message..."
                  : selectedThread
                    ? `Reply to ${selectedThread.participant?.display_name || selectedThread.participant?.email || "user"}...`
                    : "Select a thread or start a new message..."
              }
              disabled={composeMode ? !recipientId : !selectedThread}
            />
            <div className="messageComposerActions">
              <button
                type="button"
                className="messageSendBtn"
                onClick={handleSubmit}
                disabled={!draft.trim() || (composeMode ? !recipientId : !selectedThread)}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
