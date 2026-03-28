"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { insforge } from "@/lib/insforge";
import {
  isDevBypassEnabled,
  devSignIn,
  isDevAuthenticated,
} from "@/lib/dev-auth";
import GitHubMatcher from "@/components/GitHubMatcher";

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    setDevMode(isDevBypassEnabled());
    if (isDevAuthenticated()) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleDevBypass = () => {
    devSignIn();
    router.push("/dashboard");
  };

  const handleGitHubLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await insforge.auth.signInWithOAuth({
        provider: "github",
        redirectTo: `${window.location.origin}/dashboard`,
      });

      if (error) {
        console.error("OAuth error:", error);
        alert("Failed to sign in with GitHub. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 px-4 py-8">
      <div className="max-w-md w-full mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-white"
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">DevMatch</h1>
            <p className="text-gray-600">
              Connect with developers based on your GitHub activity
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 text-left">
              <h3 className="font-semibold text-gray-900 mb-2">
                How it works:
              </h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold">1.</span>
                  <span>Sign in with your GitHub account</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold">2.</span>
                  <span>
                    We analyze your repos and extract your skills
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold">3.</span>
                  <span>Get matched with compatible developers</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleGitHubLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GitHubIcon className="w-5 h-5" />
              {isLoading ? "Connecting..." : "Continue with GitHub"}
            </button>

            <p className="text-xs text-gray-500">
              By signing in, you agree to share your public GitHub profile
              information.
            </p>

            {devMode && (
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleDevBypass}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Dev Bypass (Skip Auth)
                </button>
                <p className="text-xs text-amber-600 mt-2">
                  Quick access for UI development
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Built with{" "}
            <span className="font-semibold text-indigo-600">Qoder</span> +{" "}
            <span className="font-semibold text-indigo-600">InsForge</span>
          </p>
        </div>
      </div>

      {/* Try Without Login Section */}
      <div className="max-w-2xl w-full mx-auto mt-8">
        <GitHubMatcher />
      </div>

      {/* Project Board Link */}
      <div className="max-w-md w-full mx-auto mt-8">
        <a
          href="/projects"
          className="block bg-white rounded-xl border border-gray-200 p-6 text-center hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          </div>
          <h3 className="font-bold text-gray-900">Project Board</h3>
          <p className="text-sm text-gray-600 mt-1">
            Find collaborators for your next project
          </p>
        </a>
      </div>
    </div>
  );
}
