import Sentiment from 'sentiment';

const analyzer = new Sentiment();

export interface SentimentResult {
  score: number;
  comparative: number;
  label: 'positive' | 'negative' | 'neutral';
  emoji: string;
}

export function analyzeSentiment(text: string): SentimentResult {
  const result = analyzer.analyze(text);
  
  let label: SentimentResult['label'];
  let emoji: string;
  
  if (result.comparative > 0.1) {
    label = 'positive';
    emoji = '😊';
  } else if (result.comparative < -0.1) {
    label = 'negative';
    emoji = '😔';
  } else {
    label = 'neutral';
    emoji = '😐';
  }
  
  return {
    score: result.score,
    comparative: result.comparative,
    label,
    emoji
  };
}
