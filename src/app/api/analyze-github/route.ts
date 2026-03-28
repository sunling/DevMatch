import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@insforge/sdk";

const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
});

interface GitHubRepo {
  language: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { github_id } = body;

    if (!github_id) {
      return NextResponse.json(
        { error: "github_id is required" },
        { status: 400 }
      );
    }

    // Look up the user in our database
    const { data: users, error: userError } = await insforge.database
      .from("users")
      .select()
      .eq("github_id", String(github_id));

    if (userError || !users || users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = users[0] as { id: string; name: string };

    // Get the GitHub username from our stored data
    // Fetch user info from GitHub by numeric ID to get the login
    const ghUserRes = await fetch(
      `https://api.github.com/user/${github_id}`,
      {
        headers: { Accept: "application/vnd.github.v3+json" },
      }
    );
    if (!ghUserRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch GitHub user" },
        { status: 502 }
      );
    }
    const ghUser = await ghUserRes.json();
    const login = ghUser.login;

    // Fetch last 10 repos sorted by most recently pushed
    const reposRes = await fetch(
      `https://api.github.com/users/${login}/repos?sort=pushed&per_page=10`,
      {
        headers: { Accept: "application/vnd.github.v3+json" },
      }
    );
    if (!reposRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch repositories" },
        { status: 502 }
      );
    }

    const repos: GitHubRepo[] = await reposRes.json();
    const languages = repos
      .map((r) => r.language)
      .filter((lang): lang is string => lang !== null);

    if (languages.length === 0) {
      return NextResponse.json(
        { error: "No languages found in recent repositories" },
        { status: 422 }
      );
    }

    // Use InsForge AI Gateway to categorize languages
    const completion = await insforge.ai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You categorize programming languages into exactly these categories: Frontend, Backend, DevOps, AI/ML.
Respond ONLY with valid JSON — an array of objects with "language" and "category" fields.
No markdown, no explanation, just the JSON array.

Rules:
- Frontend: HTML, CSS, JavaScript, TypeScript (when used with frameworks like React/Vue/Angular), Svelte, Dart (Flutter), Swift (SwiftUI)
- Backend: Java, Python, Ruby, Go, Rust, C#, PHP, Kotlin, Scala, Elixir, C, C++, TypeScript (Node.js/server)
- DevOps: Shell, Dockerfile, HCL, Nix, Makefile, PowerShell, Batchfile
- AI/ML: Jupyter Notebook, R, Julia, MATLAB

If a language could fit multiple categories, pick the most common usage. TypeScript defaults to Frontend unless context says otherwise.`,
        },
        {
          role: "user",
          content: `Categorize these languages from a GitHub user's repos: ${JSON.stringify(languages)}`,
        },
      ],
      temperature: 0,
    });

    const aiResponse = completion.choices[0]?.message?.content || "[]";

    let categorized: { language: string; category: string }[];
    try {
      // Strip potential markdown fencing
      const cleaned = aiResponse.replace(/```json\n?|\n?```/g, "").trim();
      categorized = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI categorization failed to return valid JSON" },
        { status: 500 }
      );
    }

    // Aggregate counts per category
    const categoryCounts: Record<string, number> = {};
    for (const item of categorized) {
      const cat = item.category;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    // Delete existing skills for this user, then insert new ones
    await insforge.database
      .from("skills")
      .delete()
      .eq("user_id", user.id);

    const skillRows = Object.entries(categoryCounts).map(
      ([skill_name, skill_count]) => ({
        user_id: user.id,
        skill_name,
        skill_count,
      })
    );

    const { error: insertError } = await insforge.database
      .from("skills")
      .insert(skillRows)
      .select();

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to store skills: " + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      skills: skillRows.map(({ skill_name, skill_count }) => ({
        skill_name,
        skill_count,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
