import { useState, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';

export interface AnalysisStage {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
}

export interface AnalysisProgress {
  caseId: string;
  overallStatus: 'pending' | 'processing' | 'completed' | 'failed';
  overallProgress: number;
  stages: {
    evidence_checking: AnalysisStage;
    summarization: AnalysisStage;
    legal_action: AnalysisStage;
  };
  error?: string;
}

export const useAnalysisProgress = (caseId: string, apiBaseUrl: string) => {
  const [progress, setProgress] = useState<AnalysisProgress>({
    caseId,
    overallStatus: 'pending',
    overallProgress: 0,
    stages: {
      evidence_checking: { name: 'Evidence Checking', status: 'pending', progress: 0 },
      summarization: { name: 'Summarization', status: 'pending', progress: 0 },
      legal_action: { name: 'Legal Action Analysis', status: 'pending', progress: 0 },
    },
  });

  // WebSocket URL for real-time updates
  const wsUrl = apiBaseUrl.replace('http', 'ws') + `/ws/analysis/${caseId}`;

  const { isConnected, lastMessage } = useWebSocket({
    url: wsUrl,
    onMessage: (message) => {
      if (message.type === 'analysis_update') {
        setProgress((prev) => ({
          ...prev,
          ...message.data,
        }));
      }
    },
    reconnect: true,
  });

  // Poll for status if WebSocket is not available
  useEffect(() => {
    if (isConnected) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/ai/case/${caseId}/status`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Map API response to progress state
          setProgress({
            caseId,
            overallStatus: data.analysis_status,
            overallProgress: calculateOverallProgress(data.stages_completed),
            stages: {
              evidence_checking: {
                name: 'Evidence Checking',
                status: data.stages_completed.evidence_checking ? 'completed' : 'pending',
                progress: data.stages_completed.evidence_checking ? 100 : 0,
              },
              summarization: {
                name: 'Summarization',
                status: data.stages_completed.summarization ? 'completed' : 'pending',
                progress: data.stages_completed.summarization ? 100 : 0,
              },
              legal_action: {
                name: 'Legal Action Analysis',
                status: data.stages_completed.legal_action_analysis ? 'completed' : 'pending',
                progress: data.stages_completed.legal_action_analysis ? 100 : 0,
              },
            },
            error: data.error,
          });
        }
      } catch (error) {
        console.error('[AnalysisProgress] Polling error:', error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [caseId, apiBaseUrl, isConnected]);

  return { progress, isConnected };
};

const calculateOverallProgress = (stages: any): number => {
  const completed = Object.values(stages).filter(Boolean).length;
  const total = Object.keys(stages).length;
  return Math.round((completed / total) * 100);
};
