import { motion } from 'framer-motion';
import { SentimentResult } from '@/lib/sentiment';

interface SentimentBadgeProps {
  sentiment: SentimentResult;
  showScore?: boolean;
}

export function SentimentBadge({ sentiment, showScore = false }: SentimentBadgeProps) {
  const colorClasses = {
    positive: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    negative: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    neutral: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
  };

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 
        rounded-full text-xs font-medium border
        ${colorClasses[sentiment.label]}
      `}
      title={`Sentiment score: ${sentiment.score.toFixed(2)}`}
    >
      <span>{sentiment.emoji}</span>
      <span className="capitalize">{sentiment.label}</span>
      {showScore && (
        <span className="opacity-60">({sentiment.comparative.toFixed(2)})</span>
      )}
    </motion.span>
  );
}
