import { createClient } from "@insforge/sdk";

export const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
});

export type User = {
  id: string;
  github_id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  html_url: string | null;
  personality_type?: string;
  personality_title?: string;
  personality_description?: string;
  personality_rarity?: "common" | "rare" | "epic" | "legendary";
};

export type Skill = {
  id: string;
  user_id: string;
  skill_name: string;
  skill_count: number;
};

export type Personality = {
  type: string;
  title: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
};

export type Match = {
  userId: string;
  name: string;
  avatar: string;
  skills: string[];
  matchScore: number;
  sharedSkills: string[];
  location?: string;
  bio?: string;
  htmlUrl?: string;
  personality?: Personality;
};

export type Event = {
  id: string;
  event_url: string | null;
  event_name: string;
  event_date: string | null;
  event_description: string | null;
  platform: string;
  host_user_id: string | null;
  join_code: string;
  created_at: string;
  host_name?: string;
  host_avatar?: string;
  participant_count?: number;
};

export type EventParticipant = {
  id: string;
  event_id: string;
  user_id: string;
  joined_at: string;
  user?: User;
};
