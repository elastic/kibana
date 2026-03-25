/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { createToolHandlerContext, createToolTestMocks } from '../__mocks__/test_helpers';
import { reportGenerateTool } from './report_generate_tool';

describe('reportGenerateTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = reportGenerateTool(mockCore, mockLogger);

  const fullSections = {
    executive_summary: 'A critical incident was detected involving lateral movement.',
    timeline: '10:00 - Initial access detected. 10:15 - Lateral movement observed.',
    mitre_mapping: 'T1059 - Command and Scripting Interpreter',
    impact_assessment: '3 servers compromised, no data exfiltration confirmed.',
    recommendations: 'Isolate affected hosts and rotate credentials.',
  };

  const requiredOnlySections = {
    executive_summary: 'A critical incident was detected.',
    timeline: '10:00 - Initial access detected.',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('schema', () => {
    it('validates correct input with all sections', () => {
      const validInput = {
        title: 'Incident Report - Malware Outbreak',
        sections: fullSections,
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates correct input with only required sections', () => {
      const validInput = {
        title: 'Incident Report',
        sections: requiredOnlySections,
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('rejects missing title', () => {
      const invalidInput = {
        sections: requiredOnlySections,
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects missing sections', () => {
      const invalidInput = {
        title: 'Incident Report',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects missing required executive_summary section', () => {
      const invalidInput = {
        title: 'Incident Report',
        sections: {
          timeline: '10:00 - Initial access detected.',
        },
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects missing required timeline section', () => {
      const invalidInput = {
        title: 'Incident Report',
        sections: {
          executive_summary: 'A critical incident occurred.',
        },
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('validates optional mitre_mapping section', () => {
      const validInput = {
        title: 'Incident Report',
        sections: {
          ...requiredOnlySections,
          mitre_mapping: 'T1059 - Command and Scripting Interpreter',
        },
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates optional impact_assessment section', () => {
      const validInput = {
        title: 'Incident Report',
        sections: {
          ...requiredOnlySections,
          impact_assessment: '3 servers compromised.',
        },
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates optional recommendations section', () => {
      const validInput = {
        title: 'Incident Report',
        sections: {
          ...requiredOnlySections,
          recommendations: 'Rotate all credentials immediately.',
        },
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('validates format enum', () => {
      const markdownInput = {
        title: 'Report',
        sections: requiredOnlySections,
        format: 'markdown',
      };
      expect(tool.schema.safeParse(markdownInput).success).toBe(true);

      const jsonInput = {
        title: 'Report',
        sections: requiredOnlySections,
        format: 'json',
      };
      expect(tool.schema.safeParse(jsonInput).success).toBe(true);
    });

    it('rejects invalid format', () => {
      const invalidInput = {
        title: 'Report',
        sections: requiredOnlySections,
        format: 'html',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });
  });

  describe('handler', () => {
    it('generates markdown report with correct structure', async () => {
      const result = (await tool.handler(
        { title: 'Malware Outbreak', sections: fullSections },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data.format).toBe('markdown');

      const report = result.results[0].data.report as string;
      expect(report).toContain('# Incident Report: Malware Outbreak');
      expect(report).toContain('## Executive Summary');
      expect(report).toContain(fullSections.executive_summary);
      expect(report).toContain('## Incident Timeline');
      expect(report).toContain(fullSections.timeline);
      expect(report).toContain('## MITRE ATT&CK Mapping');
      expect(report).toContain(fullSections.mitre_mapping);
      expect(report).toContain('## Impact Assessment');
      expect(report).toContain(fullSections.impact_assessment);
      expect(report).toContain('## Recommendations');
      expect(report).toContain(fullSections.recommendations);
    });

    it('generates markdown report without optional sections', async () => {
      const result = (await tool.handler(
        { title: 'Minimal Report', sections: requiredOnlySections },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const report = result.results[0].data.report as string;
      expect(report).toContain('## Executive Summary');
      expect(report).toContain('## Incident Timeline');
      expect(report).not.toContain('## MITRE ATT&CK Mapping');
      expect(report).not.toContain('## Impact Assessment');
      expect(report).not.toContain('## Recommendations');
    });

    it('generates JSON report', async () => {
      const result = (await tool.handler(
        { title: 'JSON Report', sections: fullSections, format: 'json' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      expect(result.results[0].data.format).toBe('json');

      const report = result.results[0].data.report as Record<string, unknown>;
      expect(report.title).toBe('JSON Report');
      expect(report.status).toBe('draft');
      expect(report.sections).toEqual(
        expect.objectContaining({
          executive_summary: fullSections.executive_summary,
          timeline: fullSections.timeline,
          mitre_mapping: fullSections.mitre_mapping,
          impact_assessment: fullSections.impact_assessment,
          recommendations: fullSections.recommendations,
        })
      );
    });

    it('generates JSON report without optional sections', async () => {
      const result = (await tool.handler(
        { title: 'Minimal JSON', sections: requiredOnlySections, format: 'json' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const report = result.results[0].data.report as Record<string, unknown>;
      const reportSections = report.sections as Record<string, unknown>;
      expect(reportSections.executive_summary).toBe(requiredOnlySections.executive_summary);
      expect(reportSections.timeline).toBe(requiredOnlySections.timeline);
      expect(reportSections.mitre_mapping).toBeUndefined();
      expect(reportSections.impact_assessment).toBeUndefined();
      expect(reportSections.recommendations).toBeUndefined();
    });

    it('counts sections correctly with all sections', async () => {
      const result = (await tool.handler(
        { title: 'Full Report', sections: fullSections },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].data.section_count).toBe(5);
    });

    it('counts sections correctly with only required sections', async () => {
      const result = (await tool.handler(
        { title: 'Minimal Report', sections: requiredOnlySections },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].data.section_count).toBe(2);
    });

    it('counts sections correctly with partial optional sections', async () => {
      const result = (await tool.handler(
        {
          title: 'Partial Report',
          sections: {
            ...requiredOnlySections,
            recommendations: 'Rotate credentials.',
          },
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].data.section_count).toBe(3);
    });

    it('includes timestamp in markdown report', async () => {
      const result = (await tool.handler(
        { title: 'Timestamped Report', sections: requiredOnlySections },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const report = result.results[0].data.report as string;
      expect(report).toContain('**Generated:** 2024-01-15T12:00:00.000Z');
    });

    it('includes timestamp in JSON report', async () => {
      const result = (await tool.handler(
        { title: 'Timestamped Report', sections: requiredOnlySections, format: 'json' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const report = result.results[0].data.report as Record<string, unknown>;
      expect(report.generated_at).toBe('2024-01-15T12:00:00.000Z');
    });

    it('defaults to markdown format when format is not specified', async () => {
      const result = (await tool.handler(
        { title: 'Default Format', sections: requiredOnlySections },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].data.format).toBe('markdown');
    });

    it('includes success message in result', async () => {
      const result = (await tool.handler(
        { title: 'Message Check', sections: requiredOnlySections },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].data.message).toContain('Message Check');
      expect(result.results[0].data.message).toContain('generated successfully');
    });
  });
});
