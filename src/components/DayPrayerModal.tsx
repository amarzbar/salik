// Bottom-sheet for retroactively editing a past day's prayers — opened from
// the Prayers > History tab (heatmap cell or Recent Days row).

import { dateFromKey } from '../store';
import { gregorianToHijri, HIJRI_MONTHS } from '../utils/hijri';
import PrayerChecklist from './PrayerChecklist';
import BottomSheet from './BottomSheet';

interface Props {
  dateKey: string;
  onClose: () => void;
}

export default function DayPrayerModal({ dateKey, onClose }: Props) {
  const d = dateFromKey(dateKey);
  const hDate = gregorianToHijri(d.getFullYear(), d.getMonth() + 1, d.getDate());

  return (
    <BottomSheet onClose={onClose}>
        <div className="px-5 pb-5">
          <h2 className="text-xl font-bold text-foreground mb-0.5">
            {d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>
          <p className="text-[13px] text-muted-fg mb-4">{hDate.day} {HIJRI_MONTHS[hDate.month - 1]} {hDate.year} AH</p>

          <PrayerChecklist dateKey={dateKey} />

          <button
            onClick={onClose}
            className="w-full mt-4 py-3 rounded-xl bg-secondary text-primary font-semibold text-[14px]"
          >
            Done
          </button>
        </div>
    </BottomSheet>
  );
}
