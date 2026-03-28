"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { insforge } from "@/lib/insforge";

export interface MatchNotification {
  newUserId: string;
  newUserName: string;
  newUserAvatar: string | null;
  newUserLocation: string | null;
  sharedSkillCount: number;
  message: string;
  meta?: {
    channel: string;
    messageId: string;
    senderType: "system" | "user";
    timestamp: Date;
  };
}

export interface ActivityNotification {
  userId: string;
  userName: string;
  userLocation: string | null;
  message: string;
  meta?: {
    channel: string;
    messageId: string;
    senderType: "system" | "user";
    timestamp: Date;
  };
}

export function useRealtime(userId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [matchNotification, setMatchNotification] = useState<MatchNotification | null>(null);
  const [activityNotification, setActivityNotification] = useState<ActivityNotification | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const subscribedRef = useRef(false);

  const clearMatchNotification = useCallback(() => {
    setMatchNotification(null);
  }, []);

  const clearActivityNotification = useCallback(() => {
    setActivityNotification(null);
  }, []);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    const setupRealtime = async () => {
      try {
        // Connect to realtime
        await insforge.realtime.connect();
        
        if (!isMounted) return;
        setIsConnected(true);
        setConnectionError(null);

        // Subscribe to user's personal match channel
        const matchSubResult = await insforge.realtime.subscribe(`matches:user:${userId}`);
        if (!matchSubResult.ok && matchSubResult.error) {
          console.error("Failed to subscribe to match channel:", matchSubResult.error);
          setConnectionError(matchSubResult.error.message);
          return;
        }

        // Subscribe to global activity
        const activitySubResult = await insforge.realtime.subscribe("activity:global");
        if (!activitySubResult.ok && activitySubResult.error) {
          console.error("Failed to subscribe to activity channel:", activitySubResult.error);
        }

        subscribedRef.current = true;

        // Listen for new match events
        insforge.realtime.on("new_match", (payload: MatchNotification) => {
          if (isMounted) {
            setMatchNotification(payload);
          }
        });

        // Listen for global activity
        insforge.realtime.on("user_joined", (payload: ActivityNotification) => {
          if (isMounted && payload.userId !== userId) {
            setActivityNotification(payload);
          }
        });

        // Handle connection events
        insforge.realtime.on("connect", () => {
          if (isMounted) setIsConnected(true);
        });

        insforge.realtime.on("disconnect", () => {
          if (isMounted) setIsConnected(false);
        });

        insforge.realtime.on("error", (err: { code: string; message: string }) => {
          console.error("Realtime error:", err.code, err.message);
          if (isMounted) setConnectionError(err.message);
        });

      } catch (err) {
        console.error("Failed to connect to realtime:", err);
        if (isMounted) {
          setConnectionError(err instanceof Error ? err.message : "Connection failed");
        }
      }
    };

    setupRealtime();

    return () => {
      isMounted = false;
      if (subscribedRef.current) {
        insforge.realtime.unsubscribe(`matches:user:${userId}`);
        insforge.realtime.unsubscribe("activity:global");
        subscribedRef.current = false;
      }
      insforge.realtime.disconnect();
    };
  }, [userId]);

  return {
    isConnected,
    matchNotification,
    activityNotification,
    connectionError,
    clearMatchNotification,
    clearActivityNotification,
  };
}
