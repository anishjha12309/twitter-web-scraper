import { Tweet } from './api';

const BOOKMARKS_KEY = 'twitter_scraper_bookmarks';

export function getBookmarks(): Tweet[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(BOOKMARKS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveBookmark(tweet: Tweet): void {
  const bookmarks = getBookmarks();
  if (!bookmarks.find(b => b.id === tweet.id)) {
    bookmarks.unshift(tweet);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  }
}

export function removeBookmark(tweetId: string): void {
  const bookmarks = getBookmarks().filter(b => b.id !== tweetId);
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

export function isBookmarked(tweetId: string): boolean {
  return getBookmarks().some(b => b.id === tweetId);
}

export function clearAllBookmarks(): void {
  localStorage.removeItem(BOOKMARKS_KEY);
}
