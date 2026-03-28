"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@insforge/sdk";
import {
  MapPin,
  ExternalLink,
  LogOut,
  Loader2,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { insforge, User, Skill, Match } from "@/lib/insforge";
import {
  mockCurrentUser,
  mockCurrentUserSkills,
  mockMatches,
} from "@/lib/mock-data";
import {
  isDevBypassEnabled,
  isDevAuthenticated,
  getStoredDevUser,
  devSignOut,
} from "@/lib/dev-auth";
import PersonalityCard from "@/components/PersonalityCard";
import SetupProfileButton from "@/components/SetupProfileButton";

// --- Helper functions ---

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

function getRarityEmoji(rarity: string) {
  switch (rarity) {
    case "legendary":
      return "\u{1F451}";
    case "epic":
      return "\u26A1";
    case "rare":
      return "\u{1F48E}";
    default:
      return "\u{1F4C4}";
  }
}

// --- MatchCard component ---

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
            className="w-16 h-16 rounded-full object-cover border-2 border-gray-100"
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
                className={`mt-2 px-2 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1 ${getRarityColor(match.personality.rarity)}`}
              >
                <Sparkles className="w-3 h-3" />
                <span>
                  {getRarityEmoji(match.personality.rarity)}{" "}
                  {match.personality.title}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 mt-3">
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
              {match.skills.length > 3 && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                  +{match.skills.length - 3}
                </span>
              )}
            </div>

            {match.sharedSkills.length > 0 && (
              <p className="text-xs text-indigo-600 mt-2">
                Shared: {match.sharedSkills.join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// --- ProfileCard component ---

function ProfileCard({
  user,
  skills,
  analyzing,
  onAnalyze,
}: {
  user: User;
  skills: Skill[];
  analyzing: boolean;
  onAnalyze: () => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-4">
        {user.avatar_url && (
          <img
            src={user.avatar_url}
            alt={user.name}
            className="w-20 h-20 rounded-full object-cover border-2 border-indigo-100"
          />
        )}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
          {user.location && (
            <div className="flex items-center gap-1 text-gray-500 mt-1">
              <MapPin className="w-4 h-4" />
              <span>{user.location}</span>
            </div>
          )}
          {user.html_url && (
            <a
              href={user.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 mt-2"
            >
              View GitHub Profile
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {user.bio && (
        <p className="text-gray-600 mt-4 text-sm leading-relaxed">
          {user.bio}
        </p>
      )}

      <div className="mt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Your Skills</h3>
          <button
            onClick={onAnalyze}
            disabled={analyzing}
            className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3 h-3 ${analyzing ? "animate-spin" : ""}`}
            />
            {analyzing ? "Analyzing..." : "Analyze Repos"}
          </button>
        </div>
        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill.id || skill.skill_name}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
              >
                {skill.skill_name}
                <span className="ml-1.5 text-indigo-400 text-xs">
                  ({skill.skill_count})
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            Click &quot;Analyze Repos&quot; to categorize your skills from your
            GitHub repositories.
          </p>
        )}
      </div>
    </div>
  );
}

// --- Dashboard page ---

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);

  function getClient() {
    if (!clientRef.current) {
      clientRef.current = createClient({
        baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL!,
        anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
      });
    }
    return clientRef.current;
  }

  // Analyze repos and update skills
  const analyzeRepos = async (githubId: string) => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_id: githubId }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Analysis failed");
      }
      const data = await res.json();
      const newSkills: Skill[] = data.skills.map(
        (s: { skill_name: string; skill_count: number }, i: number) => ({
          id: `analyzed-${i}`,
          user_id: "",
          skill_name: s.skill_name,
          skill_count: s.skill_count,
        })
      );
      setSkills(newSkills);
      return newSkills;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      return null;
    } finally {
      setAnalyzing(false);
    }
  };

  // Load matches from edge function
  const loadMatches = async (userId: string) => {
    try {
      const { data: matchesData, error: functionError } =
        await insforge.functions.invoke("matches", {
          body: { userId },
        });

      if (functionError) {
        console.error("Matches function error:", functionError);
        return;
      }

      if (matchesData?.matches) {
        setMatches(
          matchesData.matches.sort(
            (a: Match, b: Match) => b.matchScore - a.matchScore
          )
        );
      }
    } catch (err) {
      console.error("Error loading matches:", err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function loadUserData(
      client: ReturnType<typeof createClient>,
      authUser: any
    ) {
      // Extract GitHub numeric ID from avatar URL
      const avatarUrl = authUser.profile?.avatar_url || "";
      const idMatch = avatarUrl.match(/\/u\/(\d+)/);
      if (!idMatch) {
        throw new Error("Could not determine GitHub user ID from profile");
      }
      const githubId = idMatch[1];

      // Fetch full GitHub profile via server-side proxy
      const ghRes = await fetch(`/api/github-user?id=${githubId}`);
      if (!ghRes.ok) {
        throw new Error("Failed to fetch GitHub profile");
      }
      const ghProfile = await ghRes.json();

      // Check if user already exists
      const { data: existingUsers } = await client.database
        .from("users")
        .select()
        .eq("github_id", githubId);

      const userData: Omit<User, "id"> = {
        github_id: githubId,
        name: ghProfile.name || ghProfile.login,
        avatar_url: ghProfile.avatar_url,
        bio: ghProfile.bio,
        location: ghProfile.location,
        html_url: ghProfile.html_url,
      };

      let dbUser: User;

      if (existingUsers && existingUsers.length > 0) {
        const { data: updated, error: updateError } = await client.database
          .from("users")
          .update(userData)
          .eq("github_id", githubId)
          .select();
        if (updateError) throw new Error(updateError.message);
        dbUser = updated![0] as User;
      } else {
        const { data: inserted, error: insertError } = await client.database
          .from("users")
          .insert([userData])
          .select();
        if (insertError) throw new Error(insertError.message);
        dbUser = inserted![0] as User;
      }

      setUser(dbUser);

      // Load existing skills
      const { data: existingSkills } = await client.database
        .from("skills")
        .select("*")
        .eq("user_id", dbUser.id);

      if (existingSkills && existingSkills.length > 0) {
        setSkills(existingSkills as Skill[]);
      } else {
        // Auto-analyze for new users with no skills
        await analyzeRepos(githubId);
      }

      // Load matches
      await loadMatches(dbUser.id);
    }

    async function init() {
      try {
        // Check for dev bypass auth first
        if (isDevBypassEnabled() && isDevAuthenticated()) {
          const devUser = getStoredDevUser();
          setUser(devUser || mockCurrentUser);
          setSkills(mockCurrentUserSkills);
          setMatches(
            mockMatches.sort((a, b) => b.matchScore - a.matchScore)
          );
          setLoading(false);
          return;
        }

        // Create a fresh client so detectAuthCallback() runs with the current URL
        const client = getClient();

        // Get current user - SDK internally awaits the OAuth code exchange
        const { data: authData, error: authError } =
          await client.auth.getCurrentUser();

        // If auto-detect didn't work, try manual exchange of insforge_code
        if (authError || !authData?.user) {
          const params = new URLSearchParams(window.location.search);
          const code = params.get("insforge_code");
          if (code) {
            const { error: exchangeErr } =
              await client.auth.exchangeOAuthCode(code);
            if (!exchangeErr) {
              // Clean URL and retry getCurrentUser
              const url = new URL(window.location.href);
              url.searchParams.delete("insforge_code");
              window.history.replaceState({}, document.title, url.toString());
              const { data: retryData } = await client.auth.getCurrentUser();
              if (retryData?.user) {
                return await loadUserData(client, retryData.user);
              }
            }
          }
          router.push("/login");
          return;
        }

        await loadUserData(client, authData.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalyze = async () => {
    if (!user) return;
    await analyzeRepos(user.github_id);
    // Reload matches after skill analysis since matches depend on skills
    await loadMatches(user.id);
  };

  const handleSignOut = async () => {
    if (isDevBypassEnabled() && isDevAuthenticated()) {
      devSignOut();
    }
    const client = getClient();
    await client.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <span className="font-bold text-xl text-gray-900">DevMatch</span>
            </div>

            <div className="flex items-center gap-4">
              {isDevBypassEnabled() && isDevAuthenticated() && (
                <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded">
                  DEV MODE
                </span>
              )}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Profile */}
          <div className="lg:col-span-1 space-y-6">
            <ProfileCard
              user={user}
              skills={skills}
              analyzing={analyzing}
              onAnalyze={handleAnalyze}
            />
            <PersonalityCard
              userId={user?.id || ""}
              initialPersonality={user?.personality_type ? {
                type: user.personality_type,
                title: user.personality_title || "",
                description: user.personality_description || "",
                rarity: user.personality_rarity || "common"
              } : null}
            />
            <SetupProfileButton />
          </div>

          {/* Right column - Matches */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Your Matches
              </h2>
              <p className="text-gray-600 mt-1">
                Developers with compatible skills based on your GitHub activity
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map((match) => (
                <MatchCard key={match.userId} match={match} />
              ))}
            </div>

            {matches.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-500">No matches found yet.</p>
                <p className="text-sm text-gray-400 mt-1">
                  Check back later as more developers join!
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
