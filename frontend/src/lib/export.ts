import { format } from 'date-fns';

/**
 * Utility function to download content as a file.
 * This function needs to be defined for the exports to work in a browser environment.
 */
const downloadFile = (content: string | Blob, filename: string, mimeType: string) => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// --- CSV Export Utilities ---

export const exportToCsv = (data: any[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
        // Enclose value in quotes and escape internal quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    ),
  ].join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
};

export const exportCaseDataToCsv = (cases: any[]) => {
  const formattedData = cases.map((c) => ({
    case_id: c.case_id,
    title: c.title,
    category: c.category,
    priority: c.priority,
    status: c.status,
    next_hearing: c.next_hearing,
    analysis_status: c.analysis_status,
    evidence_confidence: c.evidence_confidence ? `${Math.round(c.evidence_confidence * 100)}%` : 'N/A',
    summary_confidence: c.summary_confidence ? `${Math.round(c.summary_confidence * 100)}%` : 'N/A',
    legal_confidence: c.legal_confidence ? `${c.legal_confidence}%` : 'N/A',
  }));

  exportToCsv(formattedData, `cases_export_${format(new Date(), 'yyyy-MM-dd')}`);
};

export const exportScheduleToCsv = (schedules: any[]) => {
  const formattedData = schedules.map((s) => ({
    case_id: s.case_id,
    date: s.date,
    start_time: s.start_time,
    end_time: s.end_time,
    event_type: s.event_type,
    description: s.description,
    location: s.location,
  }));

  exportToCsv(formattedData, `schedule_export_${format(new Date(), 'yyyy-MM-dd')}`);
};

// --- Analysis Export Utilities (JSON, Markdown, PDF) ---

export const exportAnalysisToJson = (analysis: any, caseId: string) => {
  const jsonContent = JSON.stringify(analysis, null, 2);
  downloadFile(jsonContent, `case_${caseId}_analysis_${format(new Date(), 'yyyy-MM-dd')}.json`, 'application/json');
};


/**
 * Generates a professional, formatted Markdown string from the Evidence Analysis JSON.
 * @param analysisData The evidence analysis JSON object.
 * @returns A formatted Markdown string.
 */
export const generateEvidenceAnalysisMarkdown = (analysisData: any): string => {
  const { combined_text, facts, key_entities, legal_references, timeline, witness_statements, completeness_assessment } = analysisData;

  let markdown = '## ⚖️ Detailed Evidence Analysis Report\n\n';
  markdown += '---\n\n';

  // 0. Completeness Assessment (New Section)
  if (completeness_assessment) {
      const readiness = Math.round((completeness_assessment.case_readiness || 0) * 100);
      let icon = '🟢';
      if (readiness < 70) icon = '🟡';
      if (readiness < 40) icon = '🔴';

      markdown += `### 📊 Case Readiness: ${icon} ${readiness}%\n\n`;
      
      if (completeness_assessment.present_information && completeness_assessment.present_information.length > 0) {
          markdown += '**✅ Information Present:**\n';
          completeness_assessment.present_information.forEach((info: string) => {
              markdown += `* ${info}\n`;
          });
          markdown += '\n';
      }

      if (completeness_assessment.missing_information && completeness_assessment.missing_information.length > 0) {
          markdown += '**⚠️ Missing / Critical Information:**\n';
          completeness_assessment.missing_information.forEach((info: string) => {
              markdown += `* ${info}\n`;
          });
          markdown += '\n';
      }
      markdown += '---\n\n';
  }

  // 1. Combined Text (Summary/Overview)
  if (combined_text) {
    markdown += '### 📜 Analysis Overview\n\n';
    // Truncate if too long
    const displayText = combined_text.length > 500 ? combined_text.substring(0, 500) + "..." : combined_text;
    markdown += `> ${displayText.trim()}\n\n`;
    markdown += '---\n\n';
  }

  // 2. Key Entities (Dates, Money, Persons)
  const hasKeyEntities = key_entities && (key_entities.dates.length > 0 || key_entities.money_amounts.length > 0 || key_entities.persons.length > 0);
  if (hasKeyEntities) {
    markdown += '### 👤 Key Entities Identified\n\n';

    if (key_entities.persons && key_entities.persons.length > 0) {
      markdown += '**Key Persons:**\n';
      markdown += key_entities.persons.map((p: string) => `* ${p}`).join('\n') + '\n\n';
    }

    if (key_entities.dates && key_entities.dates.length > 0) {
      markdown += '**Relevant Dates:**\n';
      markdown += key_entities.dates.map((d: string) => `* ${d}`).join('\n') + '\n\n';
    }

    if (key_entities.money_amounts && key_entities.money_amounts.length > 0) {
      markdown += '**Financial Figures:**\n';
      markdown += key_entities.money_amounts.map((m: string) => `* ${m}`).join('\n') + '\n\n';
    }
    markdown += '---\n\n';
  }

  // 3. Facts
  if (facts && facts.length > 0) {
    markdown += '### ✅ Extracted Facts\n\n';
    facts.forEach((fact: string, index: number) => {
      markdown += `**Fact ${index + 1}:** ${fact}\n\n`;
    });
    markdown += '---\n\n';
  }

  // 4. Timeline
  if (timeline && timeline.length > 0) {
    markdown += '### ⏰ Chronological Timeline\n\n';
    // Assuming timeline items are objects with 'date' and 'event' properties
    const timelineItems = timeline.map((item: any) => {
        if (typeof item === 'string') return `* ${item}`;
        return `* **${item.date || 'N/A'}**: ${item.description || item.event || 'No description'}`;
    });
    markdown += timelineItems.join('\n') + '\n\n';
    markdown += '---\n\n';
  }

  // 5. Witness Statements
  if (witness_statements && witness_statements.length > 0) {
    markdown += '### 🗣️ Witness Statements\n\n';
    witness_statements.forEach((statement: string, index: number) => {
      markdown += `**Witness Statement ${index + 1}:**\n`;
      markdown += `> ${statement}\n\n`;
    });
    markdown += '---\n\n';
  }

  // 6. Legal References
  if (legal_references && legal_references.length > 0) {
    markdown += '### 📚 Legal Precedents & References\n\n';
    legal_references.forEach((ref: string, index: number) => {
      markdown += `* **Reference ${index + 1}:** ${ref}\n`;
    });
    markdown += '\n---\n';
  }

  // Fallback for empty analysis
  if (!combined_text && !hasKeyEntities && (!facts || facts.length === 0) && (!timeline || timeline.length === 0)) {
      markdown = '## ⚠️ Evidence Analysis\n\n**No detailed evidence analysis data available.**';
  }

  return markdown;
};

/**
 * Generates a professional, formatted Markdown string from the Case Summary JSON.
 * @param summaryData The summary analysis JSON object.
 * @returns A formatted Markdown string.
 */
export const generateSummaryMarkdown = (summaryData: any): string => {
  if (!summaryData) return '';

  const { confidence_score, facts, key_points, legal_issues, summary } = summaryData;

  let markdown = '## 📝 AI Case Summary Report\n\n';

  // 1. Confidence Score
  if (confidence_score !== undefined && confidence_score !== null) {
    const percentage = Math.round(confidence_score * 100);
    let icon = '🟢'; // High
    if (percentage < 70) icon = '🟡'; // Medium
    if (percentage < 40) icon = '🔴'; // Low
    
    markdown += `> **${icon} AI Confidence Score:** ${percentage}%\n\n`;
    markdown += '---\n\n';
  }

  // 2. Executive Summary (Primary Content)
  if (summary) {
    markdown += '### 📋 Executive Summary\n\n';
    markdown += `${summary}\n\n`;
  }

  // 3. Key Points
  if (key_points && Array.isArray(key_points) && key_points.length > 0) {
    markdown += '### 🔑 Key Points\n\n';
    key_points.forEach((point: string) => {
      markdown += `* ${point}\n`;
    });
    markdown += '\n';
  }

  // 4. Legal Issues
  if (legal_issues && Array.isArray(legal_issues) && legal_issues.length > 0) {
    markdown += '### ⚖️ Identified Legal Issues\n\n';
    legal_issues.forEach((issue: string) => {
      markdown += `* ${issue}\n`;
    });
    markdown += '\n';
  }

  // 5. Facts
  // Handling 'facts' as a string (based on your JSON) or an array (just in case)
  if (facts) {
    markdown += '### 🔍 Relevant Facts & Statements\n\n';
    if (Array.isArray(facts) && facts.length > 0) {
      facts.forEach((fact: string) => {
        markdown += `* ${fact}\n`;
      });
    } else if (typeof facts === 'string' && facts.trim().length > 0) {
      // If it's a string like "WITNESS STATEMENTS:", we display it as text
      markdown += `${facts}\n`;
    }
  }

  // Fallback for empty data
  if (!summary && (!key_points || key_points.length === 0) && (!legal_issues || legal_issues.length === 0)) {
    markdown += '_No summary analysis generated yet._';
  }

  return markdown;
};

/**
 * Generates a professional, formatted Markdown string from a Legal Action Suggestion JSON.
 * @param actionData The legal action suggestion object.
 * @returns A formatted Markdown string.
 */
export const generateLegalActionMarkdown = (actionData: any): string => {
  // Handle case where data is nested inside a 'data' property (common in your API response)
  let data = actionData?.data || actionData;

  // 1. Direct Array Check (Most likely scenario now)
  if (Array.isArray(data)) {
    let fullMarkdown = "";
    data.forEach((actionItem: any, index: number) => {
        fullMarkdown += generateSingleActionMarkdown(actionItem, index > 0);
    });
    return fullMarkdown;
  }
  
  // 2. Nested in legal_recommendations (Backend structure artifact)
  if (data?.legal_recommendations?.recommended_actions) {
      data = data.legal_recommendations;
  }
  
  // 3. Nested in recommended_actions (LLM output structure)
  if (data?.recommended_actions && Array.isArray(data.recommended_actions)) {
    let fullMarkdown = "";
    data.recommended_actions.forEach((actionItem: any, index: number) => {
        fullMarkdown += generateSingleActionMarkdown(actionItem, index > 0);
    });
    return fullMarkdown;
  }
  
  // 4. Single Object Fallback
  return generateSingleActionMarkdown(data);
};

const generateSingleActionMarkdown = (data: any, addSeparator = false): string => {
  if (!data || Object.keys(data).length === 0) return '';

  const { 
    applicable_laws, 
    confidence, 
    llm_strength_assessment, 
    next_steps, 
    priority, 
    reasoning, 
    risk_factors, 
    suggested_action, 
    action, // Fallback for some API responses
    rationale // Fallback
  } = data;

  // 1. Header: Action Title
  let markdown = "";
  
  if (addSeparator) {
      markdown += "\n---\n\n";
  }
  
  markdown += `## ⚖️ ${suggested_action || action || 'Suggested Legal Action'}\n\n`;

  // 2. Meta Data (Priority & Confidence)
  const priorityUpper = priority ? priority.toUpperCase() : 'NORMAL';
  let priorityIcon = '🔵'; // Normal/Low
  if (priorityUpper === 'HIGH') priorityIcon = '🔴';
  if (priorityUpper === 'MEDIUM') priorityIcon = '🟡';

  const confidencePercent = confidence !== undefined ? `${confidence}%` : 'N/A';
  
  markdown += `**Priority:** ${priorityIcon} ${priorityUpper} &nbsp;&nbsp;|&nbsp;&nbsp; **AI Confidence:** ${confidencePercent}\n\n`;
  markdown += '---\n\n';

  // 3. Reasoning
  if (reasoning) {
    markdown += '### 🧠 Legal Reasoning\n\n';
    markdown += `> ${reasoning}\n\n`;
  }

  // 4. Strength Assessment (Moved up as it provides context)
  if (llm_strength_assessment && Object.keys(llm_strength_assessment).length > 0) {
    markdown += '### 📊 Strength Assessment\n\n';
    markdown += '| Metric | Assessment |\n';
    markdown += '| :--- | :--- |\n';
    Object.entries(llm_strength_assessment).forEach(([key, value]) => {
      // Format key: "evidence_strength" -> "Evidence Strength"
      const formatKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      markdown += `| **${formatKey}** | ${value} |\n`;
    });
    markdown += '\n';
  }

  // 5. Applicable Laws
  if (applicable_laws && applicable_laws.length > 0) {
    markdown += '### 🏛️ Applicable Laws\n\n';
    applicable_laws.forEach((law: any) => {
      if (!law) return;
      if (typeof law === 'string') {
        markdown += `* ${law}\n`;
      } else if (typeof law === 'object') {
        const name = law.law_name || law.law || law.name || law.act || '';
        const section = law.section || law.section_number || law.clause || '';
        const desc = law.description || law.relevance || '';
        let line = '';
        if (name) line += name;
        if (section) line += (line ? ' — ' : '') + section;
        if (!line) line = JSON.stringify(law);
        if (desc) line += ` : ${desc}`;
        markdown += `* ${line}\n`;
      } else {
        markdown += `* ${String(law)}\n`;
      }
    });
    markdown += '\n';
  }

  // 6. Risk Factors
  if (risk_factors && risk_factors.length > 0) {
    markdown += '### ⚠️ Risk Factors\n\n';
    risk_factors.forEach((risk: string) => {
      markdown += `* ${risk}\n`;
    });
    markdown += '\n';
  }

  // 7. Next Steps (Formatted as a checklist)
  if (next_steps && next_steps.length > 0) {
    markdown += '### 👣 Recommended Next Steps\n\n';
    next_steps.forEach((step: string) => {
      markdown += `- [ ] ${step}\n`;
    });
    markdown += '\n';
  }

  return markdown;
};
/**
 * Exports the analysis data as a professionally formatted Markdown file.
 */
export const exportAnalysisToMarkdown = (analysis: any, caseId: string) => {
  const markdownContent = generateEvidenceAnalysisMarkdown(analysis);
  downloadFile(markdownContent, `case_${caseId}_analysis_${format(new Date(), 'yyyy-MM-dd')}.md`, 'text/markdown');
};


export const generatePdfReport = async (caseData: any, analysis: any): Promise<Blob> => {
  const summary = analysis?.analysis_results?.summary?.data || {};
  const evidence = analysis?.analysis_results?.evidence?.data || {};
  const legalSuggestions = analysis?.analysis_results?.legal_suggestions?.data || [];

  const pretty = (obj: any) =>
    obj ? JSON.stringify(obj, null, 2).replace(/\n/g, "<br>") : "No data available";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Case Report - ${caseData.case_id}</title>

      <style>
        body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
        h1 { color: #1e3a8a; border-bottom: 3px solid #d4af37; padding-bottom: 10px; }
        h2 { margin-top: 30px; color: #1e3a8a; border-bottom: 1px solid #d1d5db; padding-bottom: 5px; }
        h3 { margin-top: 12px; color: #111827; }
        .section { margin-bottom: 35px; }
        .block { background: #f9fafb; padding: 15px; border-radius: 6px; margin-top: 10px; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
        .info-item { padding: 10px; background: #eef2ff; border-left: 4px solid #4f46e5; border-radius: 5px; }
        .label { font-weight: bold; }
        .suggestion { padding: 15px; margin: 10px 0; background: #fff7ed; border-left: 4px solid #d97706; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; }
        pre { background: #f3f4f6; padding: 15px; border-radius: 5px; overflow-x: auto; }
      </style>
    </head>

    <body>
      <!-- HEADER -->
      <div class="header">
        <h1>Legal Case Analysis Report</h1>
        <p><strong>Case ID:</strong> ${caseData.case_id}</p>
        <p><strong>Title:</strong> ${caseData.title}</p>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
      </div>

      <!-- CASE METADATA SECTION -->
      <div class="section">
        <h2>Case Metadata</h2>
        <div class="info-grid">
          <div class="info-item"><span class="label">Category:</span> ${caseData.category}</div>
          <div class="info-item"><span class="label">Priority:</span> ${caseData.priority}</div>
          <div class="info-item"><span class="label">Status:</span> ${caseData.status}</div>
          <div class="info-item"><span class="label">Next Hearing:</span> ${caseData.next_hearing || "Not Scheduled"}</div>
        </div>
      </div>

      <!-- EVIDENCE ANALYSIS -->
      <div class="section">
        <h2>Evidence Analysis</h2>
        <div class="block">
          <p><strong>Confidence:</strong> ${
            Math.round((analysis?.analysis_results?.evidence?.confidence || 0) * 100)
          }%</p>
          <p><strong>Extracted Evidence Data:</strong></p>
          <pre>${pretty(evidence)}</pre>
        </div>
      </div>

      <!-- SUMMARY ANALYSIS -->
      <div class="section">
        <h2>Case Summary</h2>
        <div class="block">
          <p><strong>Confidence:</strong> ${
            Math.round((analysis?.analysis_results?.summary?.confidence || 0) * 100)
          }%</p>
          
          <h3>1. Facts Extracted</h3>
          <pre>${pretty(summary.facts)}</pre>

          <h3>2. Issues Identified</h3>
          <pre>${pretty(summary.issues)}</pre>

          <h3>3. Summary Narrative</h3>
          <pre>${pretty(summary.summary)}</pre>
        </div>
      </div>

      <!-- LEGAL SUGGESTIONS -->
      ${
        legalSuggestions.length > 0
          ? `
      <div class="section">
        <h2>Legal Action Suggestions</h2>
        ${legalSuggestions
          .map(
            (s: any, i: number) => `
          <div class="suggestion">
            <h3>Suggestion ${i + 1}: ${s.action || "Proposed Action"}</h3>
            <p><strong>Confidence:</strong> ${s.confidence || "N/A"}%</p>
            <p><strong>Rationale:</strong> ${s.rationale || "No rationale provided"}</p>

            ${
              s.laws?.length
                ? `<p><strong>Relevant Laws:</strong></p>
               <pre>${pretty(s.laws)}</pre>`
                : ""
            }
          </div>
        `
          )
          .join("")}
      </div>
      `
          : ""
      }

      <!-- ANNEXURES (Evidence Files) -->
      ${
        caseData.evidence_files
          ? `
        <div class="section">
          <h2>Annexures (Submitted Evidence Files)</h2>
          <div class="block">
            <pre>${pretty(caseData.evidence_files)}</pre>
          </div>
        </div>
      `
          : ""
      }

      <!-- FOOTER -->
      <div class="footer">
        <p>This report was generated automatically by AI Legal Assistant.</p>
        <p>Confidential Legal Document</p>
      </div>

    </body>
    </html>
  `;

  return new Blob([html], { type: "text/html" });
};

// NOTE: The original 'downloadFile' utility was moved to the top of the file 
// and made a regular function (not exported) as it's a private helper 
// for the exported functions.
// If you need to export it, change 'const downloadFile' to 'export const downloadFile'
// where it is defined.