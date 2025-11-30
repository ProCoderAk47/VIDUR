import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

const scheduleSchema = z.object({
  case_id: z.string().min(1, 'Case ID is required'),
  date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required').regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional().or(z.literal('')),
  event_type: z.enum(['hearing', 'meeting', 'research']),
  description: z.string().max(500).optional().or(z.literal('')),
  location: z.string().max(200).optional().or(z.literal('')),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface ScheduleFormProps {
  initialData?: Partial<ScheduleFormData>;
  onSubmit: (data: ScheduleFormData) => Promise<void>;
  onCancel: () => void;
  caseOptions: Array<{ case_id: string; title: string; next_hearing?: string }>;
  isEdit?: boolean;
}

export const ScheduleForm = ({ initialData, onSubmit, onCancel, caseOptions, isEdit = false }: ScheduleFormProps) => {
  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: initialData || {
      case_id: '',
      date: '',
      start_time: '',
      end_time: '',
      event_type: 'hearing',
      description: '',
      location: '',
    },
  });

  // Watch for case_id changes to auto-populate next_hearing date
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'case_id' && value.case_id) {
        const selectedCase = caseOptions.find((c: any) => c.case_id === value.case_id);
        if (selectedCase?.next_hearing && !form.getValues('date')) {
          form.setValue('date', selectedCase.next_hearing);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, caseOptions]);

  const handleSubmit = async (data: ScheduleFormData) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="case_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Case</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a case" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {caseOptions.map((c) => (
                    <SelectItem key={c.case_id} value={c.case_id}>
                      {c.case_id} - {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="event_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="hearing">Hearing</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="research">Research Block</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => {
            const selectedCase = caseOptions.find((c: any) => c.case_id === form.getValues('case_id'));
            const isFromNextHearing = selectedCase?.next_hearing === field.value;
            
            return (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? format(new Date(field.value), 'PPP') : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {isFromNextHearing && (
                  <FormDescription className="text-xs text-info">
                    Date pre-populated from case's next hearing date
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input {...field} type="time" placeholder="09:00" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input {...field} type="time" placeholder="10:00" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Courtroom 3" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Enter event description" rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
