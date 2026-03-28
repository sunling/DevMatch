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
  Calendar,
  FlaskConical,
  Heart,
  Target,
  Zap,
  Sparkles,
  Briefcase,
  Clock,
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
  const [isEventOrganizer, setIsEventOrganizer] = useState(false);
  const [bio, setBio] = useState("");
  const [dreamProject, setDreamProject] = useState("");
  const [availability, setAvailability] = useState("");
  const [projectStatus, setProjectStatus] = useState("");
  
  // Vibe check form state
  const [vibeResponses, setVibeResponses] = useState({
    "boring-problem": "",
    "team-role": "",
    "time-horizon": "",
    "overhyped-tech": "",
    "collaboration-style": "",
  });
  const [hasVibeCheck, setHasVibeCheck] = useState(false);

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
          const storedEventOrganizer = localStorage.getItem("dev_event_organizer_status");
          setIsEventOrganizer(storedEventOrganizer === "true");
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
          setBio(userRecord.bio || "");
          setDreamProject((userRecord as any).dream_project || "");
          setAvailability((userRecord as any).availability || "");
          setProjectStatus((userRecord as any).project_status || "");
          // Check if user has mentor role/flag in metadata
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setIsMentor((authData.user.profile as any)?.is_mentor || false);
          
          // Load existing vibe check responses
          const { data: vibeData } = await insforge.database
            .from("vibe_check_responses")
            .select("responses")
            .eq("user_id", userRecord.id)
            .single();
          
          if (vibeData?.responses) {
            setVibeResponses(vibeData.responses as typeof vibeResponses);
            setHasVibeCheck(true);
          }
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
        localStorage.setItem("dev_event_organizer_status", isEventOrganizer.toString());
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
        .update({ 
          name: displayName,
          bio,
          dream_project: dreamProject,
          availability,
          project_status: projectStatus,
        })
        .eq("id", user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Save or update vibe check responses
      if (Object.values(vibeResponses).some(v => v !== "")) {
        const { error: vibeError } = await insforge.database
          .from("vibe_check_responses")
          .upsert({
            user_id: user.id,
            responses: vibeResponses,
          }, { onConflict: "user_id" });

        if (vibeError) {
          throw new Error(vibeError.message);
        }
        setHasVibeCheck(true);
      }

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

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  placeholder="Tell others about yourself..."
                />
              </div>

              {/* Dream Project */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dream Project
                </label>
                <textarea
                  value={dreamProject}
                  onChange={(e) => setDreamProject(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  placeholder="What would you build if you had unlimited resources?"
                />
              </div>

              {/* Availability & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Availability
                  </label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  >
                    <option value="">Select availability</option>
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="weekends">Weekends only</option>
                    <option value="evenings">Evenings only</option>
                    <option value="not-available">Not available</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Status
                  </label>
                  <select
                    value={projectStatus}
                    onChange={(e) => setProjectStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                  >
                    <option value="">Select status</option>
                    <option value="exploring">Exploring ideas</option>
                    <option value="building">Actively building</option>
                    <option value="hiring">Looking for collaborators</option>
                    <option value="complete">Project complete</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Vibe Check Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Vibe Check
                  </h2>
                  <p className="text-sm text-gray-500">
                    Help us understand your work style and preferences
                  </p>
                </div>
                {hasVibeCheck && (
                  <span className="ml-auto px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    Completed
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Boring Problem */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What kind of problem bores you the most?
                </label>
                <select
                  value={vibeResponses["boring-problem"]}
                  onChange={(e) => setVibeResponses({...vibeResponses, "boring-problem": e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-colors"
                >
                  <option value="">Select an option</option>
                  <option value="legacy-migration">Migrating legacy code</option>
                  <option value="crud-app">Building yet another CRUD app</option>
                  <option value="landing-page">Creating landing pages</option>
                  <option value="bug-fixing">Fixing bugs all day</option>
                </select>
              </div>

              {/* Team Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  In a team, you naturally...
                </label>
                <select
                  value={vibeResponses["team-role"]}
                  onChange={(e) => setVibeResponses({...vibeResponses, "team-role": e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-colors"
                >
                  <option value="">Select an option</option>
                  <option value="designs">Design the architecture</option>
                  <option value="breaks">Break things to find edge cases</option>
                  <option value="protects">Protect code quality</option>
                  <option value="connects">Connect people and ideas</option>
                </select>
              </div>

              {/* Time Horizon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your preferred time horizon for shipping?
                </label>
                <select
                  value={vibeResponses["time-horizon"]}
                  onChange={(e) => setVibeResponses({...vibeResponses, "time-horizon": e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-colors"
                >
                  <option value="">Select an option</option>
                  <option value="ship-week">Ship something this week</option>
                  <option value="ship-months">Ship in a few months</option>
                  <option value="ship-years">Build for the long term</option>
                </select>
              </div>

              {/* Overhyped Tech */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Most overhyped tech right now?
                </label>
                <select
                  value={vibeResponses["overhyped-tech"]}
                  onChange={(e) => setVibeResponses({...vibeResponses, "overhyped-tech": e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-colors"
                >
                  <option value="">Select an option</option>
                  <option value="ai-everything">AI everything</option>
                  <option value="web3">Web3/Blockchain</option>
                  <option value="nocode">No-code tools</option>
                  <option value="microservices">Microservices</option>
                </select>
              </div>

              {/* Collaboration Style */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your ideal collaboration style?
                </label>
                <select
                  value={vibeResponses["collaboration-style"]}
                  onChange={(e) => setVibeResponses({...vibeResponses, "collaboration-style": e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-colors"
                >
                  <option value="">Select an option</option>
                  <option value="async-focused">Async, focused work</option>
                  <option value="fast-fun">Fast and fun</option>
                  <option value="thoughtful-kind">Thoughtful and kind</option>
                  <option value="ambitious-challenging">Ambitious and challenging</option>
                </select>
              </div>
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

          {/* Event Organizer Settings Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Event Organizer
                  </h2>
                  <p className="text-sm text-gray-500">
                    Manage your event hosting capabilities
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                  <FlaskConical className="w-3.5 h-3.5" />
                  Experimental
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-base font-medium text-gray-900">
                    Enable Event Organizer Mode
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    When enabled, you can automatically sync events from Meetup
                    and Luma to the DevMatch events page
                  </p>
                </div>
                <button
                  onClick={() => setIsEventOrganizer(!isEventOrganizer)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                    isEventOrganizer ? "bg-orange-600" : "bg-gray-300"
                  }`}
                  role="switch"
                  aria-checked={isEventOrganizer}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      isEventOrganizer ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {isEventOrganizer && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-900">
                        Event Organizer mode is active
                      </p>
                      <p className="text-sm text-orange-700 mt-1">
                        Your events from Meetup and Luma will be automatically
                        linked to your DevMatch profile. This feature is
                        experimental and may require additional setup.
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
