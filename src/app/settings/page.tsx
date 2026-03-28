"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  User,
  GraduationCap,
  Save,
  Check,
} from "lucide-react";
import { insforge, User as UserType } from "@/lib/insforge";
import {
  isDevBypassEnabled,
  isDevAuthenticated,
  getStoredDevUser,
} from "@/lib/dev-auth";
import { mockCurrentUser } from "@/lib/mock-data";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [isMentor, setIsMentor] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        // Check for dev bypass auth first
        if (isDevBypassEnabled() && isDevAuthenticated()) {
          const devUser = getStoredDevUser() || mockCurrentUser;
          setUser(devUser);
          setDisplayName(devUser.name);
          // In dev mode, check localStorage for mentor status
          const storedMentor = localStorage.getItem("dev_mentor_status");
          setIsMentor(storedMentor === "true");
          setLoading(false);
          return;
        }

        // Get current user from InsForge
        const { data: authData, error: authError } =
          await insforge.auth.getCurrentUser();

        if (authError || !authData?.user) {
          router.push("/login");
          return;
        }

        // Extract GitHub numeric ID from avatar URL
        const avatarUrl = authData.user.profile?.avatar_url || "";
        const idMatch = avatarUrl.match(/\/u\/(\d+)/);
        if (!idMatch) {
          throw new Error("Could not determine GitHub user ID from profile");
        }
        const githubId = idMatch[1];

        // Fetch user from database
        const { data: userData, error: userError } = await insforge.database
          .from("users")
          .select("*")
          .eq("github_id", githubId)
          .single();

        if (userError) {
          throw new Error(userError.message);
        }

        if (userData) {
          const userRecord = userData as UserType;
          setUser(userRecord);
          setDisplayName(userRecord.name);
          // Check if user has mentor role/flag in metadata
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setIsMentor((authData.user.profile as any)?.is_mentor || false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load user");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [router]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      // In dev bypass mode, update localStorage
      if (isDevBypassEnabled() && isDevAuthenticated()) {
        localStorage.setItem("dev_mentor_status", isMentor.toString());
        // Update the stored dev user name
        const devUser = getStoredDevUser() || mockCurrentUser;
        const updatedUser = { ...devUser, name: displayName };
        localStorage.setItem("dev_user", JSON.stringify(updatedUser));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        setSaving(false);
        return;
      }

      // Update user in database
      const { error: updateError } = await insforge.database
        .from("users")
        .update({ name: displayName })
        .eq("id", user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Update mentor status in user metadata if needed
      // Note: This would require a custom endpoint or function to update auth metadata
      // For now, we'll just save the display name

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

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
              <span className="font-medium">Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-2">
            Customize your profile and preferences
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Profile Settings Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Profile Information
                  </h2>
                  <p className="text-sm text-gray-500">
                    Update your display name and public profile
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Display Name */}
              <div>
                <label
                  htmlFor="displayName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Display Name
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2 border border-indigo-300 bg-white text-indigo-600 placeholder-indigo-400 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  placeholder="Enter your display name"
                />
                <p className="text-sm text-gray-500 mt-1">
                  This is how other developers will see you on DevMatch
                </p>
              </div>

              {/* Avatar Preview */}
              {user?.avatar_url && (
                <div className="flex items-center gap-4">
                  <img
                    src={user.avatar_url}
                    alt={displayName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Profile Picture
                    </p>
                    <p className="text-sm text-gray-500">
                      Your GitHub avatar is used automatically
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mentor Settings Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Mentor Status
                  </h2>
                  <p className="text-sm text-gray-500">
                    Offer your expertise to help other developers
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-medium text-gray-900">
                    Available as a Mentor
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    When enabled, other developers can see that you are open to
                    mentoring and may reach out for guidance
                  </p>
                </div>
                <button
                  onClick={() => setIsMentor(!isMentor)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    isMentor ? "bg-indigo-600" : "bg-gray-300"
                  }`}
                  role="switch"
                  aria-checked={isMentor}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      isMentor ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {isMentor && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="flex items-start gap-3">
                    <GraduationCap className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-purple-900">
                        You are now listed as a mentor
                      </p>
                      <p className="text-sm text-purple-700 mt-1">
                        Other developers will see a mentor badge on your profile
                        and may reach out for help with their projects.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-4">
            {saved && (
              <div className="flex items-center gap-2 text-green-600">
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium">Changes saved!</span>
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
