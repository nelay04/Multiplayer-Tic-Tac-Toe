import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface ToastMessage {
  id: number;
  message: string;
}

export default function Toast({ toasts }: { toasts: ToastMessage[] }) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div 
            key={t.id} 
            initial={{ opacity: 0, y: 20, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 20, scale: 0.9 }} 
            className="bg-zinc-900 dark:bg-zinc-800 text-white px-6 py-3 rounded-full shadow-2xl text-sm font-medium border border-zinc-800 dark:border-zinc-700 pointer-events-auto whitespace-nowrap"
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
