import type { SkillId } from './types';

export const SKILL_LABEL: Record<SkillId, string> = {
  distribute: 'פתיחת סוגריים',
  'combine-like-terms': 'כינוס איברים דומים',
  'move-term-sign': 'העברת אגף',
  'divide-coefficient': 'חלוקה במקדם',
  'common-denominator': 'מכנה משותף',
  'clear-denominator': 'היפטרות ממכנים',
  'domain-restriction': 'תחום הצבה',
  'cross-multiply': 'כפל בהצלבה',
  'inequality-flip': 'הפיכת סימן באי-שוויון',
  'two-eq-substitution': 'שיטת ההצבה',
  'two-eq-elimination': 'השוואת מקדמים',
  'back-substitute': 'הצבה חזרה',
  'factor-common': 'הוצאת גורם משותף',
  'factor-trinomial': 'פירוק טרינום',
  'short-mult-square': 'כפל מקוצר',
  'quadratic-formula': 'נוסחת השורשים',
  discriminant: 'דיסקרימיננטה',
};

/** A short tip for next time, shown after she solved a question with help (B.4.4). */
export const SKILL_TIP: Partial<Record<SkillId, string>> = {
  distribute: 'בפעם הבאה שתראי סוגריים כאלה, נסי קודם לפתוח אותם.',
  'move-term-sign': 'בפעם הבאה, כשמעבירים איבר אגף — בדקי את הסימן שלו.',
  'divide-coefficient': 'בסוף, אל תשכחי לחלק במקדם של $x$.',
  'common-denominator': 'כשיש כמה שברים, חפשי קודם את המכנה המשותף הקטן ביותר.',
  'clear-denominator': 'כשכופלים במכנה — כופלים את כל האיברים, משני הצדדים.',
  'domain-restriction': 'כשיש $x$ במכנה, רשמי קודם את תחום ההצבה.',
  'cross-multiply': 'שבר שווה לשבר? כפל בהצלבה עושה את זה פשוט.',
  'inequality-flip': 'מחלקת במספר שלילי? הפכי את כיוון אי-השוויון.',
  'two-eq-elimination': 'במערכת, נסי להשוות מקדמים כדי שמשתנה אחד ייעלם.',
  'two-eq-substitution': 'כשמשתנה מופיע לבד, בודדי אותו והציבי במשוואה השנייה.',
  'back-substitute': 'אחרי שמצאת משתנה אחד, הציבי אותו כדי למצוא את השני.',
};
