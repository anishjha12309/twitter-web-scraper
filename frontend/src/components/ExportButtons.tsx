import { FileJson, FileSpreadsheet } from 'lucide-react';
import { Tweet } from '@/lib/api';
import { exportToCSV, exportToJSON } from '@/lib/export';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface ExportButtonsProps {
  tweets: Tweet[];
  filename?: string;
}

export function ExportButtons({ tweets, filename = 'tweets' }: ExportButtonsProps) {
  if (!tweets.length) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportToCSV(tweets, filename)}
        className="gap-2 text-xs glass-card hover:bg-primary/10"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" />
        CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportToJSON(tweets, filename)}
        className="gap-2 text-xs glass-card hover:bg-primary/10"
      >
        <FileJson className="h-3.5 w-3.5" />
        JSON
      </Button>
    </motion.div>
  );
}
