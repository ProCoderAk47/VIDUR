// File upload utilities for evidence files

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export interface UploadResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export const uploadFile = async (file: File, caseId: string, category: string): Promise<UploadResult> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('case_id', caseId);
  formData.append('category', category);

  try {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/api/upload/evidence`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      filePath: data.file_path,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
};

export const uploadMultipleFiles = async (
  files: { [key: string]: File[] },
  caseId: string
): Promise<{ [key: string]: string[] }> => {
  const results: { [key: string]: string[] } = {};

  for (const [category, fileList] of Object.entries(files)) {
    results[category] = [];
    for (const file of fileList) {
      const result = await uploadFile(file, caseId, category);
      if (result.success && result.filePath) {
        results[category].push(result.filePath);
      }
    }
  }

  return results;
};
