import { Tweet } from './api';

export function exportToCSV(tweets: Tweet[], filename: string = 'tweets'): void {
  const headers = ['ID', 'Text', 'User', 'Handle', 'Likes', 'Retweets', 'Date', 'URL'];
  
  const rows = tweets.map(t => [
    t.id,
    `"${(t.text || '').replace(/"/g, '""')}"`,
    `"${(t.user_name || '').replace(/"/g, '""')}"`,
    `@${t.user_screen_name || ''}`,
    t.likes || 0,
    t.retweets || 0,
    t.created_at || '',
    t.url || ''
  ]);
  
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadFile(csv, `${filename}.csv`, 'text/csv');
}

export function exportToJSON(tweets: Tweet[], filename: string = 'tweets'): void {
  const json = JSON.stringify(tweets, null, 2);
  downloadFile(json, `${filename}.json`, 'application/json');
}

function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
