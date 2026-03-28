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
import PersonalityCard from "@/components/PersonalityCard";
import SetupProfileButton from "@/components/SetupProfileButton";
import VisionProfileSetup from "@/components/VisionProfileSetup";
import VisionCard from "@/components/VisionCard";
import CreateVisionCard from "@/components/CreateVisionCard";
import DigitalDNA from "@/components/DigitalDNA";
import VibeCheck from "@/components/VibeCheck";
import SynergyRadar, { tasteProfileToRadarData } from "@/components/SynergyRadar";
import SocialLinks from "@/components/SocialLinks";
import { getArchetype, type ArchetypeType, DOMAIN_INTERESTS, BUILDER_PHILOSOPHIES } from "@/lib/archetypes";
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
  archetype?: string;
  domainInterests?: string[];
  breakdown?: Record<string, number>;
  synergyType?: string;
}

function MatchCard({ match, userRadar }: { match: EnhancedMatch; userRadar?: any }) {
  const getScoreColor = (score: number) => {
    if (score >= 75) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getSynergyBadge = (type?: string) => {
    switch (type) {
      case "complementary":
        return { text: "✨ Complementary", class: "bg-purple-100 text-purple-700" };
      case "similar":
        return { text: "🤝 Similar Style", class: "bg-blue-100 text-blue-700" };
      default:
        return { text: "⚖️ Balanced", class: "bg-gray-100 text-gray-700" };
    }
  };

  const synergyBadge = getSynergyBadge(match.synergyType);

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

            {/* Archetype Badge */}
            {match.archetype && (
              <div className="mt-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${synergyBadge.class}`}>
                  {synergyBadge.text}
                </span>
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

            {/* Score Breakdown */}
            {match.breakdown && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-3 gap-1 text-xs">
                  {Object.entries(match.breakdown).slice(0, 3).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div className="font-semibold text-gray-700">{value}</div>
                      <div className="text-gray-400 capitalize">{key}</div>
                    </div>
                  ))}
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

      {/* Vision Profile Section */}
      {user.archetype && (
        <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{getArchetype(user.archetype as ArchetypeType).emoji}</span>
            <span className="font-semibold text-indigo-900">
              {getArchetype(user.archetype as ArchetypeType).title}
            </span>
          </div>
          {user.builder_philosophy && (
            <p className="text-xs text-indigo-700 mb-2">
              {BUILDER_PHILOSOPHIES.find(p => p.id === user.builder_philosophy)?.label}
            </p>
          )}
          {user.domain_interests && user.domain_interests.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {user.domain_interests.slice(0, 3).map((interestId) => {
                const interest = DOMAIN_INTERESTS.find(i => i.id === interestId);
                return interest ? (
                  <span key={interestId} className="text-xs px-2 py-0.5 bg-white/70 text-indigo-700 rounded-full">
                    {interest.label}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>
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
  const loadVisions = async () => {
    try {
      const { data: visionsData } = await insforge.database
        .from("project_visions")
        .select(`
          *,
          user:user_id (id, name, avatar_url, archetype, github_id)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10);

      if (visionsData) {
        setVisions(visionsData);
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
      // Extract GitHub numeric ID from avatar URL
      const avatarUrl = authUser.profile?.avatar_url || "";
      const idMatch = avatarUrl.match(/\/u\/(\d+)/);
      if (!idMatch) {
        throw new Error("Could not determine GitHub user ID from profile");
      }
      const githubId = idMatch[1];

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
      if (!dbUser.archetype || !dbUser.domain_interests || dbUser.domain_interests.length === 0) {
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
      setHasVibeCheck(!!vibeData);

      // Load matches
      await loadMatches(dbUser.id);
      
      // Load project visions
      await loadVisions();
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

  // Show vibe check only when explicitly requested (not auto-show for new users)
  if (showVibeCheck) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <VibeCheck
          userId={user.id}
          onComplete={() => {
            setShowVibeCheck(false);
            setHasVibeCheck(true);
            // Reload to show updated matches
            window.location.reload();
          }}
        />
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
            {/* Vibe Check - Quick retake button */}
            {!showVibeCheck && hasVibeCheck && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
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
              </div>
            )}
            <PersonalityCard
              userId={user?.id || ""}
              initialPersonality={user?.personality_type ? {
                type: user.personality_type,
                title: user.personality_title || "",
                description: user.personality_description || "",
                rarity: user.personality_rarity || "common"
              } : null}
            />
            {/* Social Links - LinkedIn, Google Scholar */}
            <SocialLinks 
              userId={user.id} 
              initialData={{
                linkedin_url: (user as any).linkedin_url,
                google_scholar_url: (user as any).google_scholar_url,
                github_url: user.html_url || undefined,
              }}
            />
            <SetupProfileButton />
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
                          lookingForArchetypes: vision.looking_for_archetypes || [],
                          status: vision.status,
                          createdAt: vision.created_at,
                          user: vision.user,
                        }}
                        currentUserId={user?.id}
                        onResonanceChange={loadVisions}
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
