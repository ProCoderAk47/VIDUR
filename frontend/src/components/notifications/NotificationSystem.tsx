import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Bell, Calendar, Brain, AlertTriangle } from 'lucide-react';
import { scheduleAPI, aiAPI } from '@/lib/api';
import { differenceInDays, parseISO, isSameDay } from 'date-fns';

export interface Notification {
  id: string;
  type: 'hearing' | 'analysis' | 'conflict';
  title: string;
  message: string;
  caseId?: string;
  timestamp: Date;
  read: boolean;
}

const NOTIFICATION_STORAGE_KEY = 'shown_notifications';
const STORAGE_EXPIRY_HOURS = 24;

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();

  // Load shown notifications from localStorage
  const getShownNotifications = (): Set<string> => {
    try {
      const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (!stored) return new Set();
      const data = JSON.parse(stored);
      // Check if data is expired (older than 24 hours)
      if (Date.now() - data.timestamp > STORAGE_EXPIRY_HOURS * 60 * 60 * 1000) {
        localStorage.removeItem(NOTIFICATION_STORAGE_KEY);
        return new Set();
      }
      return new Set(data.ids);
    } catch {
      return new Set();
    }
  };

  const saveShownNotification = (notificationId: string) => {
    try {
      const shownIds = getShownNotifications();
      shownIds.add(notificationId);
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify({
        ids: Array.from(shownIds),
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Failed to save notification tracking:', error);
    }
  };

  const hasBeenShown = (notificationId: string): boolean => {
    return getShownNotifications().has(notificationId);
  };

  useEffect(() => {
    checkHearingReminders();
    checkScheduleConflicts();
    
    const interval = setInterval(() => {
      checkHearingReminders();
      checkScheduleConflicts();
    }, 300000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, []); // Empty dependency array to run only once on mount

  const checkHearingReminders = async () => {
    try {
      const schedules = await scheduleAPI.list();
      const today = new Date();
      
      schedules.forEach((schedule: any) => {
        if (schedule.date) {
          const hearingDate = parseISO(schedule.date);
          const daysUntil = differenceInDays(hearingDate, today);

          if (daysUntil === 0 && !hasNotification(schedule.id, 'hearing')) {
            const notificationId = `hearing-${schedule.id}-today`;
            if (!hasBeenShown(notificationId)) {
              const notification: Notification = {
                id: notificationId,
                type: 'hearing',
                title: 'Hearing Today',
                message: `${schedule.event_type} for case ${schedule.case_id} is scheduled today at ${schedule.start_time}`,
                caseId: schedule.case_id,
                timestamp: new Date(),
                read: false,
              };
              
              addNotification(notification);
              showToast('Hearing Today', notification.message, 'default', Calendar);
              saveShownNotification(notificationId);
            }
          } else if (daysUntil === 1 && !hasNotification(schedule.id, 'hearing')) {
            const notificationId = `hearing-${schedule.id}-tomorrow`;
            if (!hasBeenShown(notificationId)) {
              const notification: Notification = {
                id: notificationId,
                type: 'hearing',
                title: 'Hearing Tomorrow',
                message: `${schedule.event_type} for case ${schedule.case_id} is scheduled tomorrow at ${schedule.start_time}`,
                caseId: schedule.case_id,
                timestamp: new Date(),
                read: false,
              };
              
              addNotification(notification);
              showToast('Hearing Tomorrow', notification.message, 'default', Calendar);
              saveShownNotification(notificationId);
            }
          } else if (daysUntil === 7 && !hasNotification(schedule.id, 'hearing')) {
            const notificationId = `hearing-${schedule.id}-week`;
            if (!hasBeenShown(notificationId)) {
              const notification: Notification = {
                id: notificationId,
                type: 'hearing',
                title: 'Upcoming Hearing',
                message: `${schedule.event_type} for case ${schedule.case_id} is in 7 days`,
                caseId: schedule.case_id,
                timestamp: new Date(),
                read: false,
              };
              
              addNotification(notification);
              saveShownNotification(notificationId);
            }
          }
        }
      });
    } catch (error) {
      console.error('Failed to check hearing reminders:', error);
    }
  };

  const checkScheduleConflicts = async () => {
    try {
      const response = await scheduleAPI.checkConflicts();
      if (response.conflicts && response.conflicts.length > 0) {
        response.conflicts.forEach((conflict: any) => {
          const notificationId = `conflict-${conflict.event_1.id}-${conflict.event_2.id}`;
          if (!hasNotification(conflict.event_1.id, 'conflict') && !hasBeenShown(notificationId)) {
            const notification: Notification = {
              id: notificationId,
              type: 'conflict',
              title: 'Schedule Conflict',
              message: conflict.message,
              timestamp: new Date(),
              read: false,
            };
            
            addNotification(notification);
            showToast('Schedule Conflict', conflict.message, 'destructive', AlertTriangle);
            saveShownNotification(notificationId);
          }
        });
      }
    } catch (error) {
      console.error('Failed to check schedule conflicts:', error);
    }
  };

  const notifyAnalysisComplete = (caseId: string, caseTitle: string) => {
    const notification: Notification = {
      id: `analysis-${caseId}-${Date.now()}`,
      type: 'analysis',
      title: 'Analysis Complete',
      message: `AI analysis completed for case: ${caseTitle}`,
      caseId,
      timestamp: new Date(),
      read: false,
    };
    
    addNotification(notification);
    showToast('Analysis Complete', notification.message, 'default', Brain);
  };

  const hasNotification = (id: string | number, type: string): boolean => {
    return notifications.some((n) => n.id.includes(String(id)) && n.type === type);
  };

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [notification, ...prev].slice(0, 50)); // Keep last 50
  };

  const showToast = (title: string, description: string, variant: 'default' | 'destructive' = 'default', Icon: any = Bell) => {
    toast({
      title: (
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          {title}
        </div>
      ) as any,
      description,
      variant,
    });
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    notifyAnalysisComplete,
  };
};
