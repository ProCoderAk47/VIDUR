import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { EvidenceUploader } from '@/components/evidence/EvidenceUploader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { aiAPI, caseAPI } from '@/lib/api';
import { FileCheck, Upload } from 'lucide-react';
import { useEffect } from 'react';

const EvidenceChecker = () => {
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<string>('');
  const [files, setFiles] = useState<{ [key: string]: File[] }>({});
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

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
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedCase) {
      toast({
        title: 'Error',
        description: 'Please select a case',
        variant: 'destructive',
      });
      return;
    }

    if (Object.values(files).every((arr) => arr.length === 0)) {
      toast({
        title: 'Error',
        description: 'Please upload at least one file',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload files to backend
      const { uploadMultipleFiles } = await import('@/lib/fileUpload');
      const evidenceFiles = await uploadMultipleFiles(files, selectedCase);

      // Start AI analysis with uploaded file paths
      await aiAPI.analyze(selectedCase, { evidence_files: evidenceFiles });

      toast({
        title: 'Success',
        description: 'Evidence uploaded and analysis started',
      });

      // Reset form
      setFiles({});
      setSelectedCase('');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload and analyze',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Evidence Checker</h1>
          <p className="text-muted-foreground">Upload and analyze case evidence with AI</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" />
              Upload Evidence
            </CardTitle>
            <CardDescription>
              Drag and drop files or browse to upload evidence for AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Select Case
              </label>
              <Select value={selectedCase} onValueChange={setSelectedCase}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a case to upload evidence" />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.case_id} value={c.case_id}>
                      {c.case_id} - {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <EvidenceUploader onFilesChange={setFiles} />

            <div className="flex justify-end">
              <Button
                onClick={handleUploadAndAnalyze}
                disabled={isUploading || !selectedCase}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                {isUploading ? 'Uploading...' : 'Upload & Analyze'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supported File Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-secondary/30 rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">Documents</h4>
                <p className="text-sm text-muted-foreground">.txt, .doc, .docx</p>
              </div>
              <div className="p-4 bg-secondary/30 rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">PDF</h4>
                <p className="text-sm text-muted-foreground">.pdf files</p>
              </div>
              <div className="p-4 bg-secondary/30 rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">Images</h4>
                <p className="text-sm text-muted-foreground">.jpg, .png, .gif, .webp</p>
              </div>
              <div className="p-4 bg-secondary/30 rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">Audio/Video</h4>
                <p className="text-sm text-muted-foreground">.mp3, .wav, .mp4, .mov</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default EvidenceChecker;
