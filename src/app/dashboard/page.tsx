"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  ExternalLink,
  LogOut,
  Loader2,
  Sparkles,
  RefreshCw,
  Settings,
} from "lucide-react";
import { insforge, User, Match } from "@/lib/insforge";
import {
  mockCurrentUser,
  mockMatches,
} from "@/lib/mock-data";
import {
  isDevBypassEnabled,
  isDevAuthenticated,
  getStoredDevUser,
  devSignOut,
} from "@/lib/dev-auth";


import VisionProfileSetup from "@/components/VisionProfileSetup";
import VisionCard from "@/components/VisionCard";
import CreateVisionCard from "@/components/CreateVisionCard";
import DigitalDNA from "@/components/DigitalDNA";
import VibeCheck from "@/components/VibeCheck";
import SynergyRadar, { tasteProfileToRadarData } from "@/components/SynergyRadar";
import SocialLinks from "@/components/SocialLinks";

import { useRealtime } from "@/hooks/useRealtime";


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
interface EnhancedMatch extends Match {
  domainInterests?: string[];
  breakdown?: Record<string, number>;
  vibeResponses?: Record<string, string>;
  digitalDNA?: {
    velocity?: number;
    collaboration?: number;
    readme?: number;
    builder?: string;
    curiosity?: string[];
  };
}

function MatchCard({ match, userRadar }: { match: EnhancedMatch; userRadar?: any }) {
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

            {/* Domain Interests */}
            {match.domainInterests && match.domainInterests.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {match.domainInterests.slice(0, 3).map((interest) => (
                  <span
                    key={interest}
                    className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-600"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            )}

            {/* Vibe Check Highlights */}
            {match.vibeResponses && (
              <div className="flex flex-wrap gap-1 mt-2">
                {match.vibeResponses["team-role"] && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-600">
                    {match.vibeResponses["team-role"] === "breaks" && "💥 High velocity"}
                    {match.vibeResponses["team-role"] === "protects" && "🛡️ Risk averse"}
                    {match.vibeResponses["team-role"] === "designs" && "🏗️ Systems thinker"}
                    {match.vibeResponses["team-role"] === "connects" && "🔗 Collaborator"}
                  </span>
                )}
                {match.vibeResponses["time-horizon"] && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-pink-50 text-pink-600">
                    {match.vibeResponses["time-horizon"] === "ship-week" && "⚡ Ship fast"}
                    {match.vibeResponses["time-horizon"] === "ship-months" && "✨ Polish focused"}
                    {match.vibeResponses["time-horizon"] === "experiment" && "🔬 Explorer"}
                    {match.vibeResponses["time-horizon"] === "iterate" && "🔄 User-centric"}
                  </span>
                )}
              </div>
            )}

            {/* Digital DNA Signals */}
            {match.digitalDNA && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap gap-2 text-xs">
                  {match.digitalDNA.builder && (
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                      {match.digitalDNA.builder === "hacker" && "Hacker"}
                      {match.digitalDNA.builder === "craftsman" && "Craftsman"}
                      {match.digitalDNA.builder === "architect" && "Architect"}
                      {match.digitalDNA.builder === "perfectionist" && "Perfectionist"}
                    </span>
                  )}
                  {match.digitalDNA.velocity !== undefined && (
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      <span className="w-2 h-2 rounded-full bg-green-400"></span>
                      {match.digitalDNA.velocity >= 70 ? "Fast" : match.digitalDNA.velocity >= 40 ? "Steady" : "Deliberate"}
                    </span>
                  )}
                  {match.digitalDNA.collaboration !== undefined && (
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      {match.digitalDNA.collaboration >= 70 ? "Collaborative" : match.digitalDNA.collaboration >= 40 ? "Balanced" : "Solo"}
                    </span>
                  )}
                  {match.digitalDNA.curiosity && match.digitalDNA.curiosity.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                      {match.digitalDNA.curiosity.join(", ")}
                    </span>
                  )}
                </div>
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

            {/* Score Breakdown - Why you match */}
            {match.breakdown && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500 mb-2">Why you match</div>
                <div className="flex flex-wrap gap-2">
                  {match.breakdown.domain > 15 && (
                    <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                      Shared interests
                    </span>
                  )}
                  {match.breakdown.vibe > 10 && (
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                      Values align
                    </span>
                  )}
                  {match.breakdown.velocity > 10 && (
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                      Similar pace
                    </span>
                  )}
                  {match.breakdown.collaboration > 10 && (
                    <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs">
                      Work style fit
                    </span>
                  )}
                  {match.breakdown.builder > 10 && (
                    <span className="px-2 py-1 bg-pink-50 text-pink-700 rounded text-xs">
                      Complementary builders
                    </span>
                  )}
                  {match.breakdown.dna > 5 && (
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs">
                      Behavioral match
                    </span>
                  )}
                </div>
              </div>
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
}: {
  user: User;
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

    </div>
  );
}

// --- Dashboard page ---

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVisionSetup, setShowVisionSetup] = useState(false);
  const [showCreateVision, setShowCreateVision] = useState(false);
  const [showVibeCheck, setShowVibeCheck] = useState(false);
  const [visions, setVisions] = useState<any[]>([]);
  const [tasteProfile, setTasteProfile] = useState<any>(null);
  const [hasVibeCheck, setHasVibeCheck] = useState(false);
  const [vibeResponses, setVibeResponses] = useState<Record<string, string> | null>(null);

  // Load matches from edge function
  const loadMatches = async (userId: string) => {
    try {
      const { data: matchesData, error: functionError } =
        await insforge.functions.invoke("taste-based-matches", {
          body: { userId },
        });

      if (functionError) {
        console.error("Taste matches function error:", functionError);
        // Fallback to skill-based matching
        const { data: fallbackData } = await insforge.functions.invoke("matches", {
          body: { userId },
        });
        if (fallbackData?.matches) {
          setMatches(fallbackData.matches.sort((a: Match, b: Match) => b.matchScore - a.matchScore));
        }
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

  // Load project visions from other users
  const loadVisions = async (currentUserId?: string) => {
    try {
      const { data: visionsData } = await insforge.database
        .from("project_visions")
        .select(`
          *,
          user:user_id (id, name, avatar_url, github_id)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10);

      if (visionsData && visionsData.length > 0) {
        // Fetch resonance counts for all loaded visions
        const visionIds = visionsData.map((v: any) => v.id);
        const { data: allResonances } = await insforge.database
          .from("vision_resonances")
          .select("vision_id, user_id")
          .in("vision_id", visionIds);

        const resonances = allResonances || [];

        const enriched = visionsData.map((v: any) => {
          const visionResonances = resonances.filter((r: any) => r.vision_id === v.id);
          return {
            ...v,
            resonance_count: visionResonances.length,
            has_resonated: currentUserId
              ? visionResonances.some((r: any) => r.user_id === currentUserId)
              : false,
          };
        });

        setVisions(enriched);
      } else {
        setVisions(visionsData || []);
      }
    } catch (err) {
      console.error("Error loading visions:", err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function loadUserData(
      client: typeof insforge,
      authUser: any
    ) {
      // Get GitHub ID from various possible sources
      let githubId = authUser.profile?.github_id || 
                     authUser.profile?.id || 
                     authUser.user_metadata?.github_id;
      
      // Fallback: Extract from avatar URL if needed
      if (!githubId) {
        const avatarUrl = authUser.profile?.avatar_url || "";
        const idMatch = avatarUrl.match(/\/u\/(\d+)/);
        if (idMatch) {
          githubId = idMatch[1];
        }
      }
      
      if (!githubId) {
        console.error("Auth user profile:", authUser);
        throw new Error("Could not determine GitHub user ID from profile");
      }

      // Fetch full GitHub profile via server-side proxy
      console.log("Fetching GitHub profile for ID:", githubId);
      const ghRes = await fetch(`/api/github-user?id=${githubId}`);
      console.log("GitHub API response status:", ghRes.status);
      if (!ghRes.ok) {
        const errorText = await ghRes.text();
        console.error("GitHub API error:", errorText);
        throw new Error(`Failed to fetch GitHub profile: ${ghRes.status} ${errorText}`);
      }
      const ghProfile = await ghRes.json();
      console.log("GitHub profile fetched:", ghProfile.login);

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

      // Check if user needs vision profile setup
      const hasSkippedVisionSetup = localStorage.getItem(`vision_setup_skipped_${dbUser.id}`);
      if ((!dbUser.domain_interests || dbUser.domain_interests.length === 0) && !hasSkippedVisionSetup) {
        setShowVisionSetup(true);
      }

      // Load taste profile
      const { data: tasteData } = await client.database
        .from("user_taste_profiles")
        .select("*")
        .eq("user_id", dbUser.id)
        .single();
      if (tasteData) {
        setTasteProfile(tasteData);
      }

      // Check vibe check status
      const { data: vibeData } = await client.database
        .from("vibe_check_responses")
        .select("*")
        .eq("user_id", dbUser.id)
        .single();
      const hasCompletedVibeCheck = !!vibeData;
      setHasVibeCheck(hasCompletedVibeCheck);
      if (vibeData) {
        setVibeResponses(vibeData.responses || {});
      }
      
      // Auto-show vibe check modal for new users who haven't completed it
      // Check if user has skipped before using localStorage
      const hasSkippedVibeCheck = localStorage.getItem(`vibe_check_skipped_${dbUser.id}`);
      if (!hasCompletedVibeCheck && !hasSkippedVibeCheck) {
        setShowVibeCheck(true);
      }

      // Load matches
      await loadMatches(dbUser.id);
      
      // Load project visions
      await loadVisions(dbUser.id);
    }

    async function init() {
      try {
        // Check for dev bypass auth first
        if (isDevBypassEnabled() && isDevAuthenticated()) {
          const devUser = getStoredDevUser();
          setUser(devUser || mockCurrentUser);
          setMatches(
            mockMatches.sort((a, b) => b.matchScore - a.matchScore)
          );
          setLoading(false);
          return;
        }

        // Use the shared insforge client for OAuth callback handling
        // Get current user - SDK should automatically handle insforge_code in URL
        const { data: authData, error: authError } =
          await insforge.auth.getCurrentUser();

        // If auto-detect didn't work, try manual exchange of insforge_code
        if (authError || !authData?.user) {
          console.log("Auto-auth failed, trying manual code exchange...", authError);
          const params = new URLSearchParams(window.location.search);
          const code = params.get("insforge_code");
          if (code) {
            console.log("Found insforge_code, exchanging...");
            const { error: exchangeErr } =
              await insforge.auth.exchangeOAuthCode(code);
            if (!exchangeErr) {
              // Clean URL and retry getCurrentUser
              const url = new URL(window.location.href);
              url.searchParams.delete("insforge_code");
              window.history.replaceState({}, document.title, url.toString());
              const { data: retryData } = await insforge.auth.getCurrentUser();
              if (retryData?.user) {
                console.log("Manual exchange successful!");
                return await loadUserData(insforge, retryData.user);
              }
            } else {
              console.error("Code exchange failed:", exchangeErr);
            }
          }
          console.log("No valid session, redirecting to login");
          router.push("/login");
          return;
        }

        await loadUserData(insforge, authData.user);
      } catch (err) {
        console.error("Init error:", err);
      } finally {
        setLoading(false);
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    if (isDevBypassEnabled() && isDevAuthenticated()) {
      devSignOut();
    }
    await insforge.auth.signOut();
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

  // Show vision profile setup if needed
  if (showVisionSetup) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <VisionProfileSetup 
          userId={user.id} 
          onComplete={() => {
            setShowVisionSetup(false);
            window.location.reload();
          }} 
        />
        {/* Skip option */}
        <div className="max-w-2xl mx-auto mt-4 text-center">
          <button
            onClick={() => {
              setShowVisionSetup(false);
              localStorage.setItem(`vision_setup_skipped_${user.id}`, "true");
            }}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            Skip for now →
          </button>
          <p className="text-xs text-gray-400 mt-2">
            You can complete this later in Settings
          </p>
        </div>
      </div>
    );
  }

  // Show create vision modal
  if (showCreateVision) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <CreateVisionCard
          userId={user.id}
          onSuccess={() => {
            setShowCreateVision(false);
            loadVisions();
          }}
          onCancel={() => setShowCreateVision(false)}
        />
      </div>
    );
  }

  // Show vibe check modal
  if (showVibeCheck) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <VibeCheck
            userId={user.id}
            onComplete={() => {
              setShowVibeCheck(false);
              setHasVibeCheck(true);
              // Reload to show updated matches
              window.location.reload();
            }}
          />
          {/* Skip option for users who don't want to complete it now */}
          {!hasVibeCheck && (
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setShowVibeCheck(false);
                  // Remember that user skipped
                  localStorage.setItem(`vibe_check_skipped_${user.id}`, "true");
                }}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
              >
                Skip for now →
              </button>
              <p className="text-xs text-gray-400 mt-2">
                You can complete this later in Settings
              </p>
            </div>
          )}
        </div>
      </div>
    );
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
              <Link
                href="/events"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Events
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Profile */}
          <div className="lg:col-span-1 space-y-6">
            <ProfileCard user={user} />
            {/* Digital DNA - Behavioral Analysis */}
            <DigitalDNA userId={user.id} />
            {/* Vibe Check - Display answers */}
            {!showVibeCheck && hasVibeCheck && vibeResponses && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">Vibe Check</h3>
                    <p className="text-xs text-gray-500">Your mindset snapshot</p>
                  </div>
                  <button
                    onClick={() => setShowVibeCheck(true)}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                  >
                    Retake
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  {vibeResponses["boring-problem"] && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-400">💡</span>
                      <span className="text-gray-600">
                        {vibeResponses["boring-problem"] === "data-pipeline" && "Systems thinker"}
                        {vibeResponses["boring-problem"] === "documentation" && "Developer advocate"}
                        {vibeResponses["boring-problem"] === "testing" && "Quality focused"}
                        {vibeResponses["boring-problem"] === "deployment" && "DevOps mindset"}
                      </span>
                    </div>
                  )}
                  {vibeResponses["team-role"] && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-400">👥</span>
                      <span className="text-gray-600">
                        {vibeResponses["team-role"] === "breaks" && "High velocity"}
                        {vibeResponses["team-role"] === "protects" && "Risk averse"}
                        {vibeResponses["team-role"] === "designs" && "Systems thinker"}
                        {vibeResponses["team-role"] === "connects" && "Collaborator"}
                      </span>
                    </div>
                  )}
                  {vibeResponses["time-horizon"] && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-400">⏱️</span>
                      <span className="text-gray-600">
                        {vibeResponses["time-horizon"] === "ship-week" && "Ship fast"}
                        {vibeResponses["time-horizon"] === "ship-months" && "Polish focused"}
                        {vibeResponses["time-horizon"] === "experiment" && "Explorer"}
                        {vibeResponses["time-horizon"] === "iterate" && "User-centric"}
                      </span>
                    </div>
                  )}
                  {vibeResponses["overhyped-tech"] && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-400">🎯</span>
                      <span className="text-gray-600">
                        {vibeResponses["overhyped-tech"] === "blockchain" && "Pragmatic"}
                        {vibeResponses["overhyped-tech"] === "ai-everything" && "Skeptical"}
                        {vibeResponses["overhyped-tech"] === "microservices" && "Simple-first"}
                        {vibeResponses["overhyped-tech"] === "new-frameworks" && "Stability-focused"}
                      </span>
                    </div>
                  )}
                  {vibeResponses["legacy-code"] && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-400">🔧</span>
                      <span className="text-gray-600">
                        {vibeResponses["legacy-code"] === "rewrite" && "Clean-slate"}
                        {vibeResponses["legacy-code"] === "refactor" && "Incremental"}
                        {vibeResponses["legacy-code"] === "work-around" && "Pragmatic"}
                        {vibeResponses["legacy-code"] === "understand" && "Deep diver"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Social Links - LinkedIn, Google Scholar */}
            <SocialLinks 
              userId={user.id} 
              initialData={{
                linkedin_url: (user as any).linkedin_url,
                google_scholar_url: (user as any).google_scholar_url,
                github_url: user.html_url || undefined,
              }}
            />
          </div>

          {/* Right column - Matches */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-500" />
                Vision-Aligned Matches
              </h2>
              <p className="text-gray-600 mt-1">
                Creative partners matched by values, velocity, and vision—not just skills
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map((match) => (
                <MatchCard 
                  key={match.userId} 
                  match={match} 
                  userRadar={tasteProfile ? tasteProfileToRadarData(tasteProfile) : undefined}
                />
              ))}
            </div>

            {matches.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-500">No matches found yet.</p>
                <p className="text-sm text-gray-400 mt-1">
                  Complete your profile and vibe check to find your creative partners!
                </p>
              </div>
            )}

            {/* Project Visions Section */}
            <div className="mt-12">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-amber-500" />
                    Project Visions
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Creative ideas from developers looking for collaborators
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateVision(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Share Your Vision
                </button>
              </div>
                {visions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visions.map((vision) => (
                      <VisionCard
                        key={vision.id}
                        vision={{
                          id: vision.id,
                          userId: vision.user_id,
                          title: vision.title,
                          description: vision.description,
                          domainTags: vision.domain_tags || [],

                          status: vision.status,
                          createdAt: vision.created_at,
                          user: vision.user,
                          resonanceCount: vision.resonance_count || 0,
                          hasResonated: vision.has_resonated || false,
                        }}
                        currentUserId={user?.id}
                        onResonanceChange={() => loadVisions(user?.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                    <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No visions shared yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Be the first to share your project idea!
                    </p>
                  </div>
                )}
              </div>
          </div>
        </div>
      </main>
    </div>
  );
}
