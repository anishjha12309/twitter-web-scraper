import { motion } from 'framer-motion';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import { Tweet } from '@/lib/api';
import { format } from 'date-fns';

interface EngagementChartProps {
  tweets: Tweet[];
}

export function EngagementChart({ tweets }: EngagementChartProps) {
  if (!tweets.length) return null;

  const data = tweets
    .slice(0, 10)
    .map((tweet, index) => {
      let dateLabel = `#${index + 1}`;
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
      className="glass-card rounded-2xl p-6 w-full"
    >
      <h3 className="text-lg font-semibold mb-6 text-center">Engagement Overview</h3>
      <div className="h-72 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                padding: '12px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: '4px' }}
              itemStyle={{ color: 'hsl(var(--muted-foreground))' }}
            />
            <Bar 
              dataKey="likes" 
              fill="hsl(220, 70%, 55%)" 
              radius={[6, 6, 0, 0]}
              name="Likes"
            />
            <Bar 
              dataKey="retweets" 
              fill="hsl(160, 60%, 45%)" 
              radius={[6, 6, 0, 0]}
              name="Retweets"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-8 mt-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(220, 70%, 55%)' }} />
          <span className="text-muted-foreground">Likes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(160, 60%, 45%)' }} />
          <span className="text-muted-foreground">Retweets</span>
        </div>
      </div>
    </motion.div>
  );
}

