import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useChat } from '../context/ChatContext.jsx';
import { sendChatMessage } from '../utils/api.js';
import PlanCard from './PlanCard.jsx';

const SUGGESTIONS = [
  'What should we do tonight?',
  'Find a good restaurant nearby',
  'Best time to visit main sights?',
  'What should I pack today?',
];

// Parse tripId / dayId from the current pathname
function useRouteContext() {
  const { pathname } = useLocation();
  const match = pathname.match(/\/trips\/([^/]+)(?:\/days\/([^/]+))?/);
  return { tripId: match?.[1] || null, dayId: match?.[2] || null };
}

function Message({ msg, msgIndex, tripId }) {
  const isUser = msg.role === 'user';
  const { updateMessage } = useChat();

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm shrink-0 mr-2 mt-0.5">
          🧙
        </div>
      )}
      <div className={`max-w-[82%] ${isUser ? '' : 'w-full'}`}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-white border border-slate-100 text-slate-800 shadow-sm rounded-bl-sm'
          }`}
        >
          {msg.content}
          {msg.isMock && (
            <p className="text-xs mt-1.5 opacity-60">⚠️ Demo — add Gemini API key for real AI</p>
          )}
          {msg.rateLimited && (
            <p className="text-xs mt-1.5 opacity-60">⏳ Rate limited — try again shortly</p>
          )}
        </div>

        {/* Multiple plan suggestions (new format) */}
        {!isUser && msg.plans?.length > 0 && (
          <div className="mt-1 space-y-1">
            <p className="text-xs text-slate-400 px-1 mt-2">Choose a plan to add to your itinerary:</p>
            {msg.plans.map((item, idx) => (
              <PlanCard
                key={idx}
                plan={item.plan}
                label={item.label}
                colorIndex={idx}
                tripId={tripId}
                messageIndex={msgIndex}
                onApproved={() => {}} // each card is independent — no dismissing others
              />
            ))}
          </div>
        )}

        {/* Single plan (legacy format) */}
        {!isUser && msg.plan && !msg.plans && (
          <PlanCard
            plan={msg.plan}
            tripId={tripId}
            messageIndex={msgIndex}
            onApproved={() => updateMessage(msgIndex, { planApproved: true })}
            onDismissed={() => updateMessage(msgIndex, { planDismissed: true })}
          />
        )}
      </div>
    </div>
  );
}

// Subtle separator showing context change
function ContextBadge({ label }) {
  return (
    <div className="flex items-center gap-2 my-3">
      <div className="flex-1 h-px bg-slate-100" />
      <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{label}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

export default function FloatingChat() {
  const { messages, addMessage, isOpen, openChat, closeChat, unread } = useChat();
  const { tripId, dayId } = useRouteContext();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Track previous context to show a separator on navigation
  const prevContext = useRef({ tripId, dayId });
  const [contextLabel, setContextLabel] = useState(null);

  useEffect(() => {
    const prev = prevContext.current;
    if (messages.length > 1 && (prev.tripId !== tripId || prev.dayId !== dayId)) {
      if (dayId) {
        setContextLabel('📅 Switched to a new day');
      } else if (tripId) {
        setContextLabel('✈️ Viewing trip overview');
      } else {
        setContextLabel('🏠 Back to home');
      }
    }
    prevContext.current = { tripId, dayId };
  }, [tripId, dayId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setContextLabel(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const send = async (text) => {
    if (!text.trim() || loading) return;

    const userMsg = { role: 'user', content: text.trim() };
    addMessage(userMsg);
    setInput('');
    setLoading(true);

    // Build the messages array to send, skipping only the very first greeting
    const allMessages = [...messages, userMsg];
    const apiMessages = allMessages.filter(
      (m, i) => !(i === 0 && m.role === 'assistant')
    );

    try {
      const result = await sendChatMessage({ messages: apiMessages, tripId, dayId });
      addMessage({
        role: 'assistant',
        content: result.content,
        plan: result.plan || null,
        plans: result.plans || null,   // multi-plan array
        isMock: result.isMock,
        rateLimited: result.rateLimited,
      });
    } catch (err) {
      addMessage({ role: 'assistant', content: '❌ Error: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  const showSuggestions = messages.length <= 2;

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={openChat}
          className="fixed bottom-5 right-5 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-all hover:scale-105 active:scale-95"
          title="Open Trip Wizard assistant"
        >
          🧙
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-5rem)] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-blue-700">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-lg">🧙</div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-white">Trip Wizard</p>
              <p className="text-xs text-blue-200">
                {dayId ? 'Day assistant' : tripId ? 'Trip assistant' : 'Travel assistant'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full" title="Connected" />
              <button
                onClick={closeChat}
                className="text-white/70 hover:text-white text-lg leading-none transition"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Context indicator */}
          {(tripId || dayId) && (
            <div className="px-4 py-1.5 bg-blue-50 border-b border-blue-100">
              <p className="text-xs text-blue-600">
                {dayId ? '📅 Context: current day loaded' : '✈️ Context: trip overview'}
              </p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto chat-scroll px-3 pt-3">
            {messages.map((msg, i) => (
              <Message key={i} msg={msg} msgIndex={i} tripId={tripId} />
            ))}
            {contextLabel && <ContextBadge label={contextLabel} />}
            {loading && (
              <div className="flex justify-start mb-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm shrink-0 mr-2">🧙</div>
                <div className="bg-white border border-slate-100 shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {showSuggestions && (
            <div className="px-3 py-2 flex gap-1.5 overflow-x-auto border-t border-slate-50">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="shrink-0 text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition font-medium"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex gap-2 px-3 py-3 border-t border-slate-100"
          >
            <input
              ref={inputRef}
              className="input flex-1 text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your trip…"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="btn-primary shrink-0 px-3"
            >
              ↑
            </button>
          </form>
        </div>
      )}
    </>
  );
}
