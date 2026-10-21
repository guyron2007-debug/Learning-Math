import type { Difficulty, TopicId } from '../engine/types';

export type WorldId = TopicId;
export type LevelType = 'speed' | 'steps' | 'boss';

export interface LevelDef {
  id: string;
  worldId: WorldId;
  title: string;
  type: LevelType;
  /** Generator ids to draw from. */
  generators: string[];
  /** Questions in a speed run / problems in a steps level / boss hit points. */
  count: number;
  startDifficulty: Difficulty;
  maxDifficulty: Difficulty;
  /** Seconds for the speed-run time bonus. */
  timeLimit?: number;
}

export interface WorldDef {
  id: WorldId;
  name: string;
  emoji: string;
  topicTitle: string;
  description: string;
  /** Tailwind gradient classes for the island and header. */
  gradient: string;
  bossName?: string;
  bossEmoji?: string;
  cardId: string;
  levels: LevelDef[];
}

const equationsLevels: LevelDef[] = [
  { id: 'eq-1', worldId: 'equations', title: 'גלים ראשונים', type: 'speed', generators: ['eq.linear', 'eq.shortMult'], count: 10, startDifficulty: 3, maxDifficulty: 5, timeLimit: 240 },
  { id: 'eq-2', worldId: 'equations', title: 'פותחים סוגריים', type: 'steps', generators: ['steps.linear'], count: 3, startDifficulty: 4, maxDifficulty: 5 },
  { id: 'eq-3', worldId: 'equations', title: 'שוניות השברים', type: 'speed', generators: ['eq.fractions', 'eq.rational'], count: 10, startDifficulty: 3, maxDifficulty: 5, timeLimit: 300 },
  { id: 'eq-4', worldId: 'equations', title: 'מכנה משותף', type: 'steps', generators: ['steps.fractions'], count: 3, startDifficulty: 4, maxDifficulty: 5 },
  { id: 'eq-5', worldId: 'equations', title: 'זרם אי-השוויון', type: 'speed', generators: ['eq.inequality'], count: 10, startDifficulty: 3, maxDifficulty: 5, timeLimit: 180 },
  { id: 'eq-6', worldId: 'equations', title: 'שני מגדלורים', type: 'steps', generators: ['steps.system'], count: 2, startDifficulty: 4, maxDifficulty: 5 },
  { id: 'eq-param', worldId: 'equations', title: 'מגדלור הפרמטר', type: 'speed', generators: ['eq.param', 'eq.word'], count: 8, startDifficulty: 2, maxDifficulty: 5, timeLimit: 360 },
  {
    id: 'eq-7', worldId: 'equations', title: 'מבחן הסערה', type: 'speed',
    generators: ['eq.linear', 'eq.shortMult', 'eq.fractions', 'eq.rational', 'eq.inequality', 'eq.system', 'eq.param', 'eq.word'],
    count: 10, startDifficulty: 4, maxDifficulty: 5, timeLimit: 360,
  },
  {
    id: 'eq-boss', worldId: 'equations', title: 'קרקן המשוואות', type: 'boss',
    generators: ['eq.linear', 'eq.shortMult', 'eq.fractions', 'eq.rational', 'eq.inequality', 'eq.system', 'eq.param', 'eq.word', 'steps.linear', 'steps.fractions', 'steps.system'],
    count: 12, startDifficulty: 4, maxDifficulty: 5,
  },
];

export const WORLDS: WorldDef[] = [
  { id: 'powers', name: 'אי החזקות', emoji: '🏝️', topicTitle: 'חזקות ושורשים', description: 'חוקי חזקות, חזקה שלילית ואפס, שורשים', gradient: 'from-amber-300 to-orange-500', cardId: 'ramanujan', levels: [] },
  { id: 'shortMult', name: 'הר הכפל המקוצר', emoji: '🌋', topicTitle: 'כפל מקוצר ופירוק לגורמים', description: '(a±b)², הפרש ריבועים, פירוק טרינום', gradient: 'from-rose-400 to-red-600', cardId: 'noether', levels: [] },
  { id: 'algFractions', name: 'טירת השברים', emoji: '🏰', topicTitle: 'שברים אלגבריים', description: 'צמצום, כפל, חילוק, חיבור ותחום הצבה', gradient: 'from-fuchsia-400 to-purple-600', cardId: 'hypatia', levels: [] },
  {
    id: 'equations', name: 'מפרץ המשוואות', emoji: '🌊', topicTitle: 'משוואות ואי-שוויונות',
    description: 'משוואות ממעלה ראשונה, כפל מקוצר, x במכנה, פרמטרים, אי-שוויונות, מערכות ובעיות מילוליות',
    gradient: 'from-sky-400 to-blue-600', bossName: 'קרקן המשוואות', bossEmoji: '🐙', cardId: 'khwarizmi', levels: equationsLevels,
  },
  { id: 'quadratic', name: 'תחנת הפרבולה', emoji: '🚀', topicTitle: 'משוואה ופונקציה ריבועית', description: 'נוסחת השורשים, קודקוד, חיתוכים והזזות', gradient: 'from-indigo-400 to-violet-700', cardId: 'brahmagupta', levels: [] },
  { id: 'geometry', name: 'מקדש הגיאומטריה', emoji: '📐', topicTitle: 'דמיון ופיתגורס', description: 'משפטי דמיון, יחס שטחים, פיתגורס', gradient: 'from-emerald-400 to-teal-600', cardId: 'thales', levels: [] },
  { id: 'trig', name: 'עמק הטריגו', emoji: '🧭', topicTitle: 'טריגונומטריה', description: 'sin, cos, tan במשולש ישר זווית', gradient: 'from-lime-400 to-green-600', cardId: 'euler', levels: [] },
  { id: 'probability', name: 'קזינו ההסתברות', emoji: '🎲', topicTitle: 'הסתברות וסטטיסטיקה', description: 'הסתברות, עצים, ממוצע וחציון', gradient: 'from-pink-400 to-rose-600', cardId: 'pascal', levels: [] },
  { id: 'wordProblems', name: 'מגדל הבעיות', emoji: '🧩', topicTitle: 'בעיות מילוליות', description: 'תנועה, הספק, אחוזים', gradient: 'from-yellow-400 to-amber-600', cardId: 'gauss', levels: [] },
];

export const DEFAULT_WORLD_ORDER: WorldId[] = WORLDS.map((w) => w.id);

export const worldById = (id: WorldId) => WORLDS.find((w) => w.id === id)!;

export const ALL_LEVELS: LevelDef[] = WORLDS.flatMap((w) => w.levels);
export const levelById = (id: string) => ALL_LEVELS.find((l) => l.id === id);

export const LEVEL_TYPE_LABEL: Record<LevelType, string> = {
  speed: 'ריצת מהירות',
  steps: 'צעד אחר צעד',
  boss: 'בוס',
};

export const LEVEL_TYPE_ICON: Record<LevelType, string> = {
  speed: '⚡',
  steps: '🪜',
  boss: '👑',
};
