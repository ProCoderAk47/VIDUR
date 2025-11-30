import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScheduleEventCard } from './ScheduleEventCard';

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

interface CalendarViewProps {
  events: ScheduleEvent[];
  onEventDrop: (eventId: number, newDate: string, newStartTime: string) => void;
  onEventClick: (event: ScheduleEvent) => void;
  view: 'month' | 'week';
}

export const CalendarView = ({ events, onEventDrop, onEventClick, view }: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigate = (direction: 'prev' | 'next') => {
    if (view === 'month') {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    }
  };

  const days = useMemo(() => {
    if (view === 'month') {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, view]);

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return events.filter((event) => event.date === dayStr);
  };

  const checkConflict = (day: Date, event: ScheduleEvent) => {
    const dayEvents = getEventsForDay(day);
    return dayEvents.some((e) => {
      if (e.id === event.id) return false;
      const e1Start = e.start_time;
      const e1End = e.end_time || '23:59';
      const e2Start = event.start_time;
      const e2End = event.end_time || '23:59';
      return e1Start < e2End && e2Start < e1End;
    });
  };

  const handleDragStart = (e: React.DragEvent, event: ScheduleEvent) => {
    e.dataTransfer.setData('eventId', event.id.toString());
    e.dataTransfer.setData('eventData', JSON.stringify(event));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    const eventId = parseInt(e.dataTransfer.getData('eventId'));
    const eventData = JSON.parse(e.dataTransfer.getData('eventData'));
    const newDate = format(day, 'yyyy-MM-dd');
    
    // Check for conflicts
    if (checkConflict(day, eventData)) {
      alert('Schedule conflict detected! This time slot overlaps with another event.');
      return;
    }

    onEventDrop(eventId, newDate, eventData.start_time);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">
          {view === 'month' ? format(currentDate, 'MMMM yyyy') : `Week of ${format(startOfWeek(currentDate), 'MMM d, yyyy')}`}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b border-border">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-3 text-center font-semibold text-sm text-muted-foreground border-r border-border last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentDate);

              return (
                <div
                  key={index}
                  className={cn(
                    'min-h-32 p-2 border-r border-b border-border last:border-r-0',
                    !isCurrentMonth && 'bg-secondary/20',
                    isToday && 'bg-primary/5'
                  )}
                  onDrop={(e) => handleDrop(e, day)}
                  onDragOver={handleDragOver}
                >
                  <div className={cn(
                    'text-sm font-medium mb-2',
                    isToday && 'text-primary',
                    !isCurrentMonth && 'text-muted-foreground'
                  )}>
                    {format(day, 'd')}
                  </div>

                  <div className="space-y-1">
                    {dayEvents.map((event) => (
                      <ScheduleEventCard
                        key={event.id}
                        event={event}
                        onDragStart={handleDragStart}
                        onClick={() => onEventClick(event)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
