"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Users,
  Calendar,
  Link as LinkIcon,
  Search,
  Loader2,
  X,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { insforge, Event } from "@/lib/insforge";

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Create form state
  const [eventUrl, setEventUrl] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [platform, setPlatform] = useState("other");
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
    // Look up the real database user ID (not the auth user ID)
    insforge.auth.getCurrentUser().then(async ({ data }) => {
      if (data?.user) {
        const avatarUrl = data.user.profile?.avatar_url || "";
        const idMatch = avatarUrl.match(/\/u\/(\d+)/);
        if (idMatch) {
          const { data: users } = await insforge.database
            .from("users")
            .select("id")
            .eq("github_id", idMatch[1]);
          if (users && users.length > 0) {
            setUserId(users[0].id);
          }
        }
      }
    });
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await insforge.functions.invoke("events", {
        body: { action: "list" },
      });
      if (!error && data?.success) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleParseUrl = async () => {
    if (!eventUrl.trim()) return;
    setParsing(true);
    setParseError(null);
    try {
      const res = await fetch("/api/parse-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: eventUrl.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setEventName(data.title || "");
        setEventDescription(data.description || "");
        setPlatform(data.platform || "other");
        if (data.date) {
          // Format for datetime-local input
          const d = new Date(data.date);
          if (!isNaN(d.getTime())) {
            setEventDate(d.toISOString().slice(0, 16));
          }
        }
      } else {
        setParseError(data.error || "Could not parse event details");
      }
    } catch {
      setParseError("Failed to fetch event details");
    } finally {
      setParsing(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await insforge.functions.invoke("events", {
        body: {
          action: "create",
          eventName: eventName.trim(),
          eventUrl: eventUrl.trim() || null,
          eventDate: eventDate || null,
          eventDescription: eventDescription.trim() || null,
          platform,
          hostUserId: userId || null,
        },
      });

      if (!error && data?.success) {
        setShowCreate(false);
        setEventUrl("");
        setEventName("");
        setEventDate("");
        setEventDescription("");
        setPlatform("other");
        // Navigate to the new event
        router.push(`/events/${data.event.id}`);
      }
    } catch (err) {
      console.error("Failed to create event:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    setJoinError(null);
    try {
      const { data, error } = await insforge.functions.invoke("events", {
        body: { action: "lookup", joinCode: joinCode.trim().toUpperCase() },
      });

      if (error || !data?.success) {
        setJoinError("No event found with that code");
        return;
      }

      // Join the event if we have a userId
      if (userId) {
        await insforge.functions.invoke("events", {
          body: { action: "join", eventId: data.event.id, userId },
        });
      }

      router.push(`/events/${data.event.id}`);
    } catch {
      setJoinError("Failed to look up event code");
    } finally {
      setJoinLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getPlatformBadge = (p: string) => {
    switch (p) {
      case "luma":
        return "bg-purple-100 text-purple-700";
      case "meetup":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Dashboard</span>
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-gray-900">
                  Event Sessions
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowJoin(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Search className="w-4 h-4" />
                Join by Code
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Event
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Active Events</h2>
          <p className="text-gray-600 mt-1">
            Join an event session to match with attendees, or create one from a
            Luma/Meetup link
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto" />
            <p className="text-gray-500 mt-2">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No events yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Create an event from a Luma or Meetup link to get started
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
                    {event.event_name}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ml-2 ${getPlatformBadge(event.platform)}`}
                  >
                    {event.platform}
                  </span>
                </div>

                {event.event_description && (
                  <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                    {event.event_description}
                  </p>
                )}

                {event.event_date && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(event.event_date)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    {event.host_avatar && (
                      <img
                        src={event.host_avatar}
                        alt=""
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                    <span>{event.host_name || "Anonymous"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{event.participant_count || 0} joined</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs font-mono font-bold">
                    {event.join_code}
                  </span>
                  {event.event_url && (
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create Event Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  Create Event Session
                </h3>
                <button
                  onClick={() => setShowCreate(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* URL Input with Parse */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Link (Luma, Meetup, or any URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={eventUrl}
                    onChange={(e) => setEventUrl(e.target.value)}
                    placeholder="https://lu.ma/your-event or https://meetup.com/..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleParseUrl}
                    disabled={parsing || !eventUrl.trim()}
                    className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    {parsing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LinkIcon className="w-4 h-4" />
                    )}
                    {parsing ? "Parsing..." : "Fetch"}
                  </button>
                </div>
                {parseError && (
                  <p className="text-xs text-amber-600 mt-1">
                    {parseError} — you can fill in the details manually below.
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Paste a link to auto-fill event details, or skip and enter
                  manually
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Name *
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g., Code & Coffee Seattle - April 2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="What's this event about?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Platform
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    <option value="other">Other</option>
                    <option value="luma">Luma</option>
                    <option value="meetup">Meetup</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !eventName.trim()}
                className="w-full py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create Event Session
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Join by Code Modal */}
      {showJoin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  Join Event by Code
                </h3>
                <button
                  onClick={() => {
                    setShowJoin(false);
                    setJoinError(null);
                    setJoinCode("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter the 6-character event code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) =>
                    setJoinCode(e.target.value.toUpperCase().slice(0, 6))
                  }
                  placeholder="ABC123"
                  maxLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-center text-2xl font-mono font-bold tracking-widest"
                  autoFocus
                />
                {joinError && (
                  <p className="text-sm text-red-600 mt-2">{joinError}</p>
                )}
              </div>
              <button
                onClick={handleJoinByCode}
                disabled={joinLoading || joinCode.length < 4}
                className="w-full py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                {joinLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Join Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
