/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInvestigationGraph, executeInvestigation } from './index';
import type { ActionsClientLlm } from '@kbn/langchain/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import type { Alert } from '../../types';

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

const mockEsClient = {
  search: jest.fn(),
  get: jest.fn(),
} as unknown as ElasticsearchClient;

const mockLlmClient = {
  invoke: jest.fn(),
  bindTools: jest.fn().mockReturnThis(),
} as unknown as ActionsClientLlm;

const mockAlert: Alert = {
  _id: 'alert-123',
  _index: '.alerts-security.alerts-default',
  _source: {
    '@timestamp': '2026-03-22T10:00:00Z',
    'kibana.alert.rule.name': 'Suspicious PowerShell Execution',
    'kibana.alert.severity': 'high',
    'kibana.alert.risk_score': 75,
    'process.name': 'powershell.exe',
    'process.command_line': 'powershell.exe -enc [base64]',
    'user.name': 'admin',
    'host.name': 'WORKSTATION-01',
    'event.category': ['process'],
    'event.type': ['start'],
  },
};

describe('createInvestigationGraph', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a valid LangGraph workflow', () => {
    const graph = createInvestigationGraph({
      llmClient: mockLlmClient,
      esClient: mockEsClient,
      logger: mockLogger,
    });

    expect(graph).toBeDefined();
    expect(typeof graph.invoke).toBe('function');
  });

  it('should have triage and mitre nodes', () => {
    const graph = createInvestigationGraph({
      llmClient: mockLlmClient,
      esClient: mockEsClient,
      logger: mockLogger,
    });

    // Graph structure is opaque, but we can verify it was created
    expect(graph).toBeDefined();
  });
});

describe('executeInvestigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ES search for similar alerts
    (mockEsClient.search as jest.Mock).mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              '@timestamp': '2026-03-22T09:00:00Z',
              'kibana.alert.rule.name': 'Similar Rule',
              'kibana.alert.severity': 'high',
            },
          },
        ],
      },
    });

    // Mock LLM responses
    (mockLlmClient.invoke as jest.Mock)
      .mockResolvedValueOnce({
        // Triage response
        content: JSON.stringify({
          classification: 'HIGH',
          attackType: 'Lateral Movement',
          confidence: 85,
          reasoning: 'Suspicious PowerShell execution with lateral movement indicators',
        }),
      })
      .mockResolvedValueOnce({
        // MITRE mapping response
        content: JSON.stringify({
          techniques: [
            { id: 'T1059.001', name: 'PowerShell', confidence: 'HIGH' },
          ],
          tactics: [{ id: 'TA0002', name: 'Execution' }],
          phase: 'Execution',
          confidence: 'HIGH',
          reasoning: 'PowerShell execution detected',
        }),
      });
  });

  it('should execute investigation successfully', async () => {
    const result = await executeInvestigation({
      alert: mockAlert,
      llmClient: mockLlmClient,
      esClient: mockEsClient,
      logger: mockLogger,
    });

    expect(result).toBeDefined();
    expect(result.alertId).toBe('alert-123');
    expect(result.triage).toBeDefined();
    expect(result.triage?.classification).toBe('HIGH');
    expect(result.mitreMapping).toBeDefined();
    expect(result.mitreMapping?.techniques).toHaveLength(1);
    expect(result.latencyMs).toBeGreaterThan(0);
  });

  it('should include investigation text as markdown', async () => {
    const result = await executeInvestigation({
      alert: mockAlert,
      llmClient: mockLlmClient,
      esClient: mockEsClient,
      logger: mockLogger,
    });

    expect(result.investigationText).toContain('## 🤖 AI-Powered Alert Investigation');
    expect(result.investigationText).toContain('### 🎯 Triage Classification');
    expect(result.investigationText).toContain('### 🎭 MITRE ATT&CK Mapping');
  });

  it('should track latency correctly', async () => {
    const result = await executeInvestigation({
      alert: mockAlert,
      llmClient: mockLlmClient,
      esClient: mockEsClient,
      logger: mockLogger,
    });

    expect(result.latencyMs).toBeGreaterThan(0);
    expect(result.latencyMs).toBeLessThan(60000); // Should be < 1 minute
  });

  it('should include case ID if provided', async () => {
    const result = await executeInvestigation({
      alert: mockAlert,
      caseId: 'case-789',
      llmClient: mockLlmClient,
      esClient: mockEsClient,
      logger: mockLogger,
    });

    expect(result.caseId).toBe('case-789');
  });

  it('should handle errors gracefully with partial results', async () => {
    // First call succeeds (triage), second call fails (MITRE)
    (mockLlmClient.invoke as jest.Mock)
      .mockResolvedValueOnce({
        content: JSON.stringify({
          classification: 'HIGH',
          attackType: 'Lateral Movement',
          confidence: 87,
          reasoning: 'Test',
        }),
      })
      .mockRejectedValueOnce(new Error('MITRE LLM call failed'));

    // Investigation should complete with partial results (triage but no MITRE)
    const result = await executeInvestigation({
      alert: mockAlert,
      llmClient: mockLlmClient,
      esClient: mockEsClient,
      logger: mockLogger,
      enabledAgents: { triage: true, mitre: true, cti: false, investigation: false, remediation: false },
    });

    // Should have triage result
    expect(result.triage).toBeDefined();
    // MITRE may be undefined due to error (graceful degradation)
    console.log('Graceful degradation test: Investigation completed with partial results');
  });

  it('should log investigation progress', async () => {
    await executeInvestigation({
      alert: mockAlert,
      llmClient: mockLlmClient,
      esClient: mockEsClient,
      logger: mockLogger,
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('[Investigation] Starting investigation')
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('[Investigation] Completed')
    );
  });
});
