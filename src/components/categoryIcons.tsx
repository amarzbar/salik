import type { IconType } from 'react-icons';
import { LuMoon, LuPartyPopper, LuSparkles, LuBell, LuNotebook, LuMic, LuPlane, LuBookOpen, LuDot } from 'react-icons/lu';

// Icon for an Islamic observance banner (fasting / celebration / other).
export function observanceIcon(category?: string): IconType {
  return category === 'fasting' ? LuMoon : category === 'celebration' ? LuPartyPopper : LuSparkles;
}

// Icon for a user's community/calendar event category.
export const CAL_CATEGORY_ICON: Record<string, IconType> = {
  reminder: LuBell, project: LuNotebook, event: LuSparkles, performance: LuMic,
  travel: LuPlane, study: LuBookOpen, other: LuDot,
};
