import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { EvidenceUploader } from '@/components/evidence/EvidenceUploader';

const caseSchema = z.object({
  case_id: z.string().min(1, 'Case ID is required').max(50),
  title: z.string().min(1, 'Title is required').max(200),
  category: z.string().min(1, 'Category is required'),
  priority: z.enum(['High', 'Medium', 'Low']),
  status: z.string().min(1, 'Status is required'),
  next_hearing: z.string().optional(),
});

type CaseFormData = z.infer<typeof caseSchema>;

interface CaseFormProps {
  initialData?: Partial<CaseFormData>;
  onSubmit: (data: CaseFormData, files?: { [key: string]: File[] }) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
}

export const CaseForm = ({ initialData, onSubmit, onCancel, isEdit = false }: CaseFormProps) => {
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: File[] }>({
    documents: [],
    pdf: [],
    images: [],
    audio: [],
    video: [],
  });

  const form = useForm<CaseFormData>({
    resolver: zodResolver(caseSchema),
    defaultValues: initialData || {
      case_id: '',
      title: '',
      category: '',
      priority: 'Medium',
      status: 'Open',
      next_hearing: '',
    },
  });

  const handleSubmit = async (data: CaseFormData) => {
    // Check if there are any files selected
    const hasFiles = Object.values(selectedFiles).some(files => files.length > 0);
    await onSubmit(data, hasFiles ? selectedFiles : undefined);
  };

  const handleFilesChange = (files: { [key: string]: File[] }) => {
    setSelectedFiles(files);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="case_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Case ID</FormLabel>
              <FormControl>
                <Input {...field} disabled={isEdit} placeholder="CASE-2024-001" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Case Title</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter case title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Civil">Civil</SelectItem>
                  <SelectItem value="Criminal">Criminal</SelectItem>
                  <SelectItem value="Family">Family</SelectItem>
                  <SelectItem value="Corporate">Corporate</SelectItem>
                  <SelectItem value="Constitutional">Constitutional</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Pending Review">Pending Review</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="next_hearing"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Next Hearing Date</FormLabel>
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
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Evidence Files (Optional)</FormLabel>
          <p className="text-sm text-muted-foreground">
            Upload evidence files for this case. You can also add more files after creating the case.
          </p>
          <EvidenceUploader onFilesChange={handleFilesChange} />
          {Object.values(selectedFiles).flat().length > 0 && (
            <p className="text-sm text-muted-foreground">
              {Object.values(selectedFiles).flat().length} file(s) selected for upload
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : isEdit ? 'Update Case' : 'Create Case'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
