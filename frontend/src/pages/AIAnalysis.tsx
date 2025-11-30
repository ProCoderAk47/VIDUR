import { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { caseAPI, aiAPI } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Brain, FileCheck, FileText, Scale, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const AIAnalysis = () => {
  const [cases, setCases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      const data = await caseAPI.list();
      setCases(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load cases',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReanalyze = async (caseId: string) => {
    try {
      await aiAPI.reanalyze(caseId, {});
      toast({
        title: 'Analysis Started',
        description: 'Re-analyzing case with latest AI models',
      });
      setTimeout(() => loadCases(), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start analysis',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <FileCheck className="w-5 h-5 text-success" />;
      case 'processing':
        return <RefreshCw className="w-5 h-5 text-info animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <FileText className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const filteredCases = cases.filter((c) => {
    if (selectedTab === 'all') return true;
    return c.analysis_status === selectedTab;
  });

  const stats = {
    total: cases.length,
    completed: cases.filter((c) => c.analysis_status === 'completed').length,
    processing: cases.filter((c) => c.analysis_status === 'processing').length,
    pending: cases.filter((c) => !c.analysis_status || c.analysis_status === 'pending').length,
    failed: cases.filter((c) => c.analysis_status === 'failed').length,
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading AI analysis data...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Brain className="w-10 h-10 text-primary" />
            AI Analysis Hub
          </h1>
          <p className="text-muted-foreground">Monitor and manage AI-powered case analysis</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Cases</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-success" />
                Completed
              </CardDescription>
              <CardTitle className="text-3xl text-success">{stats.completed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-info" />
                Processing
              </CardDescription>
              <CardTitle className="text-3xl text-info">{stats.processing}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Pending
              </CardDescription>
              <CardTitle className="text-3xl">{stats.pending}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                Failed
              </CardDescription>
              <CardTitle className="text-3xl text-destructive">{stats.failed}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Analysis Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Analysis Progress
            </CardTitle>
            <CardDescription>Overall AI analysis completion rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completion Rate</span>
                <span className="font-medium">{Math.round((stats.completed / Math.max(stats.total, 1)) * 100)}%</span>
              </div>
              <Progress value={(stats.completed / Math.max(stats.total, 1)) * 100} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Cases List with Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Case Analysis Status</CardTitle>
            <CardDescription>View and manage AI analysis for all cases</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({stats.completed})</TabsTrigger>
                <TabsTrigger value="processing">Processing ({stats.processing})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
                <TabsTrigger value="failed">Failed ({stats.failed})</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedTab} className="mt-6">
                <div className="space-y-4">
                  {filteredCases.length > 0 ? (
                    filteredCases.map((caseItem) => (
                      <Card key={caseItem.case_id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {getStatusIcon(caseItem.analysis_status)}
                                <h3 className="text-lg font-semibold text-foreground">{caseItem.title || 'Untitled Case'}</h3>
                                {getStatusBadge(caseItem.analysis_status)}
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">Case ID: {caseItem.case_id}</p>
                              
                              {caseItem.analysis_status === 'completed' && (
                                <div className="grid grid-cols-3 gap-4 mt-4">
                                  <div className="p-3 bg-secondary/30 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Evidence Confidence</p>
                                    <p className="text-lg font-semibold text-foreground">{Math.round((caseItem.evidence_confidence || 0) * 100)}%</p>
                                  </div>
                                  <div className="p-3 bg-secondary/30 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Summary Confidence</p>
                                    <p className="text-lg font-semibold text-foreground">{Math.round((caseItem.summary_confidence || 0) * 100)}%</p>
                                  </div>
                                  <div className="p-3 bg-secondary/30 rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-1">Legal Actions</p>
                                    <p className="text-lg font-semibold text-foreground">{caseItem.legal_confidence || 0}%</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex gap-2 ml-4">
                              <Button variant="outline" size="sm" onClick={() => navigate(`/cases/${caseItem.case_id}`)}>
                                View Details
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReanalyze(caseItem.case_id)}
                                disabled={caseItem.analysis_status === 'processing'}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No cases found in this category</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AIAnalysis;
