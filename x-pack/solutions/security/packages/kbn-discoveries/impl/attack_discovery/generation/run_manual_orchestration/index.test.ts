/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';

import { runManualOrchestration } from '.';
import { PipelineStepError } from './helpers/pipeline_step_error';

const mockRunRetrievalStep = jest.fn();
const mockRunGenerationStep = jest.fn();
const mockRunValidationStep = jest.fn();

jest.mock('./steps/retrieval_step', () => ({
  runRetrievalStep: (...args: unknown[]) => mockRunRetrievalStep(...args),
}));

jest.mock('./steps/generation_step', () => ({
  runGenerationStep: (...args: unknown[]) => mockRunGenerationStep(...args),
}));

jest.mock('./steps/validation_step', () => ({
  runValidationStep: (...args: unknown[]) => mockRunValidationStep(...args),
}));

const mockAnonymizationFields: AnonymizationFieldResponse[] = [
  {
    allowed: true,
    anonymized: false,
    field: 'host.name',
    id: 'field-1',
  },
  {
    allowed: true,
    anonymized: true,
    field: 'user.name',
    id: 'field-2',
  },
];

const mockAlertRetrievalResult = {
  alerts: ['alert-1'],
  alertsContextCount: 1,
  anonymizedAlerts: [],
  apiConfig: {
    action_type_id: '.gen-ai',
    connector_id: 'test-connector-id',
    model: 'gpt-4',
  },
  connectorName: 'Test Connector',
  replacements: {},
  workflowExecutions: [],
  workflowId: 'legacy',
  workflowRunId: 'legacy-run',
};

const mockGenerationResult = {
  alertsContextCount: 1,
  attackDiscoveries: [{ title: 'Discovery 1' }],
  executionUuid: 'test-execution-uuid',
  replacements: {},
  workflowId: 'generation',
  workflowRunId: 'generation-run',
};

const mockValidationOutcome = {
  alertRetrievalResult: mockAlertRetrievalResult,
  generationResult: mockGenerationResult,
  outcome: 'validation_succeeded' as const,
  validationResult: {
    duplicatesDroppedCount: 0,
    generatedCount: 1,
    success: true,
    validationSummary: {
      generatedCount: 1,
      persistedCount: 1,
    },
    workflowId: 'validate',
    workflowRunId: 'validate-run',
  },
};

const baseParams = {
  alertsIndexPattern: '.alerts',
  anonymizationFields: mockAnonymizationFields,
  apiConfig: {
    action_type_id: '.gen-ai',
    connector_id: 'test-connector-id',
    model: 'gpt-4',
  },
  authenticatedUser: {} as never,
  basePath: '',
  defaultWorkflowIds: {
    default_alert_retrieval: 'legacy',
    generation: 'generation',
    validate: 'validate',
  },
  eventLogger: {} as never,
  eventLogIndex: '.kibana-event-log-test',
  executionUuid: 'test-execution-uuid',
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger,
  request: {} as never,
  spaceId: 'default',
  start: 'now',
  workflowConfig: {
    alert_retrieval_workflow_ids: [],
    default_alert_retrieval_mode: 'custom_query' as const,
    validation_workflow_id: 'default',
  },
  workflowsManagementApi: {} as never,
};

describe('runManualOrchestration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockRunRetrievalStep.mockResolvedValue(mockAlertRetrievalResult);
    mockRunGenerationStep.mockResolvedValue(mockGenerationResult);
    mockRunValidationStep.mockResolvedValue(mockValidationOutcome);
  });

  it('calls runRetrievalStep with the correct params', async () => {
    await runManualOrchestration(baseParams);

    expect(mockRunRetrievalStep).toHaveBeenCalledWith(
      expect.objectContaining({
        alertsIndexPattern: '.alerts',
        anonymizationFields: mockAnonymizationFields,
        defaultAlertRetrievalWorkflowId: 'legacy',
      })
    );
  });

  it('calls runGenerationStep with the retrieval result', async () => {
    await runManualOrchestration(baseParams);

    expect(mockRunGenerationStep).toHaveBeenCalledWith(
      expect.objectContaining({
        alertRetrievalResult: mockAlertRetrievalResult,
        generationWorkflowId: 'generation',
      })
    );
  });

  it('calls runValidationStep with both retrieval and generation results', async () => {
    await runManualOrchestration(baseParams);

    expect(mockRunValidationStep).toHaveBeenCalledWith(
      expect.objectContaining({
        alertRetrievalResult: mockAlertRetrievalResult,
        defaultValidationWorkflowId: 'validate',
        generationResult: mockGenerationResult,
      })
    );
  });

  it('returns the validation step outcome', async () => {
    const result = await runManualOrchestration(baseParams);

    expect(result).toEqual(mockValidationOutcome);
  });

  it('passes persist to the validation step', async () => {
    await runManualOrchestration({ ...baseParams, persist: false });

    expect(mockRunValidationStep).toHaveBeenCalledWith(
      expect.objectContaining({
        persist: false,
      })
    );
  });

  it('throws when the retrieval step throws', async () => {
    mockRunRetrievalStep.mockRejectedValue(new Error('retrieval boom'));

    await expect(runManualOrchestration(baseParams)).rejects.toThrow('retrieval boom');

    expect(mockRunGenerationStep).not.toHaveBeenCalled();
    expect(mockRunValidationStep).not.toHaveBeenCalled();
  });

  it('throws when the generation step throws', async () => {
    mockRunGenerationStep.mockRejectedValue(new Error('generation boom'));

    await expect(runManualOrchestration(baseParams)).rejects.toThrow('generation boom');

    expect(mockRunValidationStep).not.toHaveBeenCalled();
  });

  it('returns validation_failed when validation step returns failure', async () => {
    mockRunValidationStep.mockResolvedValue({ outcome: 'validation_failed' });

    const result = await runManualOrchestration(baseParams);

    expect(result).toEqual({ outcome: 'validation_failed' });
  });

  describe('execution summary logging', () => {
    it('logs an INFO summary after successful orchestration', async () => {
      await runManualOrchestration(baseParams);

      expect(baseParams.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Orchestration summary [succeeded]')
      );
    });

    it('includes workflow links in the summary', async () => {
      await runManualOrchestration(baseParams);

      const infoCall = (baseParams.logger.info as jest.Mock).mock.calls.find(
        ([msg]: [string]) => typeof msg === 'string' && msg.includes('Orchestration summary')
      );

      expect(infoCall).toBeDefined();
      expect(infoCall[0]).toContain('/app/workflows/generation');
      expect(infoCall[0]).toContain('/app/workflows/validate');
    });

    it('logs a failed summary when retrieval throws', async () => {
      mockRunRetrievalStep.mockRejectedValue(new Error('retrieval boom'));

      await expect(runManualOrchestration(baseParams)).rejects.toThrow('retrieval boom');

      expect(baseParams.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Orchestration summary [failed]')
      );
      expect(baseParams.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('retrieval boom')
      );
    });

    it('logs a failed summary when generation throws', async () => {
      mockRunGenerationStep.mockRejectedValue(new Error('generation boom'));

      await expect(runManualOrchestration(baseParams)).rejects.toThrow('generation boom');

      expect(baseParams.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Orchestration summary [failed]')
      );
      expect(baseParams.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('generation boom')
      );
    });

    it('logs a failed summary when validation returns validation_failed', async () => {
      mockRunValidationStep.mockResolvedValue({ outcome: 'validation_failed' });

      await runManualOrchestration(baseParams);

      expect(baseParams.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Orchestration summary [failed]')
      );
    });

    it('prepends basePath to workflow links', async () => {
      await runManualOrchestration({ ...baseParams, basePath: '/s/my-space' });

      const infoCall = (baseParams.logger.info as jest.Mock).mock.calls.find(
        ([msg]: [string]) => typeof msg === 'string' && msg.includes('Orchestration summary')
      );

      expect(infoCall).toBeDefined();
      expect(infoCall[0]).toContain('/s/my-space/app/workflows/');
    });
  });

  describe('pipeline timeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('throws PipelineStepError when budget is exceeded before generation step', async () => {
      mockRunRetrievalStep.mockImplementation(async () => {
        jest.advanceTimersByTime(11 * 60 * 1000);
        return mockAlertRetrievalResult;
      });

      await expect(
        runManualOrchestration({ ...baseParams, pipelineTimeoutMs: 10 * 60 * 1000 })
      ).rejects.toThrow(PipelineStepError);

      expect(mockRunGenerationStep).not.toHaveBeenCalled();
      expect(mockRunValidationStep).not.toHaveBeenCalled();
    });

    it('throws PipelineStepError when budget is exceeded before validation step', async () => {
      mockRunRetrievalStep.mockImplementation(async () => {
        jest.advanceTimersByTime(3 * 60 * 1000);
        return mockAlertRetrievalResult;
      });

      mockRunGenerationStep.mockImplementation(async () => {
        jest.advanceTimersByTime(8 * 60 * 1000);
        return mockGenerationResult;
      });

      await expect(
        runManualOrchestration({ ...baseParams, pipelineTimeoutMs: 10 * 60 * 1000 })
      ).rejects.toThrow(PipelineStepError);

      expect(mockRunValidationStep).not.toHaveBeenCalled();
    });

    it('passes remaining pipeline budget as maxWaitMs to the generation step', async () => {
      mockRunRetrievalStep.mockImplementation(async () => {
        jest.advanceTimersByTime(2 * 60 * 1000);
        return mockAlertRetrievalResult;
      });

      await runManualOrchestration({ ...baseParams, pipelineTimeoutMs: 10 * 60 * 1000 });

      expect(mockRunGenerationStep).toHaveBeenCalledWith(
        expect.objectContaining({
          maxWaitMs: 8 * 60 * 1000,
        })
      );
    });

    it('passes remaining pipeline budget as maxWaitMs to the validation step', async () => {
      mockRunRetrievalStep.mockImplementation(async () => {
        jest.advanceTimersByTime(2 * 60 * 1000);
        return mockAlertRetrievalResult;
      });

      mockRunGenerationStep.mockImplementation(async () => {
        jest.advanceTimersByTime(5 * 60 * 1000);
        return mockGenerationResult;
      });

      await runManualOrchestration({ ...baseParams, pipelineTimeoutMs: 10 * 60 * 1000 });

      expect(mockRunValidationStep).toHaveBeenCalledWith(
        expect.objectContaining({
          maxWaitMs: 3 * 60 * 1000,
        })
      );
    });

    it('uses a default pipeline timeout of 10 minutes', async () => {
      mockRunRetrievalStep.mockImplementation(async () => {
        jest.advanceTimersByTime(11 * 60 * 1000);
        return mockAlertRetrievalResult;
      });

      await expect(runManualOrchestration(baseParams)).rejects.toThrow(PipelineStepError);

      expect(mockRunGenerationStep).not.toHaveBeenCalled();
    });

    it('includes the pipeline timeout in the error message', async () => {
      mockRunRetrievalStep.mockImplementation(async () => {
        jest.advanceTimersByTime(11 * 60 * 1000);
        return mockAlertRetrievalResult;
      });

      await expect(
        runManualOrchestration({ ...baseParams, pipelineTimeoutMs: 10 * 60 * 1000 })
      ).rejects.toThrow(/pipeline.*budget.*exceeded/i);
    });

    it('succeeds when all steps complete within the pipeline budget', async () => {
      mockRunRetrievalStep.mockImplementation(async () => {
        jest.advanceTimersByTime(1 * 60 * 1000);
        return mockAlertRetrievalResult;
      });

      mockRunGenerationStep.mockImplementation(async () => {
        jest.advanceTimersByTime(3 * 60 * 1000);
        return mockGenerationResult;
      });

      mockRunValidationStep.mockImplementation(async () => {
        jest.advanceTimersByTime(1 * 60 * 1000);
        return mockValidationOutcome;
      });

      const result = await runManualOrchestration({
        ...baseParams,
        pipelineTimeoutMs: 10 * 60 * 1000,
      });

      expect(result).toEqual(mockValidationOutcome);
    });
  });
});
