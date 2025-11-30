import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { caseAPI, aiAPI } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scale, Sparkles, FileSearch, Lightbulb, Calendar, RefreshCw, Download, Edit, FileText, Image, Music, Video, File as FileIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generatePdfReport, exportAnalysisToJson, generateEvidenceAnalysisMarkdown, generateSummaryMarkdown, generateLegalActionMarkdown } from '@/lib/export';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CaseForm } from '@/components/forms/CaseForm';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { uploadMultipleFiles } from '@/lib/fileUpload';


const CaseDetail = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [caseData, setCaseData] = useState<any>(null);
  const [fullAnalysis, setFullAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showReanalysisDialog, setShowReanalysisDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (caseId) {
      loadCaseData();
    }
  }, [caseId]);

  const loadCaseData = async () => {
    try {
      const data = await caseAPI.get(caseId!);
      setCaseData(data);

      // Load AI analysis if completed
      if (data.analysis_status === 'completed') {
        const analysis = await aiAPI.getFullAnalysis(caseId!);
        setFullAnalysis(analysis);
      }
    } catch (error) {
      toast({
        title: 'Error loading case',
        description: error instanceof Error ? error.message : 'Failed to load case data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeClick = () => {
    // Check if analysis already completed
    if (caseData?.analysis_status === 'completed') {
      setShowReanalysisDialog(true);
    } else {
      handleAnalyze();
    }
  };

  const handleAnalyze = async (forceReanalysis = false) => {
    setIsAnalyzing(true);
    setShowReanalysisDialog(false);
    try {
      await aiAPI.analyze(caseId!, { evidence_files: {}, force_reanalysis: forceReanalysis });
      toast({
        title: 'Analysis started',
        description: 'AI analysis is in progress. This may take a few moments.',
      });
      setTimeout(() => loadCaseData(), 3000);
    } catch (error) {
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Failed to start analysis',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEditCase = async (data: any, files?: { [key: string]: File[] }) => {
    try {
      // Update the case first
      await caseAPI.update(caseId!, data);
      
      // Upload files if any were selected
      if (files) {
        const hasFiles = Object.values(files).some(fileList => fileList.length > 0);
        if (hasFiles) {
          try {
            await uploadMultipleFiles(files, caseId!);
            toast({
              title: 'Success',
              description: 'Case updated successfully with evidence files uploaded',
            });
          } catch (uploadError) {
            // Case was updated but file upload failed
            toast({
              title: 'Case updated',
              description: 'Case updated but some files failed to upload. You can add them later.',
              variant: 'warning',
            });
          }
        } else {
          toast({
            title: 'Success',
            description: 'Case updated successfully',
          });
        }
      } else {
        toast({
          title: 'Success',
          description: 'Case updated successfully',
        });
      }
      
      setShowEditDialog(false);
      loadCaseData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update case',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadFile = async (file: any, fileIndex: number) => {
    try {
      const token = localStorage.getItem('access_token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      // Use unique_filename if available, otherwise use index
      const fileId = file.unique_filename || fileIndex.toString();
      const url = `${API_BASE_URL}/api/upload/evidence/${caseId}/${fileId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      // Get filename from response headers or use file name
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = file.name || file.file_name || 'download';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: 'Success',
        description: 'File downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to download file',
        variant: 'destructive',
      });
    }
  };



  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return Image;
    if (['mp3', 'wav', 'm4a', 'ogg'].includes(ext || '')) return Music;
    if (['mp4', 'avi', 'mov', 'mkv'].includes(ext || '')) return Video;
    if (['pdf'].includes(ext || '')) return FileText;
    return FileIcon;
  };

  const handleExportPdf = async () => {
    try {
      const pdfBlob = await generatePdfReport(caseData, fullAnalysis);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `case_${caseId}_report.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Success',
        description: 'Case report exported successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export report',
        variant: 'destructive',
      });
    }
  };

  const handleExportJson = () => {
    exportAnalysisToJson(fullAnalysis, caseId!);
    toast({
      title: 'Success',
      description: 'Analysis data exported successfully',
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading case details...</p>
        </div>
      </MainLayout>
    );
  }

  if (!caseData) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Case not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Scale className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">{caseData.title}</h1>
            </div>
            <p className="text-muted-foreground">Case ID: {caseData.case_id}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={caseData.priority === 'High' ? 'destructive' : caseData.priority === 'Medium' ? 'warning' : 'success'}>
              {caseData.priority} Priority
            </Badge>
            <Button variant="outline" onClick={() => setShowEditDialog(true)} size="sm" className="gap-2">
              <Edit className="w-4 h-4" />
              Edit Case
            </Button>
            {fullAnalysis && (
              <>
                <Button variant="outline" onClick={handleExportPdf} size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export PDF
                </Button>
                <Button variant="outline" onClick={handleExportJson} size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export JSON
                </Button>
              </>
            )}
            <Button onClick={handleAnalyzeClick} disabled={isAnalyzing} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? 'Analyzing...' : 'Run AI Analysis'}
            </Button>
          </div>
        </div>

        {/* Case Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Case Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Category</p>
              <p className="font-medium text-foreground">{caseData.category || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <p className="font-medium text-foreground">{caseData.status || 'Active'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Next Hearing</p>
              <p className="font-medium text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {caseData.next_hearing || 'Not scheduled'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">AI Analysis Status</p>
              <Badge variant={caseData.analysis_status === 'completed' ? 'success' : 'secondary'}>
                {caseData.analysis_status || 'pending'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Evidence Files - Show even without full analysis */}
        {caseData?.evidence_files && caseData.evidence_files.length > 0 && !fullAnalysis && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Evidence Files
              </CardTitle>
              <CardDescription>
                Uploaded documents, images, audio, and video files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {caseData.evidence_files.map((file: any, index: number) => {
                  const FileIcon = getFileIcon(file.name || file.file_name || file);
                  const fileName = file.name || file.file_name || file;
                  const fileSize = file.size || file.file_size_bytes;
                  const fileType = file.type || file.file_type;
                  return (
                    <Card 
                      key={index} 
                      className="p-4 cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => handleDownloadFile(file, index)}
                    >
                      <div className="flex items-start gap-3">
                        <FileIcon className="w-8 h-8 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{fileName}</p>
                            <Download className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          </div>
                          {fileSize && (
                            <p className="text-xs text-muted-foreground">
                              {(fileSize / 1024).toFixed(2)} KB
                            </p>
                          )}
                          {fileType && (
                            <p className="text-xs text-muted-foreground">{fileType}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Analysis Tabs */}
        {fullAnalysis && (
          <Tabs defaultValue="evidence" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="evidence" className="gap-2">
                <FileSearch className="w-4 h-4" />
                Evidence
              </TabsTrigger>
              <TabsTrigger value="files" className="gap-2">
                <FileText className="w-4 h-4" />
                Evidence Files
              </TabsTrigger>
              <TabsTrigger value="summary" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="legal" className="gap-2">
                <Lightbulb className="w-4 h-4" />
                Legal Actions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="evidence" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSearch className="w-5 h-5 text-primary" />
                    Evidence Analysis
                  </CardTitle>
                  <CardDescription>
                    Confidence Score: {((fullAnalysis.analysis_results?.evidence?.confidence || 0) * 100).toFixed(1)}%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {fullAnalysis.analysis_results?.evidence?.data ? (
                    <MarkdownRenderer content={generateEvidenceAnalysisMarkdown(fullAnalysis.analysis_results.evidence.data)} />
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No evidence analysis data available.</p>
                  )}                  
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Evidence Files
                  </CardTitle>
                  <CardDescription>
                    Uploaded documents, images, audio, and video files
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Get evidence files from caseData first, fallback to analysis results
                    const evidenceFiles = caseData?.evidence_files && caseData.evidence_files.length > 0
                      ? caseData.evidence_files
                      : (fullAnalysis?.analysis_results?.evidence?.data?.source_files || []);
                    
                    return evidenceFiles.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {evidenceFiles.map((file: any, index: number) => {
                          const FileIcon = getFileIcon(file.name || file.file_name || file);
                          const fileName = file.name || file.file_name || file;
                          const fileSize = file.size || file.file_size_bytes;
                          const fileType = file.type || file.file_type;
                          return (
                            <Card 
                              key={index} 
                              className="p-4 cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => handleDownloadFile(file, index)}
                            >
                              <div className="flex items-start gap-3">
                                <FileIcon className="w-8 h-8 text-primary flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm truncate">{fileName}</p>
                                    <Download className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  </div>
                                  {fileSize && (
                                    <p className="text-xs text-muted-foreground">
                                      {(fileSize / 1024).toFixed(2)} KB
                                    </p>
                                  )}
                                  {fileType && (
                                    <p className="text-xs text-muted-foreground">{fileType}</p>
                                  )}
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No evidence files uploaded</p>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="summary" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    AI-Generated Summary
                  </CardTitle>
                  <CardDescription>
                    Confidence Score: {((fullAnalysis.analysis_results?.summary?.confidence || 0) * 100).toFixed(1)}%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                    <MarkdownRenderer content={generateSummaryMarkdown(fullAnalysis.analysis_results.summary.data)} />
                  
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="legal" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    Legal Action Suggestions
                  </CardTitle>
                  <CardDescription>
                    AI-powered recommendations based on case analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Normalize different shapes returned by backend
                    const ls = fullAnalysis?.analysis_results?.legal_suggestions;
                    const judicial = fullAnalysis?.analysis_results?.judicial_analysis;

                    // priority: prefer ls as array -> ls.data -> judicial.recommended_actions -> judicial.recommendations
                    let legalData: any = null;
                    if (Array.isArray(ls)) legalData = ls;
                    else if (ls && ls.data) legalData = ls.data;
                    else if (ls && Array.isArray(ls.recommended_actions)) legalData = ls.recommended_actions;
                    else if (judicial && Array.isArray(judicial.recommended_actions)) legalData = judicial.recommended_actions;
                    else if (judicial && Array.isArray(judicial.legal_recommendations?.recommended_actions)) legalData = judicial.legal_recommendations.recommended_actions;
                    else if (ls) legalData = ls;
                    else if (judicial) legalData = judicial;

                    // If legalData is the judge-oriented analysis (has case_strength or judicial_recommendations)
                    const isJudicial = legalData && (legalData.case_strength || legalData.judicial_recommendations || legalData.applicable_laws);

                    // Determine display confidence (check different possible sources)
                    let displayConfidence: string | null = null;
                    if (isJudicial) {
                      // For judge-oriented: try confidence field or case_strength.overall_verdict_likelihood
                      if (legalData.confidence !== undefined && legalData.confidence !== null) {
                        displayConfidence = `${legalData.confidence}%`;
                      } else if (legalData.case_strength?.overall_verdict_likelihood) {
                        displayConfidence = `${legalData.case_strength.overall_verdict_likelihood}%`;
                      } else if (fullAnalysis.analysis_results?.judicial_confidence) {
                        displayConfidence = `${fullAnalysis.analysis_results.judicial_confidence}%`;
                      }
                    } else if (Array.isArray(legalData) && legalData.length > 0 && legalData[0].confidence !== undefined && legalData[0].confidence !== null) {
                      // For action suggestions: use first item's confidence
                      displayConfidence = `${legalData[0].confidence}%`;
                    } else if (fullAnalysis.analysis_results?.judicial_confidence !== undefined) {
                      // Fallback to top-level confidence
                      displayConfidence = `${fullAnalysis.analysis_results.judicial_confidence}%`;
                    }

                    if (isJudicial) {
                      // build a concise markdown view for judicial analysis
                      const jd = legalData;
                      const cs = jd.case_strength || {};
                      const laws = jd.applicable_laws || [];
                      const evidence = jd.critical_evidence_assessment || [];
                      const rec = jd.judicial_recommendations || jd.judicial_recommendations || {};

                      let md = `## ⚖️ Judicial Analysis\n\n`;
                      md += `**Verdict Likelihood:** ${cs.overall_verdict_likelihood || cs.overall_verdict_likelihood === 0 ? cs.overall_verdict_likelihood + '%' : 'N/A'}\n\n`;
                      if (cs.reasoning) md += `**Reasoning:** ${cs.reasoning}\n\n`;

                      if (laws.length > 0) {
                        md += '### 🏛️ Applicable Laws\n\n';
                        laws.forEach((law: any) => {
                          if (typeof law === 'string') md += `* ${law}\n`;
                          else md += `* ${law.law_name || law.name || law.act || JSON.stringify(law)}${law.section ? ' — ' + law.section : ''}${law.relevance ? ' : ' + law.relevance : ''}\n`;
                        });
                        md += '\n';
                      }

                      if (evidence.length > 0) {
                        md += '### 🔎 Critical Evidence Assessment\n\n';
                        evidence.forEach((ev: any) => {
                          md += `* **${ev.evidence_item || ev.item || 'Evidence'}** — ${ev.judicial_weight || ev.weight || 'N/A'}\n`;
                          if (ev.reasoning) md += `  *Reasoning:* ${ev.reasoning}\n`;
                          md += '\n';
                        });
                      }

                      if (rec && (rec.suggested_verdict || rec.relief_amount_suggested || (rec.alternative_scenarios && rec.alternative_scenarios.length))) {
                        md += '### 📝 Judicial Recommendations\n\n';
                        if (rec.suggested_verdict) md += `**Suggested Verdict:** ${rec.suggested_verdict}\n\n`;
                        if (rec.relief_amount_suggested) md += `**Relief (suggested):** ${rec.relief_amount_suggested}\n\n`;
                        if (rec.reasoning) md += `**Reasoning:** ${rec.reasoning}\n\n`;
                        if (rec.alternative_scenarios && rec.alternative_scenarios.length) {
                          md += '**Alternative Scenarios:**\n';
                          rec.alternative_scenarios.forEach((s: string) => md += `* ${s}\n`);
                          md += '\n';
                        }
                      }

                      if (jd.precedent_cases && jd.precedent_cases.length) {
                        md += '### 📚 Precedent Cases\n\n';
                        jd.precedent_cases.forEach((pc: any) => {
                          md += `* **${pc.case_citation || pc.case_name || pc.citation} (${pc.year || ''})** — ${pc.judicial_holding || pc.applicability || ''}\n`;
                          if (pc.similar_facts) md += `  *Similar facts:* ${pc.similar_facts}\n`;
                          md += '\n';
                        });
                      }

                      return (
                        <div>
                          <p className="text-sm text-muted-foreground mb-4">{displayConfidence ? `AI Confidence: ${displayConfidence}` : 'AI Confidence: N/A'}</p>
                          <MarkdownRenderer content={md} />
                        </div>
                      );
                    }

                    // Fallback: render as action suggestions
                    return (
                      <div>
                        <p className="text-sm text-muted-foreground mb-4">{displayConfidence ? `AI Confidence: ${displayConfidence}` : 'AI Confidence: N/A'}</p>
                        <MarkdownRenderer content={generateLegalActionMarkdown(legalData)} />
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {!fullAnalysis && caseData.analysis_status !== 'completed' && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Sparkles className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">No AI Analysis Available</p>
              <p className="text-muted-foreground text-center mb-4">
                Click "Run AI Analysis" to generate insights for this case
              </p>
            </CardContent>
          </Card>
        )}
        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Case</DialogTitle>
            </DialogHeader>
            <CaseForm
              initialData={caseData}
              onSubmit={handleEditCase}
              onCancel={() => setShowEditDialog(false)}
              isEdit={true}
            />
          </DialogContent>
        </Dialog>

        {/* Reanalysis Confirmation Dialog */}
        <AlertDialog open={showReanalysisDialog} onOpenChange={setShowReanalysisDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Analysis Already Exists</AlertDialogTitle>
              <AlertDialogDescription>
                This case has already been analyzed. Do you want to run the analysis again? This will overwrite the existing results.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleAnalyze(true)}>
                Yes, Reanalyze
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

    </MainLayout>
  );
};


export default CaseDetail;
