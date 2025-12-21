import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { analyzeSentiment } from "@/lib/sentiment";
import { saveBookmark, isBookmarked } from "@/lib/bookmarks";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";
import { Sidebar } from "@/components/Sidebar";
import { SentimentBadge } from "@/components/SentimentBadge";
import { ExportButtons } from "@/components/ExportButtons";
import { EngagementChart } from "@/components/EngagementChart";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Heart,
  Repeat,
  AlertCircle,
  ArrowLeft,
  MapPin,
  Calendar,
  Link as LinkIcon,
  Users,
  Bookmark,
  BookmarkCheck,
  Chrome,
  Shield,
  Zap,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

type ViewMode = "search" | "profile";

function App() {
  const [view, setView] = useState<ViewMode>("search");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [trends, setTrends] = useState<Trend[]>([]);

  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userTimeline, setUserTimeline] = useState<Tweet[]>([]);
  const [bookmarkVersion, setBookmarkVersion] = useState(0);


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
        toast.success(`Found ${safeTweets.length} tweets!`);
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

  const handleBookmark = (tweet: Tweet) => {
    if (isBookmarked(tweet.id)) {
      toast("Already bookmarked", { icon: "📌" });
    } else {
      saveBookmark(tweet);
      setBookmarkVersion((v) => v + 1);
      toast.success("Bookmarked!");
    }
  };

  const handleError = (err: unknown) => {
    let msg = "Something went wrong";
    if (err instanceof Error) msg = err.message;

    if (msg.toLowerCase().includes("rate limit")) {
      toast.error("Rate limit hit! Please wait.", { icon: "🛑" });
    } else {
      toast.error(msg);
    }
    setError(msg);
  };

  const renderTweetCard = (tweet: Tweet, index: number) => {
    if (!tweet) return null;

    const userName = tweet.user_name || "Anonymous";
    const userScreenName = tweet.user_screen_name || "unknown";
    const userInitial = userName.charAt(0) || "?";
    const tweetText = tweet.text || "No content available";
    const likeCount = tweet.likes || 0;
    const retweetCount = tweet.retweets || 0;
    const tweetUrl = tweet.url || "#";
    const sentiment = analyzeSentiment(tweetText);
    const bookmarked = isBookmarked(tweet.id);

    let dateDisplay = "Unknown Date";
    try {
      if (tweet.created_at) {
        dateDisplay = new Date(tweet.created_at).toLocaleDateString();
      }
    } catch {
      // safe fallback
    }

    return (
      <SpotlightCard key={tweet.id || index}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => handleUserClick(userScreenName)}
            >
              <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-sm">
                {userInitial}
              </div>
              <div>
                <p className="font-semibold leading-none hover:underline decoration-1 underline-offset-4">
                  {userName}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  @{userScreenName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBookmark(tweet)}
                className={`p-2 rounded-lg transition-colors ${
                  bookmarked 
                    ? "text-accent bg-accent/10" 
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {bookmarked ? (
                  <BookmarkCheck className="h-4 w-4" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </button>
              <a
                href={tweetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                View
              </a>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base leading-relaxed">{tweetText}</p>
          <div className="flex items-center flex-wrap gap-3 pt-4 border-t border-border/50">
            <SentimentBadge sentiment={sentiment} />
            <div className="flex items-center gap-4 text-sm text-muted-foreground ml-auto">
              <span className="flex items-center gap-1.5 hover:text-rose-500 transition-colors">
                <Heart className="h-4 w-4" /> {likeCount.toLocaleString()}
              </span>
              <span className="flex items-center gap-1.5 hover:text-emerald-500 transition-colors">
                <Repeat className="h-4 w-4" /> {retweetCount.toLocaleString()}
              </span>
              <span className="text-xs opacity-50">{dateDisplay}</span>
            </div>
          </div>
        </CardContent>
      </SpotlightCard>
    );
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
      />

      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onTweetClick={handleUserClick}
        bookmarkVersion={bookmarkVersion}
        onBookmarkChange={() => setBookmarkVersion((v) => v + 1)}
      />

      {/* Main Container */}
      <div className={`min-h-screen w-full bg-background transition-all duration-300 ${sidebarOpen ? 'lg:pl-80' : ''} relative overflow-hidden`}>
        {/* Animated Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-500/10 dark:bg-blue-500/20 rounded-full filter blur-3xl animate-blob" />
          <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-500/10 dark:bg-purple-500/20 rounded-full filter blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full filter blur-3xl animate-blob animation-delay-4000" />
        </div>

        <div className="max-w-5xl mx-auto p-6 md:p-12 space-y-8 relative z-10">
          {/* HEADER */}
          <motion.header 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-border/50 pb-6"
          >
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => setView("search")}
            >
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight gradient-text">
                Twitter Scraper
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-medium glass-card px-4 py-2 rounded-full">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOnline
                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      : "bg-rose-500"
                  }`}
                />
                <span className="text-muted-foreground">
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>
              <ModeToggle />
            </div>
          </motion.header>

          {/* VIEW: SEARCH */}
          <AnimatePresence mode="wait">
            {view === "search" && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10"
              >
                {/* Hero Section */}
                <section className="text-center mb-8">
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="text-sm md:text-base text-muted-foreground tracking-wide"
                  >
                    Search tweets • Analyze sentiment • Explore profiles
                  </motion.p>
                </section>

                <section className="max-w-2xl mx-auto">
                  <form onSubmit={handleSearch} className="flex gap-3">
                    <Input
                      placeholder="Search keywords, hashtags, or @users..."
                      className="h-14 text-lg px-6 rounded-2xl border-2 focus-visible:ring-0 focus-visible:border-primary/50 bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <Button
                      type="submit"
                      size="lg"
                      className="h-14 px-8 rounded-2xl text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 btn-premium"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
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
                    {trends.slice(0, 5).map((t, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => {
                          setQuery(t.name || "");
                          handleSearch();
                        }}
                        className="text-xs px-3 py-1.5 rounded-full glass-card hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        {t.name || "Unknown"}
                      </motion.button>
                    ))}
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex items-center gap-3"
                    >
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">{error}</span>
                    </motion.div>
                  )}
                </section>

                {/* Export Buttons */}
                {tweets.length > 0 && (
                  <div className="flex justify-end">
                    <ExportButtons tweets={tweets} filename={`search_${query}`} />
                  </div>
                )}

                {/* Results Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {loading &&
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="glass-card rounded-xl p-6">
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      </div>
                    ))}

                  {!loading && tweets.map(renderTweetCard)}
                </div>

                {/* How It Works Section - Show when no tweets or always at bottom */}
                {tweets.length === 0 && !loading && !error && (
                  <section className="mt-16 pt-12 border-t border-border">
                    <h2 className="text-2xl font-bold text-center mb-8 gradient-text">How It Works</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Step 1 */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="step-card"
                      >
                        <span className="step-number">1</span>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 rounded-lg bg-blue-500/10">
                            <Chrome className="h-6 w-6 text-blue-500" />
                          </div>
                          <h3 className="font-semibold">Browser Extension</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Our Chrome extension securely captures your active Twitter session cookies in the background.
                        </p>
                      </motion.div>

                      {/* Step 2 */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="step-card"
                      >
                        <span className="step-number">2</span>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 rounded-lg bg-purple-500/10">
                            <Shield className="h-6 w-6 text-purple-500" />
                          </div>
                          <h3 className="font-semibold">Secure Sync</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Cookies are encrypted and synced to our backend server via API-key protected endpoints.
                        </p>
                      </motion.div>

                      {/* Step 3 */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="step-card"
                      >
                        <span className="step-number">3</span>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 rounded-lg bg-emerald-500/10">
                            <Zap className="h-6 w-6 text-emerald-500" />
                          </div>
                          <h3 className="font-semibold">Reliable Scraping</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          The backend uses synced cookies for authenticated requests - no CAPTCHAs or login failures.
                        </p>
                      </motion.div>
                    </div>
                  </section>
                )}
              </motion.div>
            )}

            {/* VIEW: PROFILE */}
            {view === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
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
                    <Skeleton className="h-64 w-full rounded-xl" />
                  </div>
                ) : selectedUser ? (
                  <>
                    <SpotlightCard>
                      <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                          <div className="h-24 w-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold shadow-lg shrink-0 overflow-hidden">
                            {selectedUser.profile_image_url ? (
                              <img
                                src={selectedUser.profile_image_url}
                                alt={selectedUser.name || "User"}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
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
                                  <MapPin className="h-4 w-4" />
                                  {selectedUser.location}
                                </span>
                              )}
                              {selectedUser.website && (
                                <a
                                  href={selectedUser.website}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1.5 hover:text-accent hover:underline"
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
                                {(selectedUser.followers_count || 0).toLocaleString()}{" "}
                                <span className="font-normal text-muted-foreground">
                                  Followers
                                </span>
                              </span>
                              <span className="font-bold text-foreground">
                                {(selectedUser.following_count || 0).toLocaleString()}{" "}
                                <span className="font-normal text-muted-foreground">
                                  Following
                                </span>
                              </span>
                              <span className="font-bold text-foreground">
                                {(selectedUser.tweets_count || 0).toLocaleString()}{" "}
                                <span className="font-normal text-muted-foreground">
                                  Tweets
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </SpotlightCard>

                    {/* Engagement Chart */}
                    {userTimeline.length > 0 && (
                      <EngagementChart tweets={userTimeline} />
                    )}

                    {/* User Tweets */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5" /> Recent Tweets
                      </h3>
                      <ExportButtons tweets={userTimeline} filename={`${selectedUser.screen_name}_tweets`} />
                    </div>
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
