// API client configuration and utilities

// Base URL (use Vite env or empty to use same origin)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Token management
export const getToken = () => localStorage.getItem('access_token');
export const setToken = (token: string) => localStorage.setItem('access_token', token);
export const removeToken = () => localStorage.removeItem('access_token');
export const getRefreshToken = () => localStorage.getItem('refresh_token');
export const setRefreshToken = (token: string) => localStorage.setItem('refresh_token', token);

// API client wrapper
export const apiClient = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const token = getToken();

  // If caller passed a full URL (starts with http), use it as-is. Otherwise prepend API_BASE_URL.
  const url = /^https?:\/\//i.test(endpoint)
    ? endpoint
    : `${API_BASE_URL.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  const isFormData = options.body instanceof FormData;

  const headers: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

// Auth API
export const authAPI = {
  login: (credentials: { username: string; password: string }) =>
    apiClient('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (data: { username: string; email: string; password: string; role?: string }) =>
    apiClient('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => apiClient('/api/auth/me'),

  logout: () =>
    apiClient('/api/auth/logout', {
      method: 'POST',
    }),

  refresh: () =>
    apiClient('/api/auth/refresh', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getRefreshToken()}`,
      },
    }),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => apiClient('/api/dashboard/stats'),
  getWorkloadMetrics: () => apiClient('/api/dashboard/workload-metrics'),
  getUpcomingHearings: () => apiClient('/api/dashboard/upcoming-hearings'),
  getAIInsights: (caseId: string) => apiClient(`/api/dashboard/ai-insights/${caseId}`),
  getCaseCounts: () => apiClient('/api/dashboard/case-counts'),
  getCategoryDistribution: () => apiClient('/api/dashboard/category-distribution'),
  getAnalysisStatus: () => apiClient('/api/dashboard/analysis-status'),
};

// Case API
export const caseAPI = {
  list: () => apiClient('/api/case/'),
  get: (caseId: string) => apiClient(`/api/case/${caseId}`),
  create: (data: any) =>
    apiClient('/api/case/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (caseId: string, data: any) =>
    apiClient(`/api/case/${caseId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (caseId: string) =>
    apiClient(`/api/case/${caseId}`, {
      method: 'DELETE',
    }),
};

// Schedule API
export const scheduleAPI = {
  list: () => apiClient('/api/schedule/'),
  getByDate: (date: string) => apiClient(`/api/schedule/by-date/${date}`),
  getByRange: (startDate: string, endDate: string) =>
    apiClient(`/api/schedule/by-range?start_date=${startDate}&end_date=${endDate}`),
  get: (scheduleId: number) => apiClient(`/api/schedule/${scheduleId}`),
  create: (data: any) =>
    apiClient('/api/schedule/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (scheduleId: number, data: any) =>
    apiClient(`/api/schedule/${scheduleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (scheduleId: number) =>
    apiClient(`/api/schedule/${scheduleId}`, {
      method: 'DELETE',
    }),
  checkConflicts: () => apiClient('/api/schedule/conflicts'),
};

// AI API
export const aiAPI = {
  analyze: (caseId: string, data: any) =>
    apiClient(`/api/ai/analyze/${caseId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getEvidence: (caseId: string) => apiClient(`/api/ai/case/${caseId}/evidence`),
  getSummary: (caseId: string) => apiClient(`/api/ai/case/${caseId}/summary`),
  getLegalActions: (caseId: string) => apiClient(`/api/ai/case/${caseId}/legal-actions`),
  getStatus: (caseId: string) => apiClient(`/api/ai/case/${caseId}/status`),
  getFullAnalysis: (caseId: string) => apiClient(`/api/ai/case/${caseId}/full-analysis`),
  reanalyze: (caseId: string, data: any) =>
    apiClient(`/api/ai/case/${caseId}/reanalyze`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  health: () => apiClient('/api/ai/health'),
};
