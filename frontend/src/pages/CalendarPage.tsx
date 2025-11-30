import { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { CalendarView } from '@/components/calendar/CalendarView';
import { ScheduleForm } from '@/components/forms/ScheduleForm';
import { scheduleAPI, caseAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CalendarPage = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [view, setView] = useState<'month' | 'week'>('month');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [schedulesData, casesData] = await Promise.all([
        scheduleAPI.list(),
        caseAPI.list(),
      ]);
      setSchedules(schedulesData);
      setCases(casesData);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEvent = async (data: any) => {
    try {
      await scheduleAPI.create(data);
      toast({ title: 'Success', description: 'Event created successfully' });
      setShowCreateDialog(false);
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create event',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateEvent = async (data: any) => {
    if (!selectedEvent) return;
    try {
      await scheduleAPI.update(selectedEvent.id, data);
      toast({ title: 'Success', description: 'Event updated successfully' });
      setSelectedEvent(null);
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update event',
        variant: 'destructive',
      });
    }
  };

  const handleEventDrop = async (eventId: number, newDate: string, newStartTime: string) => {
    try {
      await scheduleAPI.update(eventId, { date: newDate, start_time: newStartTime });
      toast({ title: 'Success', description: 'Event rescheduled' });
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reschedule event',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </MainLayout>
    );
  }

  const caseOptions = cases.map((c) => ({ case_id: c.case_id, title: c.title }));

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Calendar</h1>
            <p className="text-muted-foreground">Visual schedule management with drag-and-drop</p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={view} onValueChange={(v) => setView(v as 'month' | 'week')}>
              <TabsList>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Event
            </Button>
          </div>
        </div>

        <CalendarView
          events={schedules}
          onEventDrop={handleEventDrop}
          onEventClick={setSelectedEvent}
          view={view}
        />

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <ScheduleForm
              caseOptions={caseOptions}
              onSubmit={handleCreateEvent}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <ScheduleForm
                initialData={selectedEvent}
                caseOptions={caseOptions}
                onSubmit={handleUpdateEvent}
                onCancel={() => setSelectedEvent(null)}
                isEdit
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default CalendarPage;
