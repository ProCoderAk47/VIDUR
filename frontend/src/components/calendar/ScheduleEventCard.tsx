import { Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleEvent {
  id: number;
  case_id: string;
  date: string;
  start_time: string;
  end_time?: string;
  event_type: string;
  description?: string;
  location?: string;
}

interface ScheduleEventCardProps {
  event: ScheduleEvent;
  onDragStart: (e: React.DragEvent, event: ScheduleEvent) => void;
  onClick: () => void;
}

const getEventTypeColor = (type: string) => {
  switch (type) {
    case 'hearing':
      return 'bg-primary/90 text-primary-foreground border-primary';
    case 'meeting':
      return 'bg-info/90 text-info-foreground border-info';
    case 'research':
      return 'bg-accent/90 text-accent-foreground border-accent';
    default:
      return 'bg-secondary text-secondary-foreground border-secondary';
  }
};

export const ScheduleEventCard = ({ event, onDragStart, onClick }: ScheduleEventCardProps) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, event)}
      onClick={onClick}
      className={cn(
        'text-xs p-2 rounded border-l-2 cursor-move hover:shadow-md transition-all',
        getEventTypeColor(event.event_type)
      )}
    >
      <div className="font-semibold truncate">{event.case_id}</div>
      <div className="flex items-center gap-1 mt-1 opacity-90">
        <Clock className="w-3 h-3" />
        <span>{event.start_time}</span>
      </div>
      {event.location && (
        <div className="flex items-center gap-1 mt-0.5 opacity-80 truncate">
          <MapPin className="w-3 h-3" />
          <span>{event.location}</span>
        </div>
      )}
    </div>
  );
};
