import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../utils/api.js';

const SUGGESTIONS = [
  'What should we do tonight?',
  'Find a good restaurant nearby',
  'Is the weather good for outdoor activities?',
  'Suggest the best time to visit the main sights',
  'What should I pack for today?',
];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm shrink-0 mr-2 mt-0.5">
          🧙
        </div>
      )}
      <div
        className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white border border-slate-100 text-slate-800 shadow-sm rounded-bl-sm'
        }`}
      >
        {msg.content}
        {msg.isMock && (
          <p className="text-xs mt-1.5 opacity-60">⚠️ Demo — add Anthropic API key for real AI</p>
        )}
      </div>
    </div>
  );
}

export default function ChatAssistant({ tripId, dayId }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your Trip Wizard assistant 🧙 I know your itinerary for today. Ask me anything — restaurant recommendations, activity suggestions, weather tips, or schedule help!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    if (!text.trim() || loading) return;

    const userMsg = { role: 'user', content: text.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const result = await sendChatMessage({
        messages: nextMessages.filter((m) => m.role !== 'assistant' || nextMessages.indexOf(m) > 0), // skip system greeting for API
        tripId,
        dayId,
      });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.content, isMock: result.isMock },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '❌ Error: ' + err.message },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="card flex flex-col h-[520px]">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white">🧙</div>
        <div>
          <p className="font-semibold text-sm text-slate-800">Day Assistant</p>
          <p className="text-xs text-slate-400">Powered by Gemini</p>
        </div>
        <div className="ml-auto w-2 h-2 bg-green-400 rounded-full" title="Connected" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-scroll pr-1">
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm shrink-0 mr-2">🧙</div>
            <div className="bg-white border border-slate-100 shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div className="mt-2 mb-2 flex gap-2 overflow-x-auto pb-1">
          {SUGGESTIONS.slice(0, 3).map((s) => (
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
      <form onSubmit={handleSubmit} className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
        <input
          className="input flex-1 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your day..."
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
  );
}
