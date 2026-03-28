"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  Upload,
  Loader2,
  MapPin,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import { insforge, Event, EventParticipant, Match } from "@/lib/insforge";

function getRarityColor(rarity: string) {
  switch (rarity) {
    case "legendary":
      return "bg-gradient-to-r from-purple-500 to-pink-500 text-white";
    case "epic":
      return "bg-gradient-to-r from-blue-500 to-purple-500 text-white";
    case "rare":
      return "bg-gradient-to-r from-green-400 to-blue-500 text-white";
    default:
      return "bg-gradient-to-r from-gray-400 to-gray-500 text-white";
  }
}

function MatchCard({ match }: { match: Match }) {
  const getScoreColor = (score: number) => {
    if (score >= 75) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  return (
    <Link href={`/profile/${match.userId}`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start gap-4">
          <img
            src={match.avatar}
            alt={match.name}
            className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-gray-900 truncate">
                {match.name}
              </h3>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium border ${getScoreColor(match.matchScore)}`}
              >
                {match.matchScore}%
              </span>
            </div>

            {match.location && (
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{match.location}</span>
              </div>
            )}

            {match.personality && (
              <div
                className={`mt-2 px-2 py-0.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 ${getRarityColor(match.personality.rarity)}`}
              >
                <Sparkles className="w-3 h-3" />
                <span>{match.personality.title}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 mt-2">
              {match.skills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    match.sharedSkills.includes(skill)
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {skill}
                </span>
              ))}
            </div>

            {match.sharedSkills.length > 0 && (
              <p className="text-xs text-indigo-600 mt-1.5">
                Shared: {match.sharedSkills.join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function EventDetailClient({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [event, setEvent] = useState<(Event & { host?: any }) | null>(null);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [hasJoined, setHasJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // CSV import state
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    matched: string[];
    notFound: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initPage() {
    try {
      // Get current user — look up real database user ID (not auth ID)
      let currentUserId = "";
      const { data: authData } = await insforge.auth.getCurrentUser();
      if (authData?.user) {
        const avatarUrl = authData.user.profile?.avatar_url || "";
        const idMatch = avatarUrl.match(/\/u\/(\d+)/);
        if (idMatch) {
          const { data: users } = await insforge.database
            .from("users")
            .select("id")
            .eq("github_id", idMatch[1]);
          if (users && users.length > 0) {
            currentUserId = users[0].id;
          }
        }
      }
      setUserId(currentUserId);

      // Load event details
      const { data, error } = await insforge.functions.invoke("events", {
        body: { action: "get", eventId },
      });

      if (error || !data?.success) {
        console.error("Failed to load event:", error);
        return;
      }

      setEvent(data.event);
      setParticipants(data.participants || []);

      // Check if user already joined
      const joined = data.participants?.some(
        (p: EventParticipant) => p.user_id === currentUserId
      );
      setHasJoined(!!joined);

      // Load scoped matches if user has joined
      if (joined && currentUserId) {
        loadMatches(currentUserId);
      }
    } catch (err) {
      console.error("Init error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMatches(uid: string) {
    setMatchesLoading(true);
    try {
      const { data, error } = await insforge.functions.invoke("matches", {
        body: { userId: uid, eventId },
      });
      if (!error && data?.matches) {
        setMatches(
          data.matches.sort(
            (a: Match, b: Match) => b.matchScore - a.matchScore
          )
        );
      }
    } catch (err) {
      console.error("Error loading matches:", err);
    } finally {
      setMatchesLoading(false);
    }
  }

  async function handleJoin() {
    if (!userId) {
      router.push("/login");
      return;
    }
    setJoining(true);
    try {
      const { data, error } = await insforge.functions.invoke("events", {
        body: { action: "join", eventId, userId },
      });
      if (!error && data?.success) {
        setHasJoined(true);
        // Reload event to get updated participant list
        const { data: refreshData } = await insforge.functions.invoke(
          "events",
          {
            body: { action: "get", eventId },
          }
        );
        if (refreshData?.success) {
          setParticipants(refreshData.participants || []);
        }
        // Load matches
        loadMatches(userId);
      }
    } catch (err) {
      console.error("Join error:", err);
    } finally {
      setJoining(false);
    }
  }

  function copyCode() {
    if (!event) return;
    navigator.clipboard.writeText(event.join_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  function copyJoinLink() {
    const link = `${window.location.origin}/events/${eventId}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      // Parse CSV: look for a column with github usernames
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length === 0) return;

      // Check if first line is a header
      const firstLine = lines[0].toLowerCase();
      const hasHeader =
        firstLine.includes("github") ||
        firstLine.includes("username") ||
        firstLine.includes("name");
      const dataLines = hasHeader ? lines.slice(1) : lines;

      // Try to extract GitHub usernames (handle CSV with commas)
      const usernames: string[] = [];
      for (const line of dataLines) {
        const parts = line.split(",").map((p) => p.trim().replace(/"/g, ""));
        // Take the first non-empty value that looks like a username (no spaces, no @)
        for (const part of parts) {
          if (part && !part.includes(" ") && !part.includes("@") && part.length > 0) {
            usernames.push(part);
            break;
          }
        }
      }
      setCsvText(usernames.join("\n"));
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    const usernames = csvText
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    if (usernames.length === 0) return;

    setImporting(true);
    setImportResult(null);
    try {
      const { data, error } = await insforge.functions.invoke("events", {
        body: { action: "import", eventId, githubUsernames: usernames },
      });
      if (!error && data?.success) {
        setImportResult({
          matched: data.matched || [],
          notFound: data.notFound || [],
        });
        // Reload participants
        const { data: refreshData } = await insforge.functions.invoke(
          "events",
          {
            body: { action: "get", eventId },
          }
        );
        if (refreshData?.success) {
          setParticipants(refreshData.participants || []);
        }
        // Reload matches
        if (userId) loadMatches(userId);
      }
    } catch (err) {
      console.error("Import error:", err);
    } finally {
      setImporting(false);
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isHost = event?.host_user_id === userId;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Event not found</p>
          <Link
            href="/events"
            className="text-orange-600 hover:text-orange-700 mt-2 inline-block"
          >
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/events"
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">All Events</span>
            </Link>
            <div className="flex items-center gap-3">
              {/* Copy Join Code */}
              <button
                onClick={copyCode}
                className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                {codeCopied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span className="font-mono font-bold">
                  {event.join_code}
                </span>
              </button>
              {/* Copy Join Link */}
              <button
                onClick={copyJoinLink}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                {linkCopied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                {linkCopied ? "Copied!" : "Share Link"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Info Banner */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {event.event_name}
              </h1>
              {event.event_description && (
                <p className="text-gray-600 mt-2">{event.event_description}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                {event.event_date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {formatDate(event.event_date)}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {participants.length} participant
                  {participants.length !== 1 ? "s" : ""}
                </span>
                {event.event_url && (
                  <a
                    href={event.event_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-orange-600 hover:text-orange-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View original event
                  </a>
                )}
              </div>
              {event.host && (
                <div className="flex items-center gap-2 mt-3">
                  {event.host.avatar_url && (
                    <img
                      src={event.host.avatar_url}
                      alt=""
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <span className="text-sm text-gray-500">
                    Hosted by{" "}
                    <span className="font-medium text-gray-700">
                      {event.host.name}
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              {!hasJoined ? (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
                >
                  {joining ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  Join Event
                </button>
              ) : (
                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium text-center">
                  You&apos;ve joined this event
                </span>
              )}
              {isHost && (
                <button
                  onClick={() => setShowImport(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                  <Upload className="w-4 h-4" />
                  Import Attendees
                </button>
              )}
            </div>
          </div>

          {/* Share Section */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Share this event
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-lg">
                <span className="text-sm text-gray-500">Join code:</span>
                <span className="font-mono font-bold text-orange-700 text-lg">
                  {event.join_code}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Share this code or link so attendees can join and get matched
              </p>
            </div>
          </div>
        </div>

        {/* Two column layout: Matches + Participants */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Matches - main column */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Your Matches at This Event
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Developers at this event ranked by compatibility
              </p>
            </div>

            {!hasJoined ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <UserPlus className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  Join this event to see your matches
                </p>
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {joining ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  Join Event
                </button>
              </div>
            ) : matchesLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto" />
                <p className="text-gray-500 mt-2">Finding your matches...</p>
              </div>
            ) : matches.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matches.map((match) => (
                  <MatchCard key={match.userId} match={match} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-500">
                  No matches yet — waiting for more attendees to join!
                </p>
              </div>
            )}
          </div>

          {/* Participants - sidebar */}
          <div className="lg:col-span-1">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Participants ({participants.length})
            </h3>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {participants.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  No participants yet
                </div>
              ) : (
                participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-3">
                    {p.user?.avatar_url && (
                      <img
                        src={p.user.avatar_url}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {p.user?.name || "Unknown"}
                      </p>
                      {p.user?.location && (
                        <p className="text-xs text-gray-500 truncate">
                          {p.user.location}
                        </p>
                      )}
                    </div>
                    {p.user_id === event.host_user_id && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                        Host
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Import Attendees Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  Import Attendees
                </h3>
                <button
                  onClick={() => {
                    setShowImport(false);
                    setImportResult(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Upload a CSV file or paste GitHub usernames to add existing
                DevMatch users to this event. Users not found in DevMatch will
                be listed so you can share the join link with them.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload CSV
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 file:cursor-pointer hover:file:bg-gray-200"
                />
                <p className="text-xs text-gray-400 mt-1">
                  CSV with GitHub usernames (one per row, or comma-separated)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Or paste GitHub usernames (one per line)
                </label>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={"octocat\ndefunkt\nmojombo"}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none font-mono text-sm"
                />
              </div>

              <button
                onClick={handleImport}
                disabled={importing || !csvText.trim()}
                className="w-full py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                {importing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Import Attendees
              </button>

              {importResult && (
                <div className="space-y-3 pt-2">
                  {importResult.matched.length > 0 && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-700">
                        {importResult.matched.length} matched & added:
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {importResult.matched.join(", ")}
                      </p>
                    </div>
                  )}
                  {importResult.notFound.length > 0 && (
                    <div className="p-3 bg-amber-50 rounded-lg">
                      <p className="text-sm font-medium text-amber-700">
                        {importResult.notFound.length} not found in DevMatch:
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        {importResult.notFound.join(", ")}
                      </p>
                      <p className="text-xs text-amber-500 mt-2">
                        Share the join code{" "}
                        <span className="font-mono font-bold">
                          {event.join_code}
                        </span>{" "}
                        with them to sign up
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
