"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, MapPin, ExternalLink, Loader2, Calendar, FlaskConical,
  Briefcase, Clock, Target, Zap, Heart, Sparkles, Users, Code, 
  Lightbulb, Rocket, Star, Award
} from "lucide-react";
import { insforge, User, Skill } from "@/lib/insforge";
import { mockUsers, mockMatches } from "@/lib/mock-data";
import { isDevBypassEnabled, isDevAuthenticated } from "@/lib/dev-auth";

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const GoogleScholarIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 24a7 7 0 1 1 0-14 7 7 0 0 1 0 14Zm0-24L0 9.5l4.838 3.94A8 8 0 0 1 12 9a8 8 0 0 1 7.162 4.44L24 9.5 12 0Z"/>
  </svg>
);

interface VibeCheckResponse {
  "boring-problem": string;
  "team-role": string;
  "time-horizon": string;
  "overhyped-tech": string;
  "collaboration-style": string;
}

interface TasteSignals {
  velocity_score: number;
  collaboration_score: number;
  readme_score: number;
  completion_score: number;
  curiosity_areas: string[];
}

interface ProjectVision {
  id: string;
  title: string;
  description: string;
  domain_tags: string[];
  looking_for_archetypes: string[];
  status: string;
}

interface ProfileClientProps {
  userId: string;
}

export default function ProfileClient({ userId }: ProfileClientProps) {
  const [user, setUser] = useState<User | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [vibeCheck, setVibeCheck] = useState<VibeCheckResponse | null>(null);
  const [tasteProfile, setTasteProfile] = useState<{ signals: TasteSignals; archetype: string } | null>(null);
  const [visions, setVisions] = useState<ProjectVision[]>([]);
  const [matchInfo, setMatchInfo] = useState<{
    matchScore: number;
    sharedSkills: string[];
  } | null>(null);
  const [isEventOrganizer, setIsEventOrganizer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // In dev bypass mode, use mock data
        if (isDevBypassEnabled() && isDevAuthenticated()) {
          const mockUser = mockUsers.find((u) => u.id === userId);
          const mockMatch = mockMatches.find((m) => m.userId === userId);

          if (mockUser) {
            setUser(mockUser);
            setSkills(mockMatch?.skills || []);
            if (mockMatch) {
              setMatchInfo({
                matchScore: mockMatch.matchScore,
                sharedSkills: mockMatch.sharedSkills,
              });
            }
            // Check event organizer status from localStorage in dev mode
            const storedEventOrganizer = localStorage.getItem("dev_event_organizer_status");
            setIsEventOrganizer(storedEventOrganizer === "true");
          }
          setLoading(false);
          return;
        }

        // Fetch real data from InsForge
        const { data: userData } = await insforge.database
          .from("users")
          .select("*")
          .eq("id", userId);

        const userRecord = userData?.[0] as User | undefined;

        const { data: skillsData } = await insforge.database
          .from("skills")
          .select("*")
          .eq("user_id", userId);

        // Fetch vibe check responses
        const { data: vibeData } = await insforge.database
          .from("vibe_check_responses")
          .select("responses")
          .eq("user_id", userId)
          .single();

        // Fetch taste profile
        const { data: tasteData } = await insforge.database
          .from("user_taste_profiles")
          .select("taste_signals, builder_archetype")
          .eq("user_id", userId)
          .single();

        // Fetch project visions
        const { data: visionsData } = await insforge.database
          .from("project_visions")
          .select("*")
          .eq("user_id", userId);

        // Get match info from the matches edge function
        const { data: authData } = await insforge.auth.getCurrentUser();
        const currentUser = authData?.user;
        if (currentUser) {
          // Extract current user's DB id to call matches function
          const avatarUrl = currentUser.profile?.avatar_url || "";
          const idMatch = avatarUrl.match(/\/u\/(\d+)/);
          if (idMatch) {
            const ghId = idMatch[1];
            const { data: dbUsers } = await insforge.database
              .from("users")
              .select("id")
              .eq("github_id", ghId);
            const currentDbUser = dbUsers?.[0] as { id: string } | undefined;
            if (currentDbUser) {
              const { data: matchesData } = await insforge.functions.invoke(
                "taste-based-matches",
                { body: { userId: currentDbUser.id } }
              );
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const matchData = matchesData?.matches?.find(
                (m: any) => m.userId === userId
              );
              if (matchData) {
                setMatchInfo({
                  matchScore: matchData.matchScore,
                  sharedSkills: matchData.sharedSkills || [],
                });
              }
            }
          }
        }

        if (userRecord) {
          setUser(userRecord);
        }
        setSkills(skillsData?.map((s: Skill) => s.skill_name) || []);
        
        if (vibeData?.responses) {
          setVibeCheck(vibeData.responses as VibeCheckResponse);
        }
        
        if (tasteData) {
          setTasteProfile({
            signals: tasteData.taste_signals as TasteSignals,
            archetype: tasteData.builder_archetype
          });
        }
        
        if (visionsData) {
          setVisions(visionsData as ProjectVision[]);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        // Fall back to mock data
        const mockUser = mockUsers.find((u) => u.id === userId);
        const mockMatch = mockMatches.find((m) => m.userId === userId);

        if (mockUser) {
          setUser(mockUser);
          setSkills(mockMatch?.skills || []);
          if (mockMatch) {
            setMatchInfo({
              matchScore: mockMatch.matchScore,
              sharedSkills: mockMatch.sharedSkills,
            });
          }
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">User not found</p>
          <Link
            href="/dashboard"
            className="text-indigo-600 hover:text-indigo-700 mt-2 inline-block"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const formatLabel = (key: string) => {
    return key.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Matches</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Profile content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Profile header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-12">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {user.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg"
                />
              )}
              <div className="text-center sm:text-left">
                <h1 className="text-3xl font-bold text-white">{user.name}</h1>
                {user.location && (
                  <div className="flex items-center justify-center sm:justify-start gap-1 text-indigo-100 mt-2">
                    <MapPin className="w-4 h-4" />
                    <span>{user.location}</span>
                  </div>
                )}
              </div>

              {matchInfo && (
                <div className="sm:ml-auto">
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${getScoreColor(matchInfo.matchScore)}`}
                  >
                    <span className="text-2xl font-bold">
                      {matchInfo.matchScore}%
                    </span>
                    <span className="text-sm font-medium">Match</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Profile details */}
          <div className="p-8 space-y-8">
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* About */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" />
                    About
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {user.bio || "No bio available."}
                  </p>
                </div>

                {/* Dream Project */}
                {user.dream_project && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                    <h3 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                      <Rocket className="w-4 h-4" />
                      Dream Project
                    </h3>
                    <p className="text-amber-800">{user.dream_project}</p>
                  </div>
                )}

                {/* Domain Interests */}
                {user.domain_interests && user.domain_interests.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-500" />
                      Domain Interests
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {user.domain_interests.map((domain) => (
                        <span
                          key={domain}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium border border-indigo-100"
                        >
                          {domain.replace(/-/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Code className="w-5 h-5 text-indigo-500" />
                    Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.length > 0 ? (
                      skills.map((skill) => (
                        <span
                          key={skill}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                            matchInfo?.sharedSkills?.includes(skill)
                              ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                              : "bg-gray-100 text-gray-700 border border-gray-200"
                          }`}
                        >
                          {skill}
                          {matchInfo?.sharedSkills?.includes(skill) && (
                            <span className="ml-1.5 text-indigo-500">★</span>
                          )}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No skills listed yet.</p>
                    )}
                  </div>

                  {matchInfo && matchInfo.sharedSkills?.length > 0 && (
                    <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                      <p className="text-sm text-indigo-700">
                        <span className="font-semibold">Shared:</span>{" "}
                        {matchInfo.sharedSkills.join(", ")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Social Links */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Links</h3>
                  <div className="flex flex-wrap gap-3">
                    {user.html_url && user.html_url.startsWith('https://github.com/') && (
                      <a
                        href={user.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <GitHubIcon className="w-4 h-4" />
                        GitHub
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {(user as any).linkedin_url && (
                      <a
                        href={(user as any).linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <LinkedInIcon className="w-4 h-4" />
                        LinkedIn
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {(user as any).google_scholar_url && (
                      <a
                        href={(user as any).google_scholar_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                      >
                        <GoogleScholarIcon className="w-4 h-4" />
                        Scholar
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Status & Availability */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-indigo-500" />
                    Status
                  </h3>
                  <div className="space-y-3">
                    {user.project_status && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Project Status</span>
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium capitalize">
                          {user.project_status}
                        </span>
                      </div>
                    )}
                    {user.availability && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Availability</span>
                        <span className="flex items-center gap-1 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {user.availability}
                        </span>
                      </div>
                    )}
                    {user.experience_level && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Experience</span>
                        <span className="text-sm capitalize">{user.experience_level}</span>
                      </div>
                    )}
                    {user.builder_philosophy && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Philosophy</span>
                        <span className="text-sm capitalize">{user.builder_philosophy}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Taste Profile */}
                {tasteProfile && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-purple-500" />
                      Digital DNA
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Velocity</span>
                          <span className="font-medium">{tasteProfile.signals.velocity_score}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${tasteProfile.signals.velocity_score}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Collaboration</span>
                          <span className="font-medium">{tasteProfile.signals.collaboration_score}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-pink-500 rounded-full" style={{ width: `${tasteProfile.signals.collaboration_score}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Documentation</span>
                          <span className="font-medium">{tasteProfile.signals.readme_score}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${tasteProfile.signals.readme_score}%` }} />
                        </div>
                      </div>
                      <div className="pt-2 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-pink-500" />
                        <span className="text-sm text-gray-600">
                          Curious about: {tasteProfile.signals.curiosity_areas.join(", ")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Vibe Check */}
                {vibeCheck && (
                  <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-4 border border-green-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-green-500" />
                      Vibe Check
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(vibeCheck).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{formatLabel(key)}</span>
                          <span className="text-sm font-medium text-gray-900 capitalize">{value.replace(/-/g, " ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Project Visions */}
            {visions.length > 0 && (
              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  Project Visions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visions.map((vision) => (
                    <div key={vision.id} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{vision.title}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          vision.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {vision.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{vision.description}</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {vision.domain_tags?.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                      {vision.looking_for_archetypes && vision.looking_for_archetypes.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-indigo-600">
                          <Users className="w-4 h-4" />
                          <span>Looking for: {vision.looking_for_archetypes.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Event Organizer Card */}
          {isEventOrganizer && (
            <div className="mt-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Event Organizer
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                        <FlaskConical className="w-3 h-3" />
                        Experimental
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {user.name} hosts events on Meetup and Luma. Check out
                      the events page to see upcoming gatherings!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Connect CTA */}
        {user.html_url && user.html_url.startsWith('https://github.com/') && (
          <div className="mt-8 text-center">
            <a
              href={user.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              Connect on GitHub
              <ExternalLink className="w-4 h-4" />
            </a>
            <p className="text-sm text-gray-500 mt-3">
              Reach out to collaborate on projects!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
