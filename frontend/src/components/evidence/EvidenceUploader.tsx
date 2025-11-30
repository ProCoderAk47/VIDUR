import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, File, FileText, Image, Music, Video, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedFile {
  file: File;
  type: 'documents' | 'pdf' | 'images' | 'audio' | 'video';
  preview?: string;
}

interface EvidenceUploaderProps {
  onFilesChange: (files: { [key: string]: File[] }) => void;
}

export const EvidenceUploader = ({ onFilesChange }: EvidenceUploaderProps) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const getFileType = (file: File): UploadedFile['type'] => {
    const type = file.type;
    if (type === 'application/pdf') return 'pdf';
    if (type.startsWith('image/')) return 'images';
    if (type.startsWith('audio/')) return 'audio';
    if (type.startsWith('video/')) return 'video';
    return 'documents';
  };

  const getFileIcon = (type: UploadedFile['type']) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-destructive" />;
      case 'images':
        return <Image className="w-8 h-8 text-primary" />;
      case 'audio':
        return <Music className="w-8 h-8 text-accent" />;
      case 'video':
        return <Video className="w-8 h-8 text-secondary" />;
      default:
        return <File className="w-8 h-8 text-muted-foreground" />;
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      type: getFileType(file),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));

    setUploadedFiles((prev) => {
      const updated = [...prev, ...newFiles];
      notifyFilesChange(updated);
      return updated;
    });
  }, []);

  const notifyFilesChange = (files: UploadedFile[]) => {
    const grouped: { [key: string]: File[] } = {
      documents: [],
      pdf: [],
      images: [],
      audio: [],
      video: [],
    };

    files.forEach(({ file, type }) => {
      grouped[type].push(file);
    });

    onFilesChange(grouped);
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      notifyFilesChange(updated);
      return updated;
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.ogg'],
      'video/*': ['.mp4', '.webm', '.mov', '.avi'],
      'text/*': ['.txt', '.doc', '.docx'],
    },
  });

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        )}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <input {...getInputProps()} />
          <Upload className={cn('w-12 h-12 mb-4', isDragActive ? 'text-primary' : 'text-muted-foreground')} />
          <p className="text-lg font-medium text-foreground mb-2">
            {isDragActive ? 'Drop files here' : 'Drag & drop evidence files'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Supports: PDF, Images, Audio, Video, Documents
          </p>
          <Button type="button" variant="outline">
            Browse Files
          </Button>
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            Uploaded Files ({uploadedFiles.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {uploadedFiles.map((item, index) => (
              <Card key={index}>
                <CardContent className="flex items-center gap-3 p-4">
                  {item.preview ? (
                    <img
                      src={item.preview}
                      alt={item.file.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    getFileIcon(item.type)
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(item.file.size / 1024).toFixed(2)} KB • {item.type}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
