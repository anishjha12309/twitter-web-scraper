import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, X, Trash2, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { Tweet } from '@/lib/api';
import { getBookmarks, removeBookmark, clearAllBookmarks } from '@/lib/bookmarks';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onTweetClick?: (screenName: string) => void;
  bookmarkVersion?: number;
  onBookmarkChange?: () => void;
}

export function Sidebar({ isOpen, onToggle, onTweetClick, bookmarkVersion, onBookmarkChange }: SidebarProps) {
  const [bookmarks, setBookmarks] = useState<Tweet[]>([]);
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'filters'>('bookmarks');

  useEffect(() => {
    setBookmarks(getBookmarks());
  }, [isOpen, bookmarkVersion]);

  const handleRemove = (tweetId: string) => {
    removeBookmark(tweetId);
    setBookmarks(getBookmarks());
    onBookmarkChange?.();
  };

  const handleClearAll = () => {
    clearAllBookmarks();
    setBookmarks([]);
    onBookmarkChange?.();
  };

  return (
    <>
      {/* Toggle Button - same spring animation as sidebar */}
      <motion.button
        initial={{ left: 0 }}
        animate={{ left: isOpen ? 320 : 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        onClick={onToggle}
        className="fixed top-1/2 -translate-y-1/2 z-50 bg-primary text-primary-foreground p-2 rounded-r-lg shadow-lg hover:bg-primary/90"
      >
        {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </motion.button>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-80 z-40 glass-card border-r border-border"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 border-b border-border">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('bookmarks')}
                    className={`
                      flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                      transition-colors
                      ${activeTab === 'bookmarks' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted'
                      }
                    `}
                  >
                    <Bookmark className="h-4 w-4" />
                    Bookmarks
                  </button>
                  <button
                    onClick={() => setActiveTab('filters')}
                    className={`
                      flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                      transition-colors
                      ${activeTab === 'filters' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted'
                      }
                    `}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'bookmarks' && (
                  <div className="space-y-3">
                    {bookmarks.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No bookmarks yet</p>
                        <p className="text-xs mt-1">Save tweets to access them later</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm text-muted-foreground">
                            {bookmarks.length} saved
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearAll}
                            className="text-destructive hover:text-destructive text-xs"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Clear all
                          </Button>
                        </div>
                        {bookmarks.map((tweet) => (
                          <motion.div
                            key={tweet.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="p-3 rounded-lg bg-card border border-border group hover:border-accent/50 transition-colors"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div 
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => onTweetClick?.(tweet.user_screen_name)}
                              >
                                <p className="font-medium text-sm truncate">
                                  @{tweet.user_screen_name}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {tweet.text}
                                </p>
                              </div>
                              <button
                                onClick={() => handleRemove(tweet.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'filters' && (
                  <div className="space-y-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <SlidersHorizontal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Filters coming soon</p>
                      <p className="text-xs mt-1">Filter by date, likes, and more</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="fixed inset-0 bg-background/50 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>
    </>
  );
}
