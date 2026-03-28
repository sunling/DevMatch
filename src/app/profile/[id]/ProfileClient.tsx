"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, ExternalLink, Loader2 } from "lucide-react";
import { insforge, User, Skill } from "@/lib/insforge";
import { mockUsers, mockMatches } from "@/lib/mock-data";
import { isDevBypassEnabled, isDevAuthenticated } from "@/lib/dev-auth";

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

interface ProfileClientProps {
  userId: string;
}

export default function ProfileClient({ userId }: ProfileClientProps) {
  const [user, setUser] = useState<User | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [matchInfo, setMatchInfo] = useState<{
    matchScore: number;
    sharedSkills: string[];
  } | null>(null);
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
                "matches",
                { body: { userId: currentDbUser.id } }
              );
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const matchData = matchesData?.matches?.find(
                (m: any) => m.userId === userId
              );
              if (matchData) {
                setMatchInfo({
                  matchScore: matchData.matchScore,
                  sharedSkills: matchData.sharedSkills,
                });
              }
            }
          }
        }

        if (userRecord) {
          setUser(userRecord);
        }
        setSkills(
          skillsData?.map((s: Skill) => s.skill_name) || []
        );
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
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* About */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  About
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  {user.bio || "No bio available."}
                </p>

                {user.html_url && (
                  <a
                    href={user.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <GitHubIcon className="w-4 h-4" />
                    View GitHub Profile
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Skills */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {skills.length > 0 ? (
                    skills.map((skill) => (
                      <span
                        key={skill}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                          matchInfo?.sharedSkills.includes(skill)
                            ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                            : "bg-gray-100 text-gray-700 border border-gray-200"
                        }`}
                      >
                        {skill}
                        {matchInfo?.sharedSkills.includes(skill) && (
                          <span className="ml-1.5 text-indigo-500">
                            &#9733;
                          </span>
                        )}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No skills listed yet.
                    </p>
                  )}
                </div>

                {matchInfo && matchInfo.sharedSkills.length > 0 && (
                  <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                    <h3 className="text-sm font-semibold text-indigo-900 mb-2">
                      Shared Skills
                    </h3>
                    <p className="text-sm text-indigo-700">
                      You and {user.name} both work with:{" "}
                      <span className="font-medium">
                        {matchInfo.sharedSkills.join(", ")}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Connect CTA */}
        {user.html_url && (
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
