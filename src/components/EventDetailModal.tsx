import type { IslamicEvent } from '../data/islamicEvents';
import { useAppStore } from '../store';
import BottomSheet from './BottomSheet';

interface Props {
  event: IslamicEvent;
  hijriYear: number;
  onClose: () => void;
}

const COLOR_PILL: Record<IslamicEvent['color'], string> = {
  green:  'bg-secondary text-primary',
  gold:   'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  teal:   'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

const CAT_LABEL: Record<IslamicEvent['category'], string> = {
  fasting: 'Fasting',
  celebration: 'Celebration',
  remembrance: 'Remembrance',
};

export default function EventDetailModal({ event, hijriYear, onClose }: Props) {
  const { state, setEventAction } = useAppStore();
  const eventKey = `${event.id}_${hijriYear}`;
  const actions = state.eventActions[eventKey] ?? {};

  const doneCount = event.actionItems.filter(a => actions[a.id]).length;

  return (
    <BottomSheet onClose={onClose}>
        <div className="px-5 pb-4">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${COLOR_PILL[event.color]}`}>
              {CAT_LABEL[event.category]}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-foreground mb-0.5">{event.title}</h2>
          <p className="font-arabic text-xl text-muted-fg mb-3">{event.titleAr}</p>

          {/* Description */}
          <p className="text-[15px] text-foreground/80 leading-relaxed mb-2">{event.description}</p>
          <p className="text-[14px] text-muted-fg leading-relaxed mb-5">{event.detail}</p>

          {/* Action items */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold uppercase tracking-widest text-muted-fg">
                Recommended Actions
              </h3>
              {event.actionItems.length > 0 && (
                <span className="text-[12px] font-medium text-muted-fg">
                  {doneCount}/{event.actionItems.length}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {event.actionItems.map(item => {
                const done = !!actions[item.id];
                return (
                  <button
                    key={item.id}
                    onClick={() => setEventAction(eventKey, item.id, !done)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border bg-background text-left transition-all active:scale-[0.98]"
                  >
                    <span className={[
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                      done ? 'bg-primary border-primary' : 'border-border',
                    ].join(' ')}>
                      {done && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    <span className={`text-[14px] ${done ? 'line-through text-muted-fg' : 'text-foreground'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
    </BottomSheet>
  );
}
