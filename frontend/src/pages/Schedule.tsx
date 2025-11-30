import { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { scheduleAPI, caseAPI } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, MapPin, Plus, AlertTriangle, Download, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { exportScheduleToCsv } from '@/lib/export';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScheduleForm } from '@/components/forms/ScheduleForm';

const Schedule = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteScheduleId, setDeleteScheduleId] = useState<number | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadScheduleData();
  }, []);

  const loadScheduleData = async () => {
    try {
      const [scheduleData, conflictData, caseData] = await Promise.all([
        scheduleAPI.list(),
        scheduleAPI.checkConflicts(),
        caseAPI.list(),
      ]);
      setSchedules(scheduleData);
      setConflicts(conflictData.conflicts || []);
      setCases(caseData);
    } catch (error) {
      toast({
        title: 'Error loading schedule',
        description: error instanceof Error ? error.message : 'Failed to load schedule',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const groupSchedulesByDate = () => {
    const grouped: { [key: string]: any[] } = {};
    schedules.forEach(schedule => {
      const date = schedule.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(schedule);
    });
    return grouped;
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'hearing': return 'bg-primary text-primary-foreground';
      case 'meeting': return 'bg-info text-info-foreground';
      case 'research': return 'bg-accent text-accent-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const handleCreateSchedule = async (data: any) => {
    try {
      await scheduleAPI.create(data);
      toast({ title: 'Success', description: 'Event created successfully' });
      setShowCreateDialog(false);
      loadScheduleData();
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to create event', 
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteSchedule = async () => {
    if (!deleteScheduleId) return;
    
    try {
      await scheduleAPI.delete(deleteScheduleId);
      toast({ title: 'Success', description: 'Event deleted successfully' });
      setDeleteScheduleId(null);
      loadScheduleData();
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to delete event', 
        variant: 'destructive' 
      });
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading schedule...</p>
        </div>
      </MainLayout>
    );
  }

  const groupedSchedules = groupSchedulesByDate();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Schedule</h1>
            <p className="text-muted-foreground">Manage hearings, meetings, and research blocks</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportScheduleToCsv(schedules)} className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => navigate('/calendar')}>
              Calendar View
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              New Event
            </Button>
          </div>
        </div>

        {/* Conflicts Alert */}
        {conflicts.length > 0 && (
          <Card className="border-l-4 border-l-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Schedule Conflicts Detected
              </CardTitle>
              <CardDescription>
                {conflicts.length} scheduling conflict{conflicts.length > 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {conflicts.map((conflict, index) => (
                  <div key={index} className="text-sm p-3 bg-destructive/10 rounded-lg">
                    <p className="font-medium text-destructive">{conflict.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schedule Timeline */}
        <div className="space-y-8">
          {Object.entries(groupedSchedules).length > 0 ? (
            Object.entries(groupedSchedules)
              .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
              .map(([date, events]) => (
                <Card key={date}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-primary" />
                      {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                    </CardTitle>
                    <CardDescription>{events.length} event{events.length > 1 ? 's' : ''} scheduled</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {events.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                        >
                          <div className={`px-3 py-1 rounded-lg ${getEventTypeColor(event.event_type)} text-xs font-semibold uppercase`}>
                            {event.event_type}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground mb-1">
                              Case: {event.case_id}
                            </h4>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {event.start_time} - {event.end_time || 'TBD'}
                              </span>
                              {event.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {event.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteScheduleId(event.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <CalendarIcon className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">No scheduled events</p>
                <p className="text-muted-foreground text-center">
                  Get started by adding your first event
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Schedule Event</DialogTitle>
            </DialogHeader>
            <ScheduleForm
              caseOptions={cases}
              onSubmit={handleCreateSchedule}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteScheduleId !== null} onOpenChange={() => setDeleteScheduleId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Schedule Event</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this schedule event? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSchedule} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default Schedule;
