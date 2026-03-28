"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, UserPlus, Activity, Sparkles } from "lucide-react";
import { MatchNotification, ActivityNotification } from "@/hooks/useRealtime";

interface RealtimeToastProps {
  matchNotification: MatchNotification | null;
  activityNotification: ActivityNotification | null;
  onCloseMatch: () => void;
  onCloseActivity: () => void;
}

export function RealtimeToast({
  matchNotification,
  activityNotification,
  onCloseMatch,
  onCloseActivity,
}: RealtimeToastProps) {
  const [visibleMatch, setVisibleMatch] = useState<MatchNotification | null>(null);
  const [visibleActivity, setVisibleActivity] = useState<ActivityNotification | null>(null);

  // Handle match notification with animation delay
  useEffect(() => {
    if (matchNotification) {
      setVisibleMatch(matchNotification);
      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        setVisibleMatch(null);
        onCloseMatch();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [matchNotification, onCloseMatch]);

  // Handle activity notification with animation delay
  useEffect(() => {
    if (activityNotification) {
      setVisibleActivity(activityNotification);
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setVisibleActivity(null);
        onCloseActivity();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activityNotification, onCloseActivity]);

  const handleCloseMatch = () => {
    setVisibleMatch(null);
    onCloseMatch();
  };

  const handleCloseActivity = () => {
    setVisibleActivity(null);
    onCloseActivity();
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
      {/* Match Notification */}
      {visibleMatch && (
        <div className="bg-white rounded-xl shadow-2xl border border-indigo-100 p-4 animate-in slide-in-from-right-full duration-300">
          <div className="flex items-start gap-3">
            <div className="relative">
              {visibleMatch.newUserAvatar ? (
                <img
                  src={visibleMatch.newUserAvatar}
                  alt={visibleMatch.newUserName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-indigo-500">
                  <UserPlus className="w-6 h-6 text-indigo-600" />
                </div>
              )}
              <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-1">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900 truncate">
                  New Match!
                </h4>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                  {visibleMatch.sharedSkillCount} skills
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {visibleMatch.message}
              </p>
              {visibleMatch.newUserLocation && (
                <p className="text-xs text-gray-500 mt-1">
                  📍 {visibleMatch.newUserLocation}
                </p>
              )}
              <Link
                href={`/profile/${visibleMatch.newUserId}`}
                onClick={handleCloseMatch}
                className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                View Profile →
              </Link>
            </div>
            
            <button
              onClick={handleCloseMatch}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Activity Notification */}
      {visibleActivity && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl shadow-lg border border-emerald-100 p-3 animate-in slide-in-from-right-full duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700">
                {visibleActivity.message}
              </p>
              {visibleActivity.userLocation && (
                <p className="text-xs text-gray-500 mt-0.5">
                  📍 {visibleActivity.userLocation}
                </p>
              )}
            </div>
            
            <button
              onClick={handleCloseActivity}
              className="p-1 hover:bg-emerald-100 rounded-full transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Connection status indicator component
interface ConnectionStatusProps {
  isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-md border border-gray-200">
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
        }`}
      />
      <span className="text-xs font-medium text-gray-600">
        {isConnected ? "Live" : "Offline"}
      </span>
    </div>
  );
}
