import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import {
  getTrip, addDay, deleteDay, getTripMessages, sendTripMessage,
  getJoinRequests, resolveJoinRequest, inviteMember, removeMember,
  setMemberRole, updateTripSettings,
} from '../utils/api.js';
import DayForm from '../components/DayForm.jsx';
import ExplorePanel from '../components/ExplorePanel.jsx';
import PlanCard from '../components/PlanCard.jsx';
import { useChat } from '../context/ChatContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// ── Display name helper ───────────────────────────────────────────────────────
function getDisplayName(member, allMembers) {
  const first = member.first_name || member.name?.split(' ')[0] || 'User';
  const last = member.last_name || member.name?.split(' ').slice(1).join(' ') || '';
  const duplicates = allMembers.filter(
    (m) => (m.first_name || m.name?.split(' ')[0]) === first
  );
  if (duplicates.length > 1 && last) return `${first} ${last[0].toUpperCase()}.`;
  return first;
}

// ── DayRow ────────────────────────────────────────────────────────────────────
function DayRow({ day, tripId, onDelete, canEdit }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/trips/${tripId}/days/${day.id}`)}
      className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-blue-50 transition group cursor-pointer"
    >
      <div className="w-12 h-12 bg-blue-100 rounded-xl flex flex-col items-center justify-center shrink-0">
        <span className="text-xs text-blue-500 font-medium leading-none">
          {format(parseISO(day.date), 'MMM')}
        </span>
        <span className="text-xl font-bold text-blue-700 leading-tight">
          {format(parseISO(day.date), 'd')}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-slate-800">{day.location}</p>
        <div className="flex gap-2 mt-0.5 text-xs text-slate-400">
          {day.accommodation?.name && <span>🏨 {day.accommodation.name}</span>}
          {day.activities?.length > 0 && <span>📍 {day.activities.length} activities</span>}
        </div>
      </div>
      {canEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(day.id); }}
          className="opacity-0 group-hover:opacity-100 transition btn-danger text-xs px-2 py-1.5"
          title="Delete day"
        >
          🗑️
        </button>
      )}
    </div>
  );
}

// ── GroupChat ─────────────────────────────────────────────────────────────────
function GroupChat({ tripId, members, canChat }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    getTripMessages(tripId, 'group').then(setMessages).catch(() => {});
  }, [tripId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const { userMessage } = await sendTripMessage(tripId, text.trim(), 'group');
      setMessages((m) => [...m, userMessage]);
      setText('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const getMsgDisplayName = (m) => {
    const firstName = m.user_first_name || m.user_name?.split(' ')[0] || 'User';
    const lastName = m.user_last_name || m.user_name?.split(' ').slice(1).join(' ') || '';
    const duplicates = messages.filter(
      (msg) => msg.user_id !== null && (msg.user_first_name || msg.user_name?.split(' ')[0]) === firstName && msg.user_id !== m.user_id
    );
    if (duplicates.length > 0 && lastName) return `${firstName} ${lastName[0].toUpperCase()}.`;
    return firstName;
  };

  return (
    <div className="flex flex-col h-[420px]">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-6">No messages yet. Say hello!</p>
        )}
        {messages.map((m) => {
          const isMe = m.user_id === user?.id;
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs rounded-2xl px-3 py-2 text-sm ${
                isMe ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'
              }`}>
                {!isMe && (
                  <p className="text-xs font-medium opacity-70 mb-0.5">{getMsgDisplayName(m)}</p>
                )}
                <p>{m.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {!user ? (
        <p className="text-xs text-slate-400 text-center p-3 border-t border-slate-100">
          <Link to="/login" className="text-blue-500 hover:underline">Sign in</Link> to chat
        </p>
      ) : !canChat ? (
        <p className="text-xs text-slate-400 text-center p-3 border-t border-slate-100">
          🔒 Only admins can send messages in this trip
        </p>
      ) : (
        <form onSubmit={send} className="flex gap-2 p-3 border-t border-slate-100">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}

// ── AiGroupChat ───────────────────────────────────────────────────────────────
function AiGroupChat({ tripId, canChat }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  // session-only plan data keyed by AI message id
  const [sessionPlans, setSessionPlans] = useState({});
  const bottomRef = useRef(null);

  useEffect(() => {
    getTripMessages(tripId, 'ai').then(setMessages).catch(() => {});
  }, [tripId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const result = await sendTripMessage(tripId, text.trim(), 'ai');
      const { userMessage, aiMessage, plan, plans } = result;
      setMessages((m) => [...m, userMessage, aiMessage]);
      if (plan || plans) {
        setSessionPlans((prev) => ({ ...prev, [aiMessage.id]: { plan, plans } }));
      }
      setText('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[520px]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-500 shrink-0">
        <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-base">🧙</div>
        <div>
          <p className="text-sm font-semibold text-white">Trip Wizard AI</p>
          <p className="text-xs text-blue-200">All members can chat with the AI</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="text-4xl">🧙</span>
            <p className="text-slate-500 text-sm font-medium">Ask Trip Wizard anything!</p>
            <p className="text-xs text-slate-400">Plan days, find activities, get travel tips…</p>
          </div>
        )}
        {messages.map((m) => {
          const isUser = !!m.user_id;
          const isMe = m.user_id === user?.id;
          const senderName = m.user_first_name || m.user_name?.split(' ')[0] || 'User';
          const plans = sessionPlans[m.id];

          return (
            <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}>
              {!isUser && (
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm shrink-0 mt-0.5">🧙</div>
              )}
              <div className={`max-w-[80%] ${!isUser ? 'w-full' : ''}`}>
                <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white border border-slate-100 text-slate-800 shadow-sm rounded-bl-sm'
                }`}>
                  {isUser && !isMe && (
                    <p className="text-xs font-semibold opacity-70 mb-0.5">{senderName}</p>
                  )}
                  {m.content}
                </div>

                {/* Multi-plan cards */}
                {!isUser && plans?.plans?.length > 0 && (
                  <div className="mt-1 space-y-1">
                    <p className="text-xs text-slate-400 px-1 mt-2">Choose a plan to add to your itinerary:</p>
                    {plans.plans.map((item, idx) => (
                      <PlanCard
                        key={idx}
                        plan={item.plan}
                        label={item.label}
                        colorIndex={idx}
                        tripId={tripId}
                        messageIndex={null}
                        onApproved={() => {}}
                      />
                    ))}
                  </div>
                )}

                {/* Single plan (legacy) */}
                {!isUser && plans?.plan && !plans?.plans && (
                  <PlanCard
                    plan={plans.plan}
                    tripId={tripId}
                    messageIndex={null}
                    onApproved={() => {}}
                    onDismissed={() => setSessionPlans((prev) => { const next = { ...prev }; delete next[m.id]; return next; })}
                  />
                )}
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="flex justify-start gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm shrink-0">🧙</div>
            <div className="bg-white border border-slate-100 shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!user ? (
        <p className="text-xs text-slate-400 text-center p-3 border-t border-slate-100 bg-white">
          <Link to="/login" className="text-blue-500 hover:underline">Sign in</Link> to chat with Trip Wizard
        </p>
      ) : !canChat ? (
        <p className="text-xs text-slate-400 text-center p-3 border-t border-slate-100 bg-white">
          🔒 Only admins can send messages in this trip
        </p>
      ) : (
        <form onSubmit={send} className="flex gap-2 p-3 border-t border-slate-100 bg-white">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask Trip Wizard…"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            ↑
          </button>
        </form>
      )}
    </div>
  );
}

// ── MembersPanel ──────────────────────────────────────────────────────────────
function MembersPanel({ trip, isAdmin, onRefresh }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [togglingEdit, setTogglingEdit] = useState(false);
  const [togglingChat, setTogglingChat] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      getJoinRequests(trip.id).then(setRequests).catch(() => {});
    }
  }, [trip.id, isAdmin]);

  const handleResolve = async (requestId, action) => {
    try {
      await resolveJoinRequest(trip.id, requestId, action);
      setRequests((r) => r.filter((x) => x.id !== requestId));
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await inviteMember(trip.id, inviteEmail.trim());
      setInviteEmail('');
      alert('Invite sent!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to invite');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await removeMember(trip.id, userId);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleSetRole = async (userId, newRole) => {
    try {
      await setMemberRole(trip.id, userId, newRole);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handleToggleEdit = async () => {
    setTogglingEdit(true);
    try {
      await updateTripSettings(trip.id, { membersCanEdit: !trip.membersCanEdit });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    } finally {
      setTogglingEdit(false);
    }
  };

  const handleToggleChat = async () => {
    setTogglingChat(true);
    try {
      await updateTripSettings(trip.id, { membersCanChat: !trip.membersCanChat });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    } finally {
      setTogglingChat(false);
    }
  };

  const pending = requests.filter((r) => r.status === 'pending');
  const members = trip.members || [];

  return (
    <div className="space-y-5">
      {/* Admin toggles */}
      {isAdmin && (
        <div className="space-y-2">
          {/* Members can edit toggle */}
          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800">Members can edit</p>
              <p className="text-xs text-slate-400">Allow members to add days and activities</p>
            </div>
            <button
              onClick={handleToggleEdit}
              disabled={togglingEdit}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                trip.membersCanEdit ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                trip.membersCanEdit ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Members can chat toggle */}
          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800">Members can chat</p>
              <p className="text-xs text-slate-400">Allow members to send messages in both chats</p>
            </div>
            <button
              onClick={handleToggleChat}
              disabled={togglingChat}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                trip.membersCanChat ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                trip.membersCanChat ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      )}

      {/* Members list */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Members</h4>
        <div className="space-y-2">
          {members.map((m) => {
            const displayName = getDisplayName(m, members);
            const isCreator = m.id === trip.creatorId;
            const isSelf = m.id === user?.id;
            return (
              <div key={m.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                    {(m.first_name || m.name || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-800">
                      {displayName}{isSelf ? ' (you)' : ''}
                    </span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      m.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
                    }`}>{isCreator ? 'owner' : m.role}</span>
                  </div>
                </div>
                {isAdmin && !isSelf && !isCreator && (
                  <div className="flex gap-1">
                    {m.role === 'member' ? (
                      <button
                        onClick={() => handleSetRole(m.id, 'admin')}
                        className="text-xs text-purple-600 hover:text-purple-800 px-2 py-1 rounded hover:bg-purple-50"
                      >
                        Make admin
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSetRole(m.id, 'member')}
                        className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100"
                      >
                        Demote
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(m.id)}
                      className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending requests */}
      {isAdmin && pending.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Join Requests ({pending.length})
          </h4>
          <div className="space-y-2">
            {pending.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2">
                <div>
                  <span className="text-sm font-medium text-slate-800">{r.requester_name}</span>
                  <span className="text-xs text-slate-500 ml-1">({r.requester_email})</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolve(r.id, 'accept')}
                    className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleResolve(r.id, 'reject')}
                    className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite by email */}
      {isAdmin && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Invite by Email</h4>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="user@example.com"
              className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={inviting}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Invite
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── TripDetail ────────────────────────────────────────────────────────────────
export default function TripDetail() {
  const { tripId } = useParams();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('itinerary');
  const { tripVersion } = useChat();

  const loadTrip = () => {
    getTrip(tripId).then(setTrip).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTrip();
  }, [tripId, tripVersion]);

  const handleAddDay = async (data) => {
    setSaving(true);
    try {
      const day = await addDay(tripId, data);
      setTrip((t) => ({ ...t, days: [...(t.days || []), day] }));
      setShowForm(false);
    } catch (err) {
      alert('Failed to add day: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDay = async (dayId) => {
    if (!confirm('Remove this day?')) return;
    try {
      await deleteDay(tripId, dayId);
      setTrip((t) => ({ ...t, days: t.days.filter((d) => d.id !== dayId) }));
    } catch (err) {
      alert('Failed to delete day: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-100 rounded w-1/2" />
          <div className="h-4 bg-slate-100 rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (!trip) {
    return <div className="max-w-2xl mx-auto px-4 py-8 text-slate-500">Trip not found.</div>;
  }

  const isMember = user && trip.members?.some((m) => m.id === user.id);
  const isAdmin = user && (trip.creatorId === user.id || trip.members?.some((m) => m.id === user.id && m.role === 'admin'));
  const canEdit = isAdmin || (isMember && trip.membersCanEdit);
  const canChat = isAdmin || (isMember && trip.membersCanChat);

  const start = parseISO(trip.startDate);
  const end = parseISO(trip.endDate);
  const allDays = eachDayOfInterval({ start, end });
  const loggedDates = new Set((trip.days || []).map((d) => d.date));
  const sortedDays = [...(trip.days || [])].sort((a, b) => a.date.localeCompare(b.date));

  const mostRecentDay = sortedDays.length > 0 ? sortedDays[sortedDays.length - 1] : null;
  const exploreLocation = mostRecentDay?.location || trip.destination;

  const TABS = [
    { id: 'itinerary', label: '📋 Itinerary' },
    { id: 'explore', label: '📍 Explore' },
    { id: 'group chat', label: '💬 Group Chat' },
    { id: 'ai chat', label: '🧙 AI Chat' },
    { id: 'members', label: '👥 Members' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-start gap-3">
          <div className="text-4xl">✈️</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-800">{trip.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                trip.visibility === 'public' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
              }`}>{trip.visibility}</span>
            </div>
            <p className="text-blue-600 font-medium">{trip.destination}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 mt-2">
              <span>📅 {format(start, 'MMM d')} – {format(end, 'MMM d, yyyy')}</span>
              <span>🗓️ {allDays.length} days</span>
              {trip.travelers?.length > 0 && <span>👥 {trip.travelers.join(', ')}</span>}
            </div>
            {trip.notes && <p className="text-sm text-slate-500 mt-2 italic">{trip.notes}</p>}
            {trip.tripCode && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-400">Trip code:</span>
                <span className="font-mono text-sm font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  {trip.tripCode}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Days logged</span>
            <span>{loggedDates.size} / {allDays.length}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${(loggedDates.size / allDays.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-100 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`shrink-0 px-4 py-2 text-sm font-medium transition border-b-2 ${
              activeTab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Itinerary tab */}
      {activeTab === 'itinerary' && (
        <>
          {canEdit && (
            showForm ? (
              <div className="card">
                <h2 className="font-semibold text-slate-800 mb-4">Add Day Entry</h2>
                <DayForm trip={trip} onSubmit={handleAddDay} onCancel={() => setShowForm(false)} loading={saving} />
              </div>
            ) : (
              <button onClick={() => setShowForm(true)} className="btn-primary w-full justify-center py-3">
                + Add Day Entry
              </button>
            )
          )}

          {sortedDays.length > 0 ? (
            <div className="space-y-2">
              <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">Itinerary</h2>
              {sortedDays.map((day) => (
                <DayRow key={day.id} day={day} tripId={tripId} onDelete={handleDeleteDay} canEdit={canEdit} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-400">
              <p className="text-3xl mb-2">📋</p>
              <p className="font-medium">No days planned yet</p>
              <p className="text-sm mt-1">{canEdit ? 'Add your first day entry above' : "The organizer hasn't added any days yet"}</p>
            </div>
          )}

          <div className="card">
            <h3 className="font-semibold text-sm text-slate-600 mb-3">Trip Calendar</h3>
            <div className="grid grid-cols-7 gap-1.5">
              {allDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isLogged = loggedDates.has(dateStr);
                return (
                  <div
                    key={dateStr}
                    title={format(day, 'EEEE, MMM d')}
                    className={`h-10 w-full rounded-lg flex flex-col items-center justify-center text-xs cursor-default transition ${
                      isLogged ? 'bg-blue-500 text-white font-semibold' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <span className="text-xs opacity-70">{format(day, 'EEE').slice(0, 1)}</span>
                    <span className="font-medium">{format(day, 'd')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Explore tab — full map + search, no padding card wrapper */}
      {activeTab === 'explore' && (
        <div className="-mx-4 -mt-6">
          <ExplorePanel
            defaultLocation={exploreLocation}
            currentTripId={tripId}
            embedded
          />
        </div>
      )}

      {/* Group chat tab */}
      {activeTab === 'group chat' && (
        <div className="card p-0 overflow-hidden">
          <GroupChat tripId={tripId} members={trip.members || []} canChat={canChat} />
        </div>
      )}

      {/* AI chat tab */}
      {activeTab === 'ai chat' && (
        <div className="card p-0 overflow-hidden">
          <AiGroupChat tripId={tripId} canChat={canChat} />
        </div>
      )}

      {/* Members tab */}
      {activeTab === 'members' && (
        <div className="card">
          <MembersPanel trip={trip} isAdmin={isAdmin} onRefresh={loadTrip} />
        </div>
      )}
    </div>
  );
}
