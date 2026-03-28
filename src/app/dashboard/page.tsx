"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@insforge/sdk";

interface UserData {
  id: string;
  github_id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  html_url: string | null;
}

interface Skill {
  skill_name: string;
  skill_count: number;
}

export default function Dashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
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

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function loadUserData(client: ReturnType<typeof createClient>, authUser: any) {
      // Extract GitHub numeric ID from avatar URL (format: https://avatars.githubusercontent.com/u/{ID}?...)
      const avatarUrl = authUser.profile?.avatar_url || "";
      const idMatch = avatarUrl.match(/\/u\/(\d+)/);
      if (!idMatch) {
        throw new Error("Could not determine GitHub user ID from profile");
      }
      const githubId = idMatch[1];

      // Fetch full GitHub profile by numeric ID
      const ghRes = await fetch(
        `https://api.github.com/user/${githubId}`
      );
      if (!ghRes.ok) {
        throw new Error("Failed to fetch GitHub profile");
      }
      const ghProfile = await ghRes.json();

      // Check if user already exists
      const { data: existingUsers } = await client.database
        .from("users")
        .select()
        .eq("github_id", githubId);

      const userData: Omit<UserData, "id"> = {
        github_id: githubId,
        name: ghProfile.name || ghProfile.login,
        avatar_url: ghProfile.avatar_url,
        bio: ghProfile.bio,
        location: ghProfile.location,
        html_url: ghProfile.html_url,
      };

      let dbUser: UserData;

      if (existingUsers && existingUsers.length > 0) {
        const { data: updated, error: updateError } = await client.database
          .from("users")
          .update(userData)
          .eq("github_id", githubId)
          .select();
        if (updateError) throw new Error(updateError.message);
        dbUser = updated![0] as UserData;
      } else {
        const { data: inserted, error: insertError } = await client.database
          .from("users")
          .insert([userData])
          .select();
        if (insertError) throw new Error(insertError.message);
        dbUser = inserted![0] as UserData;
      }

      setUser(dbUser);

      // Load existing skills
      const { data: existingSkills } = await client.database
        .from("skills")
        .select("skill_name, skill_count")
        .eq("user_id", dbUser.id);

      if (existingSkills && existingSkills.length > 0) {
        setSkills(existingSkills as Skill[]);
      }
    }

    async function init() {
      try {
        // Create a fresh client so detectAuthCallback() runs with the current URL
        const client = getClient();

        // Get current user — SDK internally awaits the OAuth code exchange
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
          window.location.href = "/";
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
  }, []);

  const handleAnalyze = async () => {
    if (!user) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_id: user.github_id }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Analysis failed");
      }
      const data = await res.json();
      setSkills(data.skills);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSignOut = async () => {
    const client = getClient();
    await client.auth.signOut();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-300">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-red-500">Not authenticated. Redirecting...</p>
      </div>
    );
  }

  const categoryColors: Record<string, string> = {
    Frontend: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    Backend:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    DevOps:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    "AI/ML":
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {user.name}
              </h1>
              {user.bio && (
                <p className="text-gray-600 dark:text-gray-400">{user.bio}</p>
              )}
              {user.location && (
                <p className="text-sm text-gray-500">{user.location}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Sign out
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Skill Profile
            </h2>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {analyzing ? "Analyzing..." : "Analyze Repos"}
            </button>
          </div>

          {skills.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Click &quot;Analyze Repos&quot; to categorize your skills from
              your GitHub repositories.
            </p>
          ) : (
            <div className="space-y-3">
              {skills.map((skill) => (
                <div
                  key={skill.skill_name}
                  className="flex items-center justify-between"
                >
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${categoryColors[skill.skill_name] || "bg-gray-100 text-gray-800"}`}
                  >
                    {skill.skill_name}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">
                    {skill.skill_count} repo{skill.skill_count !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {user.html_url && (
          <a
            href={user.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View GitHub Profile
          </a>
        )}
      </div>
    </div>
  );
}
