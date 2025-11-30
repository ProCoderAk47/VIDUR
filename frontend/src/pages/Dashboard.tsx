import { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { dashboardAPI } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Scale, Clock, AlertCircle, CheckCircle, Calendar, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [workload, setWorkload] = useState<any>(null);
  const [upcomingHearings, setUpcomingHearings] = useState<any[]>([]);
  const [caseCounts, setCaseCounts] = useState<any>(null);
  const [categoryDist, setCategoryDist] = useState<any>(null);
  const [analysisStatus, setAnalysisStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsData, workloadData, hearingsData, countsData, categoryData, statusData] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getWorkloadMetrics(),
        dashboardAPI.getUpcomingHearings(),
        dashboardAPI.getCaseCounts(),
        dashboardAPI.getCategoryDistribution(),
        dashboardAPI.getAnalysisStatus(),
      ]);

      setStats(statsData);
      setWorkload(workloadData);
      setUpcomingHearings(hearingsData.upcoming_hearings || []);
      setCaseCounts(countsData);
      setCategoryDist(categoryData);
      setAnalysisStatus(statusData);
    } catch (error) {
      toast({
        title: 'Error loading dashboard',
        description: error instanceof Error ? error.message : 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const priorityData = caseCounts ? [
    { name: 'High Priority', value: caseCounts.high_priority, color: 'hsl(var(--destructive))' },
    { name: 'Medium Priority', value: caseCounts.medium_priority, color: 'hsl(var(--warning))' },
    { name: 'Low Priority', value: caseCounts.low_priority, color: 'hsl(var(--success))' },
  ].filter(item => item.value > 0) : [];

  const categoryChartData = categoryDist ? Object.entries(categoryDist).map(([name, value]) => ({
    name,
    cases: value
  })) : [];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your AI-powered judicial assistant</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Cases</CardTitle>
                <Scale className="w-5 h-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{caseCounts?.total_cases || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Active cases in system</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">High Priority</CardTitle>
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{caseCounts?.high_priority || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Urgent attention required</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-info">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Court Hours</CardTitle>
                <Clock className="w-5 h-5 text-info" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{workload?.total_estimated_court_hours || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Estimated workload</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-success">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">AI Analyzed</CardTitle>
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{analysisStatus?.completed || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Cases analyzed by AI</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Priority Distribution
              </CardTitle>
              <CardDescription>Case breakdown by priority level</CardDescription>
            </CardHeader>
            <CardContent>
              {priorityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No priority data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-primary" />
                Cases by Category
              </CardTitle>
              <CardDescription>Distribution across legal categories</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="cases" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Hearings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Upcoming Hearings
            </CardTitle>
            <CardDescription>Next scheduled court appearances</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingHearings.length > 0 ? (
              <div className="space-y-4">
                {upcomingHearings.slice(0, 5).map((hearing) => (
                  <div key={hearing.case_id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{hearing.title}</h4>
                      <p className="text-sm text-muted-foreground">Case ID: {hearing.case_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{hearing.next_hearing}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        hearing.priority === 'High' ? 'bg-destructive/10 text-destructive' :
                        hearing.priority === 'Medium' ? 'bg-warning/10 text-warning' :
                        'bg-success/10 text-success'
                      }`}>
                        {hearing.priority} Priority
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No upcoming hearings scheduled</p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
