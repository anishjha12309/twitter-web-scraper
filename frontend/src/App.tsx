import { useState, useEffect } from "react";
import {
  searchTweets,
  checkHealth,
  getTrends,
  getUserProfile,
  getUserTweets,
  type Tweet,
  type Trend,
  type UserProfile,
} from "@/lib/api";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Twitter,
  Heart,
  Repeat,
  AlertCircle,
  ArrowLeft,
  MapPin,
  Calendar,
  Link as LinkIcon,
  Users,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

type ViewMode = "search" | "profile";

function App() {
  const [view, setView] = useState<ViewMode>("search");

  const [query, setQuery] = useState("");
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [trends, setTrends] = useState<Trend[]>([]);

  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userTimeline, setUserTimeline] = useState<Tweet[]>([]);

  useEffect(() => {
    checkHealth()
      .then(setIsOnline)
      .catch(() => setIsOnline(false));
    getTrends()
      .then(setTrends)
      .catch(() => setTrends([]));
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setTweets([]);
    setView("search");

    try {
      const data = await searchTweets(query);
      const safeTweets = Array.isArray(data.tweets) ? data.tweets : [];
      setTweets(safeTweets);

      if (safeTweets.length === 0) {
        toast.error("No tweets found.");
        setError("No tweets found.");
      } else {
        toast.success(`Found ${safeTweets.length} tweets!`, {
          style: { background: "#333", color: "#fff" },
        });
      }
    } catch (err: unknown) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = async (username: string) => {
    if (!username) return;

    setProfileLoading(true);
    setView("profile");
    setError("");

    try {
      const [profileData, timelineData] = await Promise.all([
        getUserProfile(username),
        getUserTweets(username),
      ]);

      setSelectedUser(profileData);
      setUserTimeline(Array.isArray(timelineData) ? timelineData : []);
    } catch (err: unknown) {
      handleError(err);
      setView("search");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleError = (err: unknown) => {
    let msg = "Something went wrong";
    if (err instanceof Error) msg = err.message;

    if (msg.toLowerCase().includes("rate limit")) {
      toast.error("Rate limit hit! Please wait.", {
        icon: "🛑",
        style: { background: "#333", color: "#fff" },
      });
    } else {
      toast.error(msg, { style: { background: "#333", color: "#fff" } });
    }
    setError(msg);
  };

  // --- RENDER HELPERS ---
  const renderTweetCard = (tweet: Tweet) => {
    if (!tweet) return null;

    const userName = tweet.user_name || "Anonymous";
    const userScreenName = tweet.user_screen_name || "unknown";
    const userInitial = userName.charAt(0) || "?";
    const tweetText = tweet.text || "No content available";
    const likeCount = tweet.likes || 0;
    const retweetCount = tweet.retweets || 0;
    const tweetUrl = tweet.url || "#";

    let dateDisplay = "Unknown Date";
    try {
      if (tweet.created_at) {
        dateDisplay = new Date(tweet.created_at).toLocaleDateString();
      }
    } catch {
      // safe fallback
    }

    return (
      <Card
        key={tweet.id || Math.random().toString()}
        // PURE CSS CLASSES - No animations
        className="group hover:border-foreground/60 border-border/50 bg-card"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => handleUserClick(userScreenName)}
            >
              <div className="h-10 w-10 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-bold shadow-sm">
                {userInitial}
              </div>
              <div>
                <p className="font-semibold leading-none group-hover:underline decoration-1 underline-offset-4">
                  {userName}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  @{userScreenName}
                </p>
              </div>
            </div>
            <a
              href={tweetUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium px-3 py-1 rounded-full bg-secondary hover:bg-foreground hover:text-background"
            >
              View
            </a>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base leading-relaxed opacity-90 font-light">
            {tweetText}
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground pt-4 border-t border-border/50">
            <span className="flex items-center gap-1.5 hover:text-red-500">
              <Heart className="h-4 w-4" /> {likeCount}
            </span>
            <span className="flex items-center gap-1.5 hover:text-green-500">
              <Repeat className="h-4 w-4" /> {retweetCount}
            </span>
            <span className="ml-auto text-xs opacity-50">{dateDisplay}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Toaster position="bottom-right" />

      {/* Main Container - Instant BG Switch */}
      <div className="min-h-screen w-full bg-background">
        <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-8">
          {/* HEADER */}
          <header className="flex flex-col md:flex-row justify-between items-center gap-4 border-b pb-6">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setView("search")}
            >
              <Twitter className="h-8 w-8 text-foreground fill-current" />
              <h1 className="text-3xl font-bold tracking-tight">
                Twitter Scraper
              </h1>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm font-medium bg-secondary px-3 py-1 rounded-full">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOnline
                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      : "bg-red-500"
                  }`}
                />
                <span className="text-muted-foreground">
                  {isOnline ? "System Online" : "System Offline"}
                </span>
              </div>
              <ModeToggle />
            </div>
          </header>

          {/* VIEW: SEARCH */}
          {view === "search" && (
            <div className="space-y-12">
              <section className="max-w-2xl mx-auto">
                <form onSubmit={handleSearch} className="flex gap-3">
                  <Input
                    placeholder="Search keywords or @users..."
                    className="h-14 text-lg px-6 rounded-xl border-2 focus-visible:ring-0 focus-visible:border-foreground transition-none"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="h-14 px-8 rounded-xl text-lg font-medium active:translate-y-0.5"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="h-5 w-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="h-5 w-5" />
                    )}
                  </Button>
                </form>

                {/* TRENDING */}
                <div className="flex flex-wrap gap-2 justify-center mt-6">
                  <span className="text-sm text-muted-foreground mr-2 self-center">
                    Trending:
                  </span>
                  {trends.map((t, i) => (
                    <a
                      key={i}
                      href={t.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs px-3 py-1 rounded-full bg-secondary hover:bg-foreground hover:text-background"
                    >
                      {t.name || "Unknown"}
                    </a>
                  ))}
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-destructive/5 border border-destructive/20 text-destructive rounded-xl flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="border border-border/50 shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-3/4" />
                      </CardContent>
                    </Card>
                  ))}

                {!loading && tweets.map(renderTweetCard)}
              </div>
            </div>
          )}

          {/* VIEW: PROFILE */}
          {view === "profile" && (
            <div className="space-y-8">
              <Button
                variant="ghost"
                onClick={() => setView("search")}
                className="gap-2 pl-0 hover:bg-transparent hover:text-foreground/80"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Search
              </Button>

              {profileLoading ? (
                <div className="space-y-6">
                  <Skeleton className="h-48 w-full rounded-xl" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                  </div>
                </div>
              ) : selectedUser ? (
                <>
                  <Card className="border-2 border-border/50">
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="h-24 w-24 rounded-full bg-foreground text-background flex items-center justify-center text-3xl font-bold shadow-lg shrink-0 overflow-hidden">
                          {selectedUser.profile_image_url ? (
                            <img
                              src={selectedUser.profile_image_url}
                              alt={selectedUser.name || "User"}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                if (target.parentElement) {
                                  target.parentElement.innerText =
                                    (selectedUser.name || "?")[0];
                                }
                              }}
                            />
                          ) : (
                            (selectedUser.name || "?")[0]
                          )}
                        </div>
                        <div className="space-y-4 flex-1">
                          <div>
                            <h2 className="text-3xl font-bold">
                              {selectedUser.name || "Anonymous"}
                            </h2>
                            <p className="text-muted-foreground text-lg">
                              @{selectedUser.screen_name || "unknown"}
                            </p>
                          </div>
                          <p className="text-lg leading-relaxed max-w-2xl">
                            {selectedUser.bio || "No bio available."}
                          </p>

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {selectedUser.location && (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />{" "}
                                {selectedUser.location}
                              </span>
                            )}
                            {selectedUser.website && (
                              <a
                                href={selectedUser.website}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 hover:text-primary hover:underline"
                              >
                                <LinkIcon className="h-4 w-4" /> Website
                              </a>
                            )}
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" /> Joined{" "}
                              {selectedUser.created_at || "Recently"}
                            </span>
                          </div>

                          <div className="flex gap-6 pt-2">
                            <span className="font-bold text-foreground">
                              {(
                                selectedUser.followers_count || 0
                              ).toLocaleString()}{" "}
                              <span className="font-normal text-muted-foreground">
                                Followers
                              </span>
                            </span>
                            <span className="font-bold text-foreground">
                              {(
                                selectedUser.following_count || 0
                              ).toLocaleString()}{" "}
                              <span className="font-normal text-muted-foreground">
                                Following
                              </span>
                            </span>
                            <span className="font-bold text-foreground">
                              {(
                                selectedUser.tweets_count || 0
                              ).toLocaleString()}{" "}
                              <span className="font-normal text-muted-foreground">
                                Tweets
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <h3 className="text-xl font-semibold mt-8 flex items-center gap-2">
                    <Users className="h-5 w-5" /> Recent Tweets
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {userTimeline.length > 0 ? (
                      userTimeline.map(renderTweetCard)
                    ) : (
                      <p className="text-muted-foreground col-span-2">
                        No recent tweets found for this user.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-muted-foreground">
                  User profile not found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
