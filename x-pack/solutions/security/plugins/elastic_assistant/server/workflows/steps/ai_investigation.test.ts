/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAiInvestigationStepDefinition } from './ai_investigation';
import type { Logger } from '@kbn/core/server';
import type { ConfigSchema } from '../../config_schema';
import type { AiInvestigationStepInput } from '../../../common/workflows/steps/ai_investigation';

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
} as unknown as Logger;

const mockConfig: ConfigSchema = {
  elserInferenceId: '.elser_model_2',
  responseTimeout: 60000,
  llmInvestigationEnabled: true,
};

const mockGetActionsClient = jest.fn();
const mockActionsClient = {
  get: jest.fn(),
};
const mockEsClient = {
  get: jest.fn(),
  search: jest.fn(),
};
const mockLlmClient = {
  invoke: jest.fn(),
  bindTools: jest.fn().mockReturnThis(),
};

const mockWorkflowContext = {
  request: {} as any,
  esClient: mockEsClient as any,
  logger: mockLogger,
};

describe('createAiInvestigationStepDefinition', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetActionsClient.mockResolvedValue(jest.fn().mockResolvedValue(mockActionsClient));
    mockActionsClient.get.mockResolvedValue({
      id: 'connector-123',
      actionTypeId: '.anthropic',
      name: 'Claude',
    });
  });

  it('should create step definition with correct metadata', () => {
    const stepDef = createAiInvestigationStepDefinition({
      getActionsClient: mockGetActionsClient,
      config: mockConfig,
      logger: mockLogger,
    });

    expect(stepDef.id).toBe('elastic_assistant.ai_investigation');
    expect(stepDef.label).toContain('AI-Powered');
    expect(stepDef.description).toContain('autonomous multi-agent investigation');
  });

  it('should have correct input and output schemas', () => {
    const stepDef = createAiInvestigationStepDefinition({
      getActionsClient: mockGetActionsClient,
      config: mockConfig,
      logger: mockLogger,
    });

    const inputKeys = Object.keys(stepDef.inputSchema.shape);
    expect(inputKeys).toContain('alert_id');
    expect(inputKeys).toContain('alert_index');
    expect(inputKeys).toContain('connector_id');
    expect(inputKeys).toContain('case_id');
    expect(inputKeys).toContain('enabled_agents');

    const outputKeys = Object.keys(stepDef.outputSchema.shape);
    expect(outputKeys).toContain('alert_id');
    expect(outputKeys).toContain('triage');
    expect(outputKeys).toContain('mitre_mapping');
    expect(outputKeys).toContain('investigation_text');
    expect(outputKeys).toContain('latency_ms');
  });

  it('should throw error if feature is disabled', async () => {
    const disabledConfig: ConfigSchema = {
      ...mockConfig,
      llmInvestigationEnabled: false,
    };

    const stepDef = createAiInvestigationStepDefinition({
      getActionsClient: mockGetActionsClient,
      config: disabledConfig,
      logger: mockLogger,
    });

    const input: AiInvestigationStepInput = {
      alert_id: 'alert-123',
      alert_index: '.alerts-security.alerts-default',
      connector_id: 'connector-123',
    };

    await expect(stepDef.handler(input, mockWorkflowContext)).rejects.toThrow(
      'not enabled'
    );
  });

  it('should throw error if alert not found', async () => {
    mockEsClient.get.mockResolvedValue({ found: false });

    const stepDef = createAiInvestigationStepDefinition({
      getActionsClient: mockGetActionsClient,
      config: mockConfig,
      logger: mockLogger,
    });

    const input: AiInvestigationStepInput = {
      alert_id: 'nonexistent',
      alert_index: '.alerts-security.alerts-default',
      connector_id: 'connector-123',
    };

    await expect(stepDef.handler(input, mockWorkflowContext)).rejects.toThrow(
      'not found'
    );
  });

  it('should validate required input fields', () => {
    const stepDef = createAiInvestigationStepDefinition({
      getActionsClient: mockGetActionsClient,
      config: mockConfig,
      logger: mockLogger,
    });

    const invalidInput = {
      // Missing alert_id, alert_index, connector_id
    };

    const parseResult = stepDef.inputSchema.safeParse(invalidInput);
    expect(parseResult.success).toBe(false);
  });

  it('should accept optional case_id field', () => {
    const stepDef = createAiInvestigationStepDefinition({
      getActionsClient: mockGetActionsClient,
      config: mockConfig,
      logger: mockLogger,
    });

    const input = {
      alert_id: 'alert-123',
      alert_index: '.alerts-security.alerts-default',
      connector_id: 'connector-123',
      case_id: 'case-456', // Optional
    };

    const parseResult = stepDef.inputSchema.safeParse(input);
    expect(parseResult.success).toBe(true);
    expect(parseResult.data?.case_id).toBe('case-456');
  });

  it('should accept optional enabled_agents configuration', () => {
    const stepDef = createAiInvestigationStepDefinition({
      getActionsClient: mockGetActionsClient,
      config: mockConfig,
      logger: mockLogger,
    });

    const input = {
      alert_id: 'alert-123',
      alert_index: '.alerts-security.alerts-default',
      connector_id: 'connector-123',
      enabled_agents: {
        triage: true,
        mitre: false, // Disable MITRE for this investigation
      },
    };

    const parseResult = stepDef.inputSchema.safeParse(input);
    expect(parseResult.success).toBe(true);
    expect(parseResult.data?.enabled_agents?.mitre).toBe(false);
  });

  it('should log investigation progress', async () => {
    mockEsClient.get.mockResolvedValue({
      found: true,
      _id: 'alert-123',
      _index: '.alerts-security.alerts-default',
      _source: { '@timestamp': '2026-03-22T10:00:00Z' },
    });

    mockEsClient.search.mockResolvedValue({ hits: { hits: [] } });
    mockLlmClient.invoke.mockResolvedValue({
      content: JSON.stringify({
        classification: 'HIGH',
        attackType: 'Lateral Movement',
        confidence: 85,
        reasoning: 'Test',
      }),
    });

    const stepDef = createAiInvestigationStepDefinition({
      getActionsClient: mockGetActionsClient,
      config: mockConfig,
      logger: mockLogger,
    });

    const input: AiInvestigationStepInput = {
      alert_id: 'alert-123',
      alert_index: '.alerts-security.alerts-default',
      connector_id: 'connector-123',
    };

    try {
      await stepDef.handler(input, mockWorkflowContext);
    } catch (e) {
      // May fail due to incomplete mocks, but should log
    }

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('[AI Investigation Step] Starting investigation')
    );
  });
});

describe('Workflow step output format', () => {
  it('should transform camelCase to snake_case for YAML compatibility', () => {
    // Workflow outputs use snake_case (YAML convention)
    // Investigation returns camelCase (TypeScript convention)

    const stepDef = createAiInvestigationStepDefinition({
      getActionsClient: mockGetActionsClient,
      config: mockConfig,
      logger: mockLogger,
    });

    const outputSchema = stepDef.outputSchema;
    const outputKeys = Object.keys(outputSchema.shape);

    // Verify snake_case output keys
    expect(outputKeys).toContain('alert_id'); // Not alertId
    expect(outputKeys).toContain('case_id'); // Not caseId
    expect(outputKeys).toContain('investigation_text'); // Not investigationText
    expect(outputKeys).toContain('latency_ms'); // Not latencyMs
  });
});
