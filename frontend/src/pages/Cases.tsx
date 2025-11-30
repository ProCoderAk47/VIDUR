import { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { caseAPI } from '@/lib/api';
import { CaseFilters, CaseFilterValues } from '@/components/filters/CaseFilters';
import { CaseForm } from '@/components/forms/CaseForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Scale, AlertCircle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { exportCaseDataToCsv } from '@/lib/export';
import { uploadMultipleFiles } from '@/lib/fileUpload';

const Cases = () => {
  const [cases, setCases] = useState<any[]>([]);
  const [filteredCases, setFilteredCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    setFilteredCases(cases);
  }, [cases]);

  const handleFilterChange = (filters: CaseFilterValues) => {
    let filtered = [...cases];
    if (filters.search) {
      filtered = filtered.filter((c) => c.case_id.toLowerCase().includes(filters.search.toLowerCase()) || c.title.toLowerCase().includes(filters.search.toLowerCase()));
    }
    if (filters.category !== 'all') filtered = filtered.filter((c) => c.category === filters.category);
    if (filters.priority !== 'all') filtered = filtered.filter((c) => c.priority === filters.priority);
    if (filters.status !== 'all') filtered = filtered.filter((c) => c.status === filters.status);
    if (filters.analysisStatus !== 'all') filtered = filtered.filter((c) => c.analysis_status === filters.analysisStatus);
    setFilteredCases(filtered);
  };

  const handleCreateCase = async (data: any, files?: { [key: string]: File[] }) => {
    try {
      // Create the case first
      const newCase = await caseAPI.create(data);
      const caseId = data.case_id;
      
      // Upload files if any were selected
      if (files) {
        const hasFiles = Object.values(files).some(fileList => fileList.length > 0);
        if (hasFiles) {
          try {
            await uploadMultipleFiles(files, caseId);
            toast({ 
              title: 'Success', 
              description: 'Case created successfully with evidence files uploaded' 
            });
          } catch (uploadError) {
            // Case was created but file upload failed
            toast({ 
              title: 'Case created', 
              description: 'Case created but some files failed to upload. You can add them later.',
              variant: 'warning'
            });
          }
        } else {
          toast({ title: 'Success', description: 'Case created successfully' });
        }
      } else {
        toast({ title: 'Success', description: 'Case created successfully' });
      }
      
      setShowCreateDialog(false);
      loadCases();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create case', variant: 'destructive' });
    }
  };

  const loadCases = async () => {
    try {
      const data = await caseAPI.list();
      setCases(data);
      setFilteredCases(data);
    } catch (error) {
      toast({
        title: 'Error loading cases',
        description: error instanceof Error ? error.message : 'Failed to load cases',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'destructive';
      case 'Medium': return 'warning';
      case 'Low': return 'success';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading cases...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Cases</h1>
            <p className="text-muted-foreground">Manage and track all legal cases</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportCaseDataToCsv(filteredCases)} className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              New Case
            </Button>
          </div>
        </div>

        <CaseFilters onFilterChange={handleFilterChange} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCases.length > 0 ? (
            filteredCases.map((caseItem) => (
              <Card 
                key={caseItem.case_id} 
                className="hover:shadow-lg transition-shadow cursor-pointer h-full border-l-4" 
                style={{ borderLeftColor: `hsl(var(--${getPriorityColor(caseItem.priority)}))` }}
                onClick={() => navigate(`/cases/${caseItem.case_id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{caseItem.title || 'Untitled Case'}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Scale className="w-4 h-4" />
                        {caseItem.case_id}
                      </CardDescription>
                    </div>
                    <Badge variant={getPriorityColor(caseItem.priority) as any}>
                      {caseItem.priority}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Category:</span>
                      <span className="font-medium text-foreground">{caseItem.category || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium text-foreground">{caseItem.status || 'Active'}</span>
                    </div>
                    {caseItem.next_hearing && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Next Hearing:</span>
                        <span className="font-medium text-foreground">{caseItem.next_hearing}</span>
                      </div>
                    )}
                    {caseItem.analysis_status && (
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                        <span className="text-muted-foreground">AI Analysis:</span>
                        <Badge variant={caseItem.analysis_status === 'completed' ? 'success' : 'secondary'}>
                          {caseItem.analysis_status}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">No cases found</p>
                <p className="text-muted-foreground text-center">
                  Try adjusting your search criteria
                </p>
              </CardContent>
            </Card>
          )
          }
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Case</DialogTitle>
            </DialogHeader>
            <CaseForm
              onSubmit={handleCreateCase}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Cases;
