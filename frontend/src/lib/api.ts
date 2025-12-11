const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
// --- INTERFACES ---
export interface Tweet {
  id: string;
  text: string;
  created_at: string;
  likes: number;
  retweets: number;
  user_name: string;
  user_screen_name: string;
  user_followers: number;
  url: string;
}

export interface UserProfile {
  name: string;
  screen_name: string;
  bio: string;
  followers_count: number;
  following_count: number;
  tweets_count: number;
  profile_image_url: string;
  location: string;
  website: string;
  created_at: string;
}

export interface SearchResponse {
  success: boolean;
  count: number;
  tweets: Tweet[];
}

export interface Trend {
  name: string;
  url: string;
}

// --- FALLBACK DATA ---
const FALLBACK_TRENDS: Trend[] = [
  { name: "#AI", url: "https://twitter.com/search?q=%23AI" },
  { name: "Elon Musk", url: "https://twitter.com/search?q=Elon%20Musk" },
  { name: "React", url: "https://twitter.com/search?q=React" },
  { name: "Python", url: "https://twitter.com/search?q=Python" },
  { name: "Startup", url: "https://twitter.com/search?q=Startup" },
];

// --- API FUNCTIONS ---

export const searchTweets = async (query: string): Promise<SearchResponse> => {
  const res = await fetch(`${BASE_URL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, search_type: "Latest", count: 10 }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limit exceeded! Slow down.");
    throw new Error("Failed to fetch tweets");
  }
  return res.json();
};

export const getUserProfile = async (
  username: string
): Promise<UserProfile> => {
  const res = await fetch(`${BASE_URL}/user/${username}`);
  if (!res.ok) throw new Error("Failed to fetch user profile");
  const data = await res.json();
  return data.user;
};

export const getUserTweets = async (username: string): Promise<Tweet[]> => {
  const res = await fetch(`${BASE_URL}/user/${username}/tweets?count=20`);
  if (!res.ok) throw new Error("Failed to fetch user tweets");
  const data = await res.json();
  return data.tweets;
};

export const getTrends = async (): Promise<Trend[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${BASE_URL}/trending`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) throw new Error("API Failed");

    const data = await res.json();
    return data.trends && data.trends.length > 0
      ? data.trends
      : FALLBACK_TRENDS;
  } catch (err) {
    console.warn("Using fallback trends due to API error:", err);
    return FALLBACK_TRENDS;
  }
};

export const checkHealth = async () => {
  try {
    const res = await fetch(`${BASE_URL}/`);
    return res.ok;
  } catch {
    return false;
  }
};
