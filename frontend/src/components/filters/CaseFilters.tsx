import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface CaseFilterValues {
  search: string;
  category: string;
  priority: string;
  status: string;
  analysisStatus: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

interface CaseFiltersProps {
  onFilterChange: (filters: CaseFilterValues) => void;
}

export const CaseFilters = ({ onFilterChange }: CaseFiltersProps) => {
  const [filters, setFilters] = useState<CaseFilterValues>({
    search: '',
    category: 'all',
    priority: 'all',
    status: 'all',
    analysisStatus: 'all',
    dateFrom: undefined,
    dateTo: undefined,
  });

  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key: keyof CaseFilterValues, value: any) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    onFilterChange(updated);
  };

  const clearFilters = () => {
    const cleared: CaseFilterValues = {
      search: '',
      category: 'all',
      priority: 'all',
      status: 'all',
      analysisStatus: 'all',
      dateFrom: undefined,
      dateTo: undefined,
    };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  const hasActiveFilters = () => {
    return (
      filters.search ||
      filters.category !== 'all' ||
      filters.priority !== 'all' ||
      filters.status !== 'all' ||
      filters.analysisStatus !== 'all' ||
      filters.dateFrom ||
      filters.dateTo
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search cases by ID or title..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters() && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
              {Object.values(filters).filter((v) => v && v !== 'all').length}
            </span>
          )}
        </Button>
        {hasActiveFilters() && (
          <Button variant="ghost" onClick={clearFilters} size="sm" className="gap-2">
            <X className="w-4 h-4" />
            Clear
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 p-4 bg-secondary/30 rounded-lg border border-border">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
            <Select value={filters.category} onValueChange={(v) => updateFilter('category', v)}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Civil">Civil</SelectItem>
                <SelectItem value="Criminal">Criminal</SelectItem>
                <SelectItem value="Family">Family</SelectItem>
                <SelectItem value="Corporate">Corporate</SelectItem>
                <SelectItem value="Constitutional">Constitutional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Priority</label>
            <Select value={filters.priority} onValueChange={(v) => updateFilter('priority', v)}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
            <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Pending Review">Pending Review</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">AI Analysis</label>
            <Select value={filters.analysisStatus} onValueChange={(v) => updateFilter('analysisStatus', v)}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !filters.dateFrom && !filters.dateTo && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateFrom ? (
                    filters.dateTo ? (
                      <>
                        {format(filters.dateFrom, 'LLL dd')} - {format(filters.dateTo, 'LLL dd')}
                      </>
                    ) : (
                      format(filters.dateFrom, 'LLL dd, yyyy')
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: filters.dateFrom, to: filters.dateTo }}
                  onSelect={(range) => {
                    updateFilter('dateFrom', range?.from);
                    updateFilter('dateTo', range?.to);
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
    </div>
  );
};
