"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Code } from "lucide-react";
import { insforge } from "@/lib/insforge";
import ProjectBoard from "@/components/ProjectBoard";

export default function ProjectsPage() {
  useEffect(() => {
    insforge.auth.getCurrentUser().then(({ data }) => {
      if (!data?.user) {
        console.log("Browsing as anonymous user");
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Code className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">DevMatch</h1>
                  <p className="text-xs text-gray-500">Project Board</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProjectBoard />
      </main>
    </div>
  );
}
