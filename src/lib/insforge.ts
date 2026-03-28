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
