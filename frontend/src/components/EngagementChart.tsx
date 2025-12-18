import { motion } from 'framer-motion';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Tweet } from '@/lib/api';
import { format } from 'date-fns';

interface EngagementChartProps {
  tweets: Tweet[];
}

export function EngagementChart({ tweets }: EngagementChartProps) {
  if (!tweets.length) return null;

  const data = tweets
    .slice(0, 20)
    .map((tweet, index) => {
      let dateLabel = `Tweet ${index + 1}`;
      try {
        if (tweet.created_at) {
          const date = new Date(tweet.created_at);
          dateLabel = format(date, 'MMM d');
        }
      } catch {
        // Use fallback label
      }
      
      return {
        name: dateLabel,
        likes: tweet.likes || 0,
        retweets: tweet.retweets || 0,
      };
    })
    .reverse();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-xl p-6"
    >
      <h3 className="text-lg font-semibold mb-4">Engagement Overview</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: 'var(--glass-shadow)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Bar 
              dataKey="likes" 
              fill="hsl(var(--accent))" 
              radius={[4, 4, 0, 0]}
              name="Likes"
            />
            <Bar 
              dataKey="retweets" 
              fill="hsl(var(--muted-foreground))" 
              radius={[4, 4, 0, 0]}
              name="Retweets"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-accent" />
          <span className="text-muted-foreground">Likes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-muted-foreground" />
          <span className="text-muted-foreground">Retweets</span>
        </div>
      </div>
    </motion.div>
  );
}
