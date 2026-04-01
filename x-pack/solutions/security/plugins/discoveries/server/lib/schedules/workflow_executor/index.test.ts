/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { RuleExecutorOptions } from '@kbn/alerting-plugin/server';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';

import { workflowExecutor, type WorkflowExecutorDeps } from '.';
import { executeGenerationWorkflow } from '../../../routes/generate/helpers';

const mockGenerateHash = jest.fn().mockReturnValue('mock-alert-hash');
const mockTransformToBaseAlertDocument = jest.fn().mockReturnValue({
  'kibana.alert.url': 'https://localhost:5601/app/security/attack_discovery/mock-doc-id',
});
const mockGetMarkdownFields = jest.fn().mockReturnValue({
  detailsMarkdown: 'mock details',
  entitySummaryMarkdown: 'mock entity',
  summaryMarkdown: 'mock summary',
  title: 'mock title',
});

const mockUpdateAlertsWithAttackIds = jest.fn().mockResolvedValue(undefined);

jest.mock('@kbn/attack-discovery-schedules-common', () => ({
  generateAttackDiscoveryAlertHash: (...args: unknown[]) => mockGenerateHash(...args),
  transformToBaseAlertDocument: (...args: unknown[]) => mockTransformToBaseAlertDocument(...args),
  updateAlertsWithAttackIds: (...args: unknown[]) => mockUpdateAlertsWithAttackIds(...args),
}));

jest.mock('@kbn/elastic-assistant-common', () => ({
  getAttackDiscoveryMarkdownFields: (...args: unknown[]) => mockGetMarkdownFields(...args),
}));

jest.mock('../../../routes/generate/helpers', () => ({
  executeGenerationWorkflow: jest.fn(),
}));

jest.mock('@kbn/task-manager-plugin/server', () => ({
  createTaskRunError: jest.fn((error, source) => ({ message: error.message, source })),
  TaskErrorSource: { USER: 'USER', FRAMEWORK: 'FRAMEWORK' },
}));

const mockAttackDiscovery = {
  alertIds: ['alert-1', 'alert-2'],
  detailsMarkdown: 'raw details',
  entitySummaryMarkdown: 'raw entity',
  mitreAttackTactics: ['Initial Access'],
  summaryMarkdown: 'raw summary',
  timestamp: '2026-02-24T00:00:00Z',
  title: 'raw title',
};

const mockAlertRetrievalResult = {
  alerts: ['alert-content-1'],
  alertsContextCount: 1,
  anonymizedAlerts: [{ id: 'anon-1', metadata: {}, page_content: 'alert content' }],
  apiConfig: { action_type_id: '.gen-ai', connector_id: 'test-connector', model: 'gpt-4' },
  connectorName: 'Test Connector',
  replacements: { 'uuid-1': 'original-value' },
  workflowExecutions: [],
  workflowId: 'wf-legacy',
  workflowRunId: 'run-legacy',
};

const mockGenerationResult = {
  alertsContextCount: 1,
  attackDiscoveries: [mockAttackDiscovery],
  executionUuid: 'exec-uuid',
  replacements: { 'uuid-1': 'original-value' },
  workflowExecution: { workflowId: 'wf-gen', workflowRunId: 'run-gen' },
  workflowId: 'wf-gen',
  workflowRunId: 'run-gen',
};

const mockValidationResult = {
  discoveryCount: 1,
  validatedDiscoveries: [mockAttackDiscovery],
  success: true,
  workflowId: 'wf-validate',
  workflowRunId: 'run-validate',
};

const mockSuccessOutcome = {
  alertRetrievalResult: mockAlertRetrievalResult,
  generationResult: mockGenerationResult,
  outcome: 'validation_succeeded',
  validationResult: mockValidationResult,
};

describe('workflowExecutor', () => {
  const mockLogger = loggerMock.create();
  const mockRequest = httpServerMock.createKibanaRequest();

  const ruleExecutorServices = alertsMock.createRuleExecutorServices();

  const spaceId = 'test-space';

  const params = {
    alertsIndexPattern: 'test-index-*',
    apiConfig: {
      connectorId: 'test-connector',
      actionTypeId: '.gen-ai',
      model: 'gpt-4',
      name: 'Test Connector',
    },
    combinedFilter: {
      bool: {
        must: [],
        filter: [{ exists: { field: '@timestamp' } }],
        should: [],
        must_not: [],
      },
    },
    end: 'now',
    query: 'host.name: *',
    size: 100,
    start: 'now-24h',
  };

  const executorOptions = {
    params,
    rule: {
      id: 'rule-1',
      schedule: { interval: '24h' },
      actions: [{ actionTypeId: '.slack' }],
    },
    services: ruleExecutorServices,
    spaceId,
    state: {},
  };

  const mockGetEventLogIndex = jest.fn().mockResolvedValue('.kibana-event-log-test');
  const mockGetEventLogger = jest.fn().mockResolvedValue({ logEvent: jest.fn() });
  const mockGetStartServices = jest.fn().mockResolvedValue({
    coreStart: {},
    pluginsStart: {},
  });
  const mockWorkflowInitService = {
    ensureWorkflowsForSpace: jest.fn().mockResolvedValue({
      default_alert_retrieval: 'wf-legacy',
      generation: 'wf-generation',
      validate: 'wf-validate',
    }),
    verifyAndRepairWorkflows: jest.fn(),
  };
  const mockWorkflowsManagementApi = {} as WorkflowExecutorDeps['workflowsManagementApi'];

  const deps: WorkflowExecutorDeps = {
    getEventLogIndex: mockGetEventLogIndex,
    getEventLogger: mockGetEventLogger,
    getStartServices: mockGetStartServices,
    logger: mockLogger,
    publicBaseUrl: 'https://localhost:5601',
    request: mockRequest,
    workflowInitService: mockWorkflowInitService,
    workflowsManagementApi: mockWorkflowsManagementApi,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (executeGenerationWorkflow as jest.Mock).mockResolvedValue(mockSuccessOutcome);

    (ruleExecutorServices.alertsClient.report as jest.Mock).mockReturnValue({
      uuid: 'mock-alert-doc-id',
    });
  });

  it('throws AlertsClientError when alertsClient is null', async () => {
    const options = {
      ...executorOptions,
      services: { ...ruleExecutorServices, alertsClient: null },
    } as unknown as RuleExecutorOptions;

    await expect(workflowExecutor({ deps, options })).rejects.toBeInstanceOf(AlertsClientError);
  });

  it('calls executeGenerationWorkflow with mapped params including persist: false', async () => {
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;

    await workflowExecutor({ deps, options });

    expect(executeGenerationWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        alertsIndexPattern: params.alertsIndexPattern,
        apiConfig: params.apiConfig,
        end: params.end,
        executionUuid: expect.any(String),
        filter: params.combinedFilter,
        getEventLogIndex: mockGetEventLogIndex,
        getEventLogger: mockGetEventLogger,
        getStartServices: mockGetStartServices,
        logger: expect.objectContaining({
          debug: expect.any(Function),
          error: expect.any(Function),
          fatal: expect.any(Function),
          get: expect.any(Function),
          info: expect.any(Function),
          isLevelEnabled: expect.any(Function),
          log: expect.any(Function),
          trace: expect.any(Function),
          warn: expect.any(Function),
        }),
        persist: false,
        request: mockRequest,
        size: params.size,
        start: params.start,
        type: 'attack_discovery',
        workflowConfig: {
          alert_retrieval_workflow_ids: [],
          default_alert_retrieval_mode: 'custom_query' as const,
          validation_workflow_id: 'default',
        },
        workflowInitService: mockWorkflowInitService,
        workflowsManagementApi: mockWorkflowsManagementApi,
      })
    );
  });

  it('passes scopedClusterClient.asCurrentUser as esClient to executeGenerationWorkflow', async () => {
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;

    await workflowExecutor({ deps, options });

    expect(executeGenerationWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        esClient: ruleExecutorServices.scopedClusterClient.asCurrentUser,
      })
    );
  });

  it('uses the alerting framework executionId as executionUuid for event log consistency', async () => {
    const frameworkExecutionId = 'alerting-framework-execution-id-123';
    const options = {
      ...executorOptions,
      executionId: frameworkExecutionId,
    } as unknown as RuleExecutorOptions;

    await workflowExecutor({ deps, options });

    expect(executeGenerationWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        executionUuid: frameworkExecutionId,
      })
    );
  });

  it('falls back to a generated UUID when executionId is not provided', async () => {
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;

    await workflowExecutor({ deps, options });
    await workflowExecutor({ deps, options });

    const firstUuid = (executeGenerationWorkflow as jest.Mock).mock.calls[0][0].executionUuid;
    const secondUuid = (executeGenerationWorkflow as jest.Mock).mock.calls[1][0].executionUuid;

    expect(firstUuid).not.toBe(secondUuid);
    expect(typeof firstUuid).toBe('string');
    expect(firstUuid.length).toBeGreaterThan(0);
  });

  it('returns state on success', async () => {
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;

    const result = await workflowExecutor({ deps, options });

    expect(result).toEqual({ state: {} });
  });

  it('logs a success message when the generation workflow completes', async () => {
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;

    await workflowExecutor({ deps, options });

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Workflow executor completed successfully')
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('outcome: validation_succeeded')
    );
  });

  it('throws a USER TaskRunError for 4xx errors', async () => {
    const userError = Object.assign(new Error('Bad request'), { statusCode: 400 });
    (executeGenerationWorkflow as jest.Mock).mockRejectedValueOnce(userError);
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;

    await expect(workflowExecutor({ deps, options })).rejects.toEqual(
      expect.objectContaining({ message: 'Bad request', source: TaskErrorSource.USER })
    );

    expect(createTaskRunError).toHaveBeenCalledWith(userError, TaskErrorSource.USER);
  });

  it('rethrows non-4xx errors without wrapping in TaskRunError', async () => {
    const serverError = new Error('Internal server error');
    (executeGenerationWorkflow as jest.Mock).mockRejectedValueOnce(serverError);
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;

    await expect(workflowExecutor({ deps, options })).rejects.toThrow('Internal server error');

    expect(createTaskRunError).not.toHaveBeenCalled();
  });

  it('logs an error when the generation workflow fails', async () => {
    (executeGenerationWorkflow as jest.Mock).mockRejectedValueOnce(
      new Error('Generation workflow failure')
    );
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;

    await expect(workflowExecutor({ deps, options })).rejects.toThrow();

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Generation workflow failure')
    );
  });

  it('passes undefined filter when combinedFilter is not provided', async () => {
    const options = {
      ...executorOptions,
      params: { ...params, combinedFilter: undefined },
    } as unknown as RuleExecutorOptions;

    await workflowExecutor({ deps, options });

    expect(executeGenerationWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: undefined,
      })
    );
  });

  it('passes optional end/start as undefined when not provided', async () => {
    const options = {
      ...executorOptions,
      params: { ...params, end: undefined, start: undefined },
    } as unknown as RuleExecutorOptions;

    await workflowExecutor({ deps, options });

    expect(executeGenerationWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        end: undefined,
        start: undefined,
      })
    );
  });

  it('throws a USER TaskRunError for non-Error 4xx throws', async () => {
    const errorString = 'string error with status 400';
    const errorObj = Object.assign(errorString, { statusCode: 400 });
    (executeGenerationWorkflow as jest.Mock).mockRejectedValueOnce(errorObj);
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;

    await expect(workflowExecutor({ deps, options })).rejects.toEqual(
      expect.objectContaining({ source: TaskErrorSource.USER })
    );

    expect(createTaskRunError).toHaveBeenCalledWith(expect.any(Error), TaskErrorSource.USER);
  });

  it('logs non-Error thrown values as strings', async () => {
    (executeGenerationWorkflow as jest.Mock).mockRejectedValueOnce('raw string error');
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;

    await expect(workflowExecutor({ deps, options })).rejects.toBe('raw string error');

    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('raw string error'));
  });

  it('passes workflowsManagementApi as undefined when not provided', async () => {
    const depsWithoutApi: WorkflowExecutorDeps = {
      ...deps,
      workflowsManagementApi: undefined,
    };
    const options = { ...executorOptions } as unknown as RuleExecutorOptions;

    await workflowExecutor({ deps: depsWithoutApi, options });

    expect(executeGenerationWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowsManagementApi: undefined,
      })
    );
  });

  describe('alertsClient reporting on validation_succeeded', () => {
    it('calls alertsClient.report() for each attack discovery', async () => {
      const options = { ...executorOptions } as unknown as RuleExecutorOptions;

      await workflowExecutor({ deps, options });

      expect(ruleExecutorServices.alertsClient.report).toHaveBeenCalledWith({
        actionGroup: 'default',
        id: 'mock-alert-hash',
      });
    });

    it('calls generateAttackDiscoveryAlertHash with correct params', async () => {
      const options = { ...executorOptions } as unknown as RuleExecutorOptions;

      await workflowExecutor({ deps, options });

      expect(mockGenerateHash).toHaveBeenCalledWith(
        expect.objectContaining({
          attackDiscovery: mockAttackDiscovery,
          computeSha256Hash: expect.any(Function),
          connectorId: 'test-connector',
          ownerId: 'rule-1',
          replacements: { 'uuid-1': 'original-value' },
          spaceId: 'test-space',
        })
      );
    });

    it('calls transformToBaseAlertDocument with mapped anonymizedAlerts', async () => {
      const options = { ...executorOptions } as unknown as RuleExecutorOptions;

      await workflowExecutor({ deps, options });

      expect(mockTransformToBaseAlertDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          alertDocId: 'mock-alert-doc-id',
          alertInstanceId: 'mock-alert-hash',
          alertsParams: expect.objectContaining({
            alertsContextCount: 1,
            anonymizedAlerts: [{ id: 'anon-1', metadata: {}, pageContent: 'alert content' }],
            connectorName: 'Test Connector',
            enableFieldRendering: true,
            replacements: { 'uuid-1': 'original-value' },
            withReplacements: false,
          }),
          attackDiscovery: mockAttackDiscovery,
          publicBaseUrl: 'https://localhost:5601',
          spaceId: 'test-space',
        })
      );
    });

    it('calls alertsClient.setAlertData() with payload and context', async () => {
      const options = { ...executorOptions } as unknown as RuleExecutorOptions;

      await workflowExecutor({ deps, options });

      expect(ruleExecutorServices.alertsClient.setAlertData).toHaveBeenCalledWith({
        context: {
          attack: {
            alertIds: ['alert-1', 'alert-2'],
            detailsMarkdown: 'mock details',
            detailsUrl: 'https://localhost:5601/app/security/attack_discovery/mock-doc-id',
            entitySummaryMarkdown: 'mock entity',
            mitreAttackTactics: ['Initial Access'],
            summaryMarkdown: 'mock summary',
            timestamp: '2026-02-24T00:00:00Z',
            title: 'mock title',
          },
        },
        id: 'mock-alert-hash',
        payload: {
          'kibana.alert.url': 'https://localhost:5601/app/security/attack_discovery/mock-doc-id',
        },
      });
    });

    it('calls getAttackDiscoveryMarkdownFields with discovery and replacements', async () => {
      const options = { ...executorOptions } as unknown as RuleExecutorOptions;

      await workflowExecutor({ deps, options });

      expect(mockGetMarkdownFields).toHaveBeenCalledWith({
        attackDiscovery: mockAttackDiscovery,
        replacements: { 'uuid-1': 'original-value' },
      });
    });

    it('does not call alertsClient.report() when outcome is validation_failed', async () => {
      (executeGenerationWorkflow as jest.Mock).mockResolvedValueOnce({
        outcome: 'validation_failed',
      });
      const options = { ...executorOptions } as unknown as RuleExecutorOptions;

      await workflowExecutor({ deps, options });

      expect(ruleExecutorServices.alertsClient.report).not.toHaveBeenCalled();
      expect(ruleExecutorServices.alertsClient.setAlertData).not.toHaveBeenCalled();
    });

    it('reports multiple discoveries in parallel', async () => {
      const secondDiscovery = {
        alertIds: ['alert-3'],
        detailsMarkdown: 'second details',
        entitySummaryMarkdown: 'second entity',
        mitreAttackTactics: ['Lateral Movement'],
        summaryMarkdown: 'second summary',
        timestamp: '2026-02-24T01:00:00Z',
        title: 'second title',
      };

      (executeGenerationWorkflow as jest.Mock).mockResolvedValueOnce({
        alertRetrievalResult: mockAlertRetrievalResult,
        generationResult: {
          ...mockGenerationResult,
          attackDiscoveries: [mockAttackDiscovery, secondDiscovery],
        },
        outcome: 'validation_succeeded',
        validationResult: mockValidationResult,
      });

      mockGenerateHash.mockReturnValueOnce('hash-1').mockReturnValueOnce('hash-2');

      (ruleExecutorServices.alertsClient.report as jest.Mock)
        .mockReturnValueOnce({ uuid: 'doc-id-1' })
        .mockReturnValueOnce({ uuid: 'doc-id-2' });

      const options = { ...executorOptions } as unknown as RuleExecutorOptions;

      await workflowExecutor({ deps, options });

      expect(ruleExecutorServices.alertsClient.report).toHaveBeenCalledTimes(2);
      expect(ruleExecutorServices.alertsClient.setAlertData).toHaveBeenCalledTimes(2);
    });

    it('logs the count of reported discoveries', async () => {
      const options = { ...executorOptions } as unknown as RuleExecutorOptions;

      await workflowExecutor({ deps, options });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Reported 1 attack discoveries to alertsClient')
      );
    });

    it('calls updateAlertsWithAttackIds with correct alertIdToAttackIdsMap', async () => {
      const options = { ...executorOptions } as unknown as RuleExecutorOptions;

      await workflowExecutor({ deps, options });

      expect(mockUpdateAlertsWithAttackIds).toHaveBeenCalledWith({
        alertIdToAttackIdsMap: {
          'alert-1': ['mock-alert-doc-id'],
          'alert-2': ['mock-alert-doc-id'],
        },
        esClient: ruleExecutorServices.scopedClusterClient.asCurrentUser,
        spaceId: 'test-space',
      });
    });

    it('builds alertIdToAttackIds mapping across multiple discoveries', async () => {
      const secondDiscovery = {
        alertIds: ['alert-2', 'alert-3'],
        detailsMarkdown: 'second details',
        entitySummaryMarkdown: 'second entity',
        mitreAttackTactics: ['Lateral Movement'],
        summaryMarkdown: 'second summary',
        timestamp: '2026-02-24T01:00:00Z',
        title: 'second title',
      };

      (executeGenerationWorkflow as jest.Mock).mockResolvedValueOnce({
        alertRetrievalResult: mockAlertRetrievalResult,
        generationResult: {
          ...mockGenerationResult,
          attackDiscoveries: [mockAttackDiscovery, secondDiscovery],
        },
        outcome: 'validation_succeeded',
        validationResult: mockValidationResult,
      });

      mockGenerateHash.mockReturnValueOnce('hash-1').mockReturnValueOnce('hash-2');

      (ruleExecutorServices.alertsClient.report as jest.Mock)
        .mockReturnValueOnce({ uuid: 'doc-id-1' })
        .mockReturnValueOnce({ uuid: 'doc-id-2' });

      const options = { ...executorOptions } as unknown as RuleExecutorOptions;

      await workflowExecutor({ deps, options });

      expect(mockUpdateAlertsWithAttackIds).toHaveBeenCalledWith(
        expect.objectContaining({
          alertIdToAttackIdsMap: {
            'alert-1': ['doc-id-1'],
            'alert-2': ['doc-id-1', 'doc-id-2'],
            'alert-3': ['doc-id-2'],
          },
        })
      );
    });

    it('does not call updateAlertsWithAttackIds when outcome is validation_failed', async () => {
      (executeGenerationWorkflow as jest.Mock).mockResolvedValueOnce({
        outcome: 'validation_failed',
      });

      const options = { ...executorOptions } as unknown as RuleExecutorOptions;

      await workflowExecutor({ deps, options });

      expect(mockUpdateAlertsWithAttackIds).not.toHaveBeenCalled();
    });

    it('normalizes snake_case attack discoveries from workflow output', async () => {
      const snakeCaseDiscovery = {
        alert_ids: ['alert-1', 'alert-2'],
        details_markdown: 'snake details',
        entity_summary_markdown: 'snake entity',
        mitre_attack_tactics: ['Initial Access'],
        summary_markdown: 'snake summary',
        timestamp: '2026-02-24T00:00:00Z',
        title: 'snake title',
      };

      (executeGenerationWorkflow as jest.Mock).mockResolvedValueOnce({
        alertRetrievalResult: mockAlertRetrievalResult,
        generationResult: {
          ...mockGenerationResult,
          attackDiscoveries: [snakeCaseDiscovery],
        },
        outcome: 'validation_succeeded',
        validationResult: mockValidationResult,
      });

      const options = { ...executorOptions } as unknown as RuleExecutorOptions;

      await workflowExecutor({ deps, options });

      expect(mockGenerateHash).toHaveBeenCalledWith(
        expect.objectContaining({
          attackDiscovery: expect.objectContaining({
            alertIds: ['alert-1', 'alert-2'],
            detailsMarkdown: 'snake details',
            entitySummaryMarkdown: 'snake entity',
            mitreAttackTactics: ['Initial Access'],
            summaryMarkdown: 'snake summary',
            title: 'snake title',
          }),
        })
      );
    });
  });
});
