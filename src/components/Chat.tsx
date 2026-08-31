import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, Lock } from 'lucide-react';
import type { ChatMessage } from '../types';
import { REACTION_EMOJIS } from '../lib/reactions';

const MAX_CHAT_LENGTH = 500;

interface ChatProps {
  currentUser: string;
  messages: ChatMessage[];
  /** View-only mode: renders the transcript with no composer (match history). */
  readOnly?: boolean;
  /** Composer is shown but locked, e.g. once the match has ended. */
  locked?: boolean;
  lockedLabel?: string;
  emptyLabel?: string;
  className?: string;
  onSend?: (text: string) => void;
  /**
   * Quick-reaction emojis rendered above the composer. Omitted in read-only
   * mode, where there is nothing to react to any more.
   */
  reactionEmojis?: string[];
  reactionsDisabled?: boolean;
  onSendReaction?: (emoji: string) => void;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Chat({
  currentUser,
  messages,
  readOnly = false,
  locked = false,
  lockedLabel = 'This match has ended.',
  emptyLabel = 'No messages yet.',
  className = '',
  onSend,
  reactionEmojis,
  reactionsDisabled = false,
  onSendReaction,
}: ChatProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pin to the newest message as the conversation grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const canSend = !readOnly && !locked && draft.trim().length > 0;
  const hasReactions = !readOnly && !!reactionEmojis?.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    onSend?.(draft.trim());
    setDraft('');
  };

  return (
    <div
      className={`flex flex-col bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg shadow-zinc-900/5 dark:shadow-black/20 rounded-2xl overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-zinc-200/60 dark:border-white/10">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          <h2 className="font-semibold text-zinc-900 dark:text-white">Chat</h2>
        </div>
        {readOnly && (
          <span className="flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
            <Lock className="w-3 h-3" />
            View only
          </span>
        )}
      </div>

      <div ref={scrollRef} className="chat-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 space-y-2">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-sm text-zinc-500 py-6">
            <p>{emptyLabel}</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => {
              const mine = message.from === currentUser;
              // Reactions arrive as ordinary messages; they read better as a
              // bare emoji than inside a chat bubble.
              const isReaction = REACTION_EMOJIS.includes(message.text.trim());
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
                >
                  {!mine && (
                    <span className="text-xs font-medium text-zinc-500 mb-0.5 px-1">{message.from}</span>
                  )}
                  <div
                    className={
                      isReaction
                        ? 'text-3xl leading-none px-1 py-0.5'
                        : `max-w-[85%] px-3 py-2 rounded-xl text-sm break-words whitespace-pre-wrap ${
                            mine
                              ? 'bg-indigo-600 text-white rounded-br-sm'
                              : 'bg-zinc-100/80 dark:bg-zinc-800/70 text-zinc-900 dark:text-zinc-100 rounded-bl-sm'
                          }`
                    }
                  >
                    {message.text}
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5 px-1">
                    {formatTime(message.createdAt)}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {hasReactions && (
        <div className="flex justify-between items-center gap-0.5 px-3 pt-2 border-t border-zinc-200/60 dark:border-white/10">
          {reactionEmojis!.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSendReaction?.(emoji)}
              disabled={reactionsDisabled}
              className="text-2xl w-9 h-9 flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={`Send ${emoji} reaction`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {!readOnly && (
        <form
          onSubmit={handleSubmit}
          className={`flex items-center gap-2 px-3 pb-3 pt-2 ${
            hasReactions ? '' : 'border-t border-zinc-200/60 dark:border-white/10'
          }`}
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_CHAT_LENGTH))}
            disabled={locked}
            maxLength={MAX_CHAT_LENGTH}
            placeholder={locked ? lockedLabel : 'Type a message...'}
            aria-label="Chat message"
            className="flex-1 min-w-0 bg-white/70 dark:bg-zinc-950/50 border border-zinc-200/70 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl transition-colors disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-500 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}
