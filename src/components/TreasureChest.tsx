import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { play } from '../audio/sound';
import { useGame } from '../store/gameStore';
import { Burst } from './Particles';
import { Button, Modal } from './ui';

/** Shows the treasure-chest moment for each reward that unlocked, one at a time. */
export function TreasureChestHost({ suppressed }: { suppressed?: boolean }) {
  const pending = useGame((s) => s.progress.pendingChests);
  const rewards = useGame((s) => s.progress.rewards);
  const popChest = useGame((s) => s.popChest);
  const [opened, setOpened] = useState(false);
  const reward = rewards.find((r) => r.id === pending[0]);
  const open = !!reward && !suppressed;

  useEffect(() => setOpened(false), [reward?.id]);

  return (
    <Modal open={open}>
      {reward && (
        <div className="relative rounded-3xl bg-gradient-to-b from-amber-100 to-orange-100 p-8 text-center shadow-2xl dark:from-amber-950 dark:to-orange-950">
          <h2 className="mb-2 text-2xl font-extrabold text-amber-900 dark:text-amber-100">{opened ? 'פרס חדש נפתח!' : 'מצאת תיבת אוצר!'}</h2>
          <div className="relative my-6 flex h-40 items-center justify-center">
            {opened && <Burst count={36} spread={180} />}
            {!opened ? (
              <motion.button
                className="text-8xl"
                animate={{ rotate: [0, -6, 6, -6, 6, 0], scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1.4 }}
                onClick={() => {
                  play('chest');
                  setOpened(true);
                }}
                aria-label="פתחי את התיבה"
              >
                🧰
              </motion.button>
            ) : (
              <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
                <div className="text-8xl">{reward.icon}</div>
              </motion.div>
            )}
          </div>
          {opened ? (
            <>
              <p className="text-3xl font-extrabold">{reward.title}</p>
              {reward.description && <p className="mt-2 text-amber-800 dark:text-amber-200">{reward.description}</p>}
              <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">הפרס מחכה למימוש — ספרי להורים! 🎉</p>
              <Button variant="gold" className="mt-6 w-full" onClick={popChest}>
                יש!!!
              </Button>
            </>
          ) : (
            <p className="text-amber-800 dark:text-amber-200">לחצי על התיבה כדי לפתוח</p>
          )}
        </div>
      )}
    </Modal>
  );
}
