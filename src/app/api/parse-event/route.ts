import { NextResponse } from "next/server";

// Detect platform from URL
function detectPlatform(url: string): "luma" | "meetup" | "other" {
  if (url.includes("lu.ma") || url.includes("luma.")) return "luma";
  if (url.includes("meetup.com")) return "meetup";
  return "other";
}

// Extract metadata from HTML meta tags and JSON-LD
function extractMetadata(html: string, platform: string) {
  const getMetaContent = (name: string): string | null => {
    // Try og: tags first, then regular meta tags
    const patterns = [
      new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${name}["']`, "i"),
      new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Try JSON-LD structured data
  let jsonLdData: any = null;
  const jsonLdMatch = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (jsonLdMatch) {
    try {
      jsonLdData = JSON.parse(jsonLdMatch[1]);
    } catch {
      // ignore parse errors
    }
  }

  // Extract title
  let title =
    getMetaContent("title") ||
    (jsonLdData?.name as string) ||
    null;
  if (!title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    title = titleMatch ? titleMatch[1].trim() : null;
  }

  // Extract description
  const description =
    getMetaContent("description") ||
    (jsonLdData?.description as string) ||
    null;

  // Extract date
  let date: string | null = null;
  if (jsonLdData?.startDate) {
    date = jsonLdData.startDate;
  } else if (jsonLdData?.datePublished) {
    date = jsonLdData.datePublished;
  }

  // For Luma, try to find date in specific patterns
  if (platform === "luma" && !date) {
    const lumaDateMatch = html.match(
      /datetime["']?\s*:\s*["'](\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2})/
    );
    if (lumaDateMatch) date = lumaDateMatch[1];
  }

  // For Meetup, try their specific format
  if (platform === "meetup" && !date) {
    const meetupDateMatch = html.match(
      /"dateTime"\s*:\s*"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/
    );
    if (meetupDateMatch) date = meetupDateMatch[1];
  }

  // Clean up HTML entities
  if (title) {
    title = title
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'");
  }

  return {
    title: title || "Untitled Event",
    description: description?.slice(0, 500) || null,
    date,
    platform,
  };
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    const platform = detectPlatform(parsedUrl.href);

    // Fetch the event page
    const response = await fetch(parsedUrl.href, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DevMatch/1.0; +https://devmatch.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch event page (HTTP ${response.status})`,
          platform,
        },
        { status: 422 }
      );
    }

    const html = await response.text();
    const metadata = extractMetadata(html, platform);

    return NextResponse.json({
      success: true,
      ...metadata,
      url: parsedUrl.href,
    });
  } catch (error) {
    console.error("Parse event error:", error);
    return NextResponse.json(
      { error: "Failed to parse event URL" },
      { status: 500 }
    );
  }
}
