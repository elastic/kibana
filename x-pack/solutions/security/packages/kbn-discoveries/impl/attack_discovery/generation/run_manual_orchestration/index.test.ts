/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';

import { runManualOrchestration } from '.';
import { PipelineStepError } from './helpers/pipeline_step_error';

const mockRunRetrievalStep = jest.fn();
const mockRunGatePhase = jest.fn();
const mockRunGenerationStep = jest.fn();
const mockRunValidationStep = jest.fn();
const mockInvokeSkillReportWorkflow = jest.fn();
const mockHandleNoAlerts = jest.fn();

jest.mock('./steps/retrieval_step', () => ({
  runRetrievalStep: (...args: unknown[]) => mockRunRetrievalStep(...args),
}));

jest.mock('../run_gate_phase', () => ({
  runGatePhase: (...args: unknown[]) => mockRunGatePhase(...args),
}));

jest.mock('./steps/generation_step', () => ({
  runGenerationStep: (...args: unknown[]) => mockRunGenerationStep(...args),
}));

jest.mock('./steps/validation_step', () => ({
  runValidationStep: (...args: unknown[]) => mockRunValidationStep(...args),
}));

jest.mock('../invoke_skill_report_workflow', () => ({
  invokeSkillReportWorkflow: (...args: unknown[]) => mockInvokeSkillReportWorkflow(...args),
}));

jest.mock('./helpers/handle_no_alerts', () => ({
  handleNoAlerts: (...args: unknown[]) => mockHandleNoAlerts(...args),
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
    alert_retrieval_mode: 'custom_query' as const,
    alert_retrieval_workflow_ids: [],
    alert_retrieval_workflows_enabled: false,
    default_retrieval_enabled: true,
    skill_enabled: true,
    validation_workflow_id: 'default',
  },
  workflowsManagementApi: {} as never,
};

describe('runManualOrchestration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockRunRetrievalStep.mockResolvedValue(mockAlertRetrievalResult);
    // Default gate behavior: pass the candidate set through unchanged.
    mockRunGatePhase.mockImplementation(async ({ candidateResult }) => candidateResult);
    mockRunGenerationStep.mockResolvedValue(mockGenerationResult);
    mockRunValidationStep.mockResolvedValue(mockValidationOutcome);
    mockInvokeSkillReportWorkflow.mockResolvedValue(undefined);
    mockHandleNoAlerts.mockImplementation(async ({ alertRetrievalResult }) => ({
      alertRetrievalResult,
      outcome: 'no_alerts',
    }));
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

  it('throws when the validation step throws', async () => {
    mockRunValidationStep.mockRejectedValue(new Error('validation boom'));

    await expect(runManualOrchestration(baseParams)).rejects.toThrow('validation boom');
  });

  describe('skill report resume (Phase-2 / Mode B)', () => {
    const gateResultWithConversation = {
      ...mockAlertRetrievalResult,
      conversationId: 'conversation-123',
      workflowId: 'skill',
    };

    it('resumes the skill conversation when the gate produced a conversation id', async () => {
      mockRunGatePhase.mockResolvedValue(gateResultWithConversation);

      await runManualOrchestration(baseParams);

      expect(mockInvokeSkillReportWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conversation-123',
          executionUuid: 'test-execution-uuid',
        })
      );
    });

    it('forwards the selected connector id to the report workflow (Constraint A)', async () => {
      mockRunGatePhase.mockResolvedValue(gateResultWithConversation);

      await runManualOrchestration(baseParams);

      expect(mockInvokeSkillReportWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'test-connector-id',
        })
      );
    });

    it('resumes the skill conversation with the gate conversation id for the schedule trigger', async () => {
      mockRunGatePhase.mockResolvedValue(gateResultWithConversation);

      await runManualOrchestration({ ...baseParams, trigger: 'schedule' });

      expect(mockInvokeSkillReportWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conversation-123',
          executionUuid: 'test-execution-uuid',
        })
      );
    });

    it('does not resume when the gate produced no conversation id', async () => {
      await runManualOrchestration(baseParams);

      expect(mockInvokeSkillReportWorkflow).not.toHaveBeenCalled();
    });

    it('still returns the validation outcome when the report resume throws', async () => {
      mockRunGatePhase.mockResolvedValue(gateResultWithConversation);
      mockInvokeSkillReportWorkflow.mockRejectedValue(new Error('report boom'));

      const result = await runManualOrchestration(baseParams);

      expect(result).toEqual(mockValidationOutcome);
    });

    it('does not resume when the generation step throws', async () => {
      mockRunGatePhase.mockResolvedValue(gateResultWithConversation);
      mockRunGenerationStep.mockRejectedValue(new Error('generation boom'));

      await expect(runManualOrchestration(baseParams)).rejects.toThrow('generation boom');

      expect(mockInvokeSkillReportWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('always-on gate', () => {
    it('runs the gate for a non-agent_builder trigger (undefined)', async () => {
      await runManualOrchestration(baseParams);

      expect(mockRunGatePhase).toHaveBeenCalledWith(
        expect.objectContaining({
          candidateResult: mockAlertRetrievalResult,
          skillEnabled: true,
        })
      );
    });

    it('skips the gate for the agent_builder trigger', async () => {
      await runManualOrchestration({ ...baseParams, trigger: 'agent_builder' });

      expect(mockRunGatePhase).not.toHaveBeenCalled();
    });

    it('forwards the post-gate result to the generation step', async () => {
      const postGateResult = {
        ...mockAlertRetrievalResult,
        alerts: ['kept-alert'],
        alertsContextCount: 1,
      };
      mockRunGatePhase.mockResolvedValue(postGateResult);

      await runManualOrchestration(baseParams);

      expect(mockRunGenerationStep).toHaveBeenCalledWith(
        expect.objectContaining({
          alertRetrievalResult: postGateResult,
        })
      );
    });

    it('fails closed and skips generation when the gate throws', async () => {
      mockRunGatePhase.mockRejectedValue(new Error('gate boom'));

      await expect(runManualOrchestration(baseParams)).rejects.toThrow('gate boom');

      expect(mockRunGenerationStep).not.toHaveBeenCalled();
      expect(mockRunValidationStep).not.toHaveBeenCalled();
    });
  });

  describe('zero-alert guard', () => {
    const zeroAlertResult = {
      ...mockAlertRetrievalResult,
      alerts: [],
      alertsContextCount: 0,
    };

    // The fail-closed guard only fires when the skill's additional retrieval was
    // the sole source (skill enabled + zero deterministic candidates). These
    // tests cover the legitimate no-alerts short-circuit, so the skill toggle is
    // off — a clean "no data in range" outcome rather than a gate silent-miss.
    const noAlertsParams = {
      ...baseParams,
      workflowConfig: { ...baseParams.workflowConfig, skill_enabled: false },
    };

    beforeEach(() => {
      mockRunRetrievalStep.mockResolvedValue(zeroAlertResult);
    });

    it('does not call runGenerationStep when retrieval returns zero alerts', async () => {
      await runManualOrchestration(noAlertsParams);

      expect(mockRunGenerationStep).not.toHaveBeenCalled();
    });

    it('does not call runValidationStep when retrieval returns zero alerts', async () => {
      await runManualOrchestration(noAlertsParams);

      expect(mockRunValidationStep).not.toHaveBeenCalled();
    });

    it('delegates to handleNoAlerts with the retrieval result', async () => {
      await runManualOrchestration(noAlertsParams);

      expect(mockHandleNoAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          alertRetrievalResult: zeroAlertResult,
          generationWorkflowId: 'generation',
        })
      );
    });

    it('returns the no_alerts outcome', async () => {
      const result = await runManualOrchestration(noAlertsParams);

      expect(result).toEqual(
        expect.objectContaining({
          alertRetrievalResult: zeroAlertResult,
          outcome: 'no_alerts',
        })
      );
    });

    it('does not resume the skill report workflow when there are zero alerts', async () => {
      mockRunRetrievalStep.mockResolvedValue({
        ...zeroAlertResult,
        conversationId: 'conversation-123',
      });

      await runManualOrchestration(noAlertsParams);

      expect(mockInvokeSkillReportWorkflow).not.toHaveBeenCalled();
    });

    it('logs a succeeded summary with zero alerts and zero discoveries', async () => {
      await runManualOrchestration(noAlertsParams);

      expect(noAlertsParams.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Orchestration summary [succeeded]')
      );
      expect(noAlertsParams.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('alerts: 0, discoveries: 0')
      );
    });

    it('takes the no-alerts path (not the fail-closed guard) when the gate drops all candidates it was given', async () => {
      // Deterministic retrieval produced candidates, but the gate kept none.
      // The skill's additional retrieval was NOT the sole source, so this is a
      // legitimate "all candidates filtered" no-alerts outcome, not a silent miss.
      mockRunRetrievalStep.mockResolvedValue(mockAlertRetrievalResult);
      mockRunGatePhase.mockResolvedValue(zeroAlertResult);

      const result = await runManualOrchestration(baseParams);

      expect(result).toEqual(
        expect.objectContaining({
          outcome: 'no_alerts',
        })
      );
      expect(mockRunGenerationStep).not.toHaveBeenCalled();
    });
  });

  describe('fail-closed gate guard (skill sole-source returns zero)', () => {
    const zeroAlertResult = {
      ...mockAlertRetrievalResult,
      alerts: [],
      alertsContextCount: 0,
    };

    beforeEach(() => {
      // Skill additional retrieval is the SOLE source: no deterministic
      // candidates, and the gate adds nothing.
      mockRunRetrievalStep.mockResolvedValue(zeroAlertResult);
      mockRunGatePhase.mockResolvedValue(zeroAlertResult);
    });

    it('throws instead of returning a silent no_alerts outcome', async () => {
      await expect(runManualOrchestration(baseParams)).rejects.toThrow(
        /No alerts were available to analyze for the selected time range/i
      );
    });

    it('does not delegate to handleNoAlerts', async () => {
      await expect(runManualOrchestration(baseParams)).rejects.toThrow();

      expect(mockHandleNoAlerts).not.toHaveBeenCalled();
    });

    it('does not call runGenerationStep or runValidationStep', async () => {
      await expect(runManualOrchestration(baseParams)).rejects.toThrow();

      expect(mockRunGenerationStep).not.toHaveBeenCalled();
      expect(mockRunValidationStep).not.toHaveBeenCalled();
    });

    it('attributes the failure to the retrieval step', async () => {
      await expect(runManualOrchestration(baseParams)).rejects.toThrow();

      expect(baseParams.logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Orchestration summary [failed]')
      );
    });

    it('does not fire when the skill toggle is off (genuine no-alerts)', async () => {
      const result = await runManualOrchestration({
        ...baseParams,
        workflowConfig: { ...baseParams.workflowConfig, skill_enabled: false },
      });

      expect(result).toEqual(expect.objectContaining({ outcome: 'no_alerts' }));
    });
  });

  describe('pre-provided alerts', () => {
    const providedParams = {
      ...baseParams,
      alerts: ['alert-A', 'alert-B'],
    };

    it('skips runRetrievalStep when alerts are pre-provided (non-empty)', async () => {
      await runManualOrchestration(providedParams);

      expect(mockRunRetrievalStep).not.toHaveBeenCalled();
    });

    it('passes a synthetic AlertRetrievalResult to runGenerationStep when alerts are pre-provided', async () => {
      // The gate is skipped for pre-provided alerts in practice (agent_builder),
      // but here the default pass-through gate preserves the synthetic result.
      await runManualOrchestration({ ...providedParams, trigger: 'agent_builder' });

      expect(mockRunGenerationStep).toHaveBeenCalledWith(
        expect.objectContaining({
          alertRetrievalResult: expect.objectContaining({
            alerts: ['alert-A', 'alert-B'],
            alertsContextCount: 2,
            workflowId: 'provided',
          }),
        })
      );
    });

    it('still calls runRetrievalStep when pre-provided alerts is empty', async () => {
      await runManualOrchestration({
        ...providedParams,
        alerts: [],
      });

      expect(mockRunRetrievalStep).toHaveBeenCalled();
    });

    it('still calls runRetrievalStep when alerts is undefined', async () => {
      const { alerts: _alerts, ...paramsWithoutAlerts } = providedParams;

      await runManualOrchestration(paramsWithoutAlerts);

      expect(mockRunRetrievalStep).toHaveBeenCalled();
    });
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

    it('logs a failed summary when validation throws', async () => {
      mockRunValidationStep.mockRejectedValue(new Error('validation boom'));

      await expect(runManualOrchestration(baseParams)).rejects.toThrow('validation boom');

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

  describe('step failure telemetry', () => {
    const createAnalytics = (): AnalyticsServiceSetup =>
      ({ reportEvent: jest.fn() } as unknown as AnalyticsServiceSetup);

    it('reports the resolved default validation workflow id when validation_workflow_id is the empty-string sentinel', async () => {
      const analytics = createAnalytics();
      mockRunValidationStep.mockRejectedValue(new Error('validation boom'));

      await expect(
        runManualOrchestration({
          ...baseParams,
          analytics,
          workflowConfig: { ...baseParams.workflowConfig, validation_workflow_id: '' },
        })
      ).rejects.toThrow('validation boom');

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        'attack_discovery_step_failure',
        expect.objectContaining({
          step: 'validation',
          workflow_id: 'validate',
        })
      );
    });

    it('reports the custom validation workflow id when one is configured', async () => {
      const analytics = createAnalytics();
      mockRunValidationStep.mockRejectedValue(new Error('validation boom'));

      await expect(
        runManualOrchestration({
          ...baseParams,
          analytics,
          workflowConfig: {
            ...baseParams.workflowConfig,
            validation_workflow_id: 'custom-validate',
          },
        })
      ).rejects.toThrow('validation boom');

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        'attack_discovery_step_failure',
        expect.objectContaining({
          step: 'validation',
          workflow_id: 'custom-validate',
        })
      );
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

    it('uses a default pipeline timeout of 30 minutes (ADR-008)', async () => {
      mockRunRetrievalStep.mockImplementation(async () => {
        jest.advanceTimersByTime(31 * 60 * 1000);
        return mockAlertRetrievalResult;
      });

      await expect(runManualOrchestration(baseParams)).rejects.toThrow(PipelineStepError);

      expect(mockRunGenerationStep).not.toHaveBeenCalled();
    });

    it('does not exceed the budget after 11 minutes of retrieval under the default timeout', async () => {
      mockRunRetrievalStep.mockImplementation(async () => {
        jest.advanceTimersByTime(11 * 60 * 1000);
        return mockAlertRetrievalResult;
      });

      await runManualOrchestration(baseParams);

      expect(mockRunGenerationStep).toHaveBeenCalled();
    });

    it('passes the remaining pipeline budget as maxWaitMs to the retrieval step', async () => {
      await runManualOrchestration({ ...baseParams, pipelineTimeoutMs: 15 * 60 * 1000 });

      expect(mockRunRetrievalStep).toHaveBeenCalledWith(
        expect.objectContaining({
          maxWaitMs: 15 * 60 * 1000,
        })
      );
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

    it('reports a sane telemetry duration when the budget is exceeded before the generation step', async () => {
      const analytics = { reportEvent: jest.fn() } as unknown as AnalyticsServiceSetup;

      mockRunRetrievalStep.mockImplementation(async () => {
        jest.advanceTimersByTime(11 * 60 * 1000);
        return mockAlertRetrievalResult;
      });

      await expect(
        runManualOrchestration({ ...baseParams, analytics, pipelineTimeoutMs: 10 * 60 * 1000 })
      ).rejects.toThrow(PipelineStepError);

      const failureCall = (analytics.reportEvent as jest.Mock).mock.calls.find(
        ([eventType]: [string]) => eventType === 'attack_discovery_step_failure'
      );

      // Regression guard: before the fix, `generationStart` was still 0 when the
      // budget check threw, so the reported duration was ~1.7e12ms (Date.now()).
      expect(failureCall?.[1].duration_ms).toBeLessThanOrEqual(11 * 60 * 1000);
    });

    it('reports a sane telemetry duration when the budget is exceeded before the validation step', async () => {
      const analytics = { reportEvent: jest.fn() } as unknown as AnalyticsServiceSetup;

      mockRunRetrievalStep.mockImplementation(async () => {
        jest.advanceTimersByTime(3 * 60 * 1000);
        return mockAlertRetrievalResult;
      });

      mockRunGenerationStep.mockImplementation(async () => {
        jest.advanceTimersByTime(8 * 60 * 1000);
        return mockGenerationResult;
      });

      await expect(
        runManualOrchestration({ ...baseParams, analytics, pipelineTimeoutMs: 10 * 60 * 1000 })
      ).rejects.toThrow(PipelineStepError);

      const failureCall = (analytics.reportEvent as jest.Mock).mock.calls.find(
        ([eventType]: [string]) => eventType === 'attack_discovery_step_failure'
      );

      // Regression guard: before the fix, `validationStart` was still 0 when the
      // budget check threw, so the reported duration was ~1.7e12ms (Date.now()).
      expect(failureCall?.[1].duration_ms).toBeLessThanOrEqual(11 * 60 * 1000);
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
