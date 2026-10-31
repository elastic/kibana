/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  getManagedWorkflowDefinition,
  NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SCHEDULED_DETECTION_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SCHEDULED_REVIEW_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { parse } from 'yaml';
import { SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER } from './managed_workflow_owner';
import { createSignificantEventsScheduledWorkflowsService } from './significant_events_scheduled_workflows';
import type { SignificantEventsServer } from '../../types';

interface ParsedWorkflowStep {
  name: string;
  type: string;
  status?: string;
  if?: string;
  condition?: string;
  foreach?: string;
  'max-iterations'?: number;
  'iteration-timeout'?: string;
  with?: Record<string, unknown>;
  steps?: ParsedWorkflowStep[];
}

interface ParsedWorkflowInput {
  name: string;
}

interface ParsedWorkflowTrigger {
  type: string;
  with?: { every?: string };
  inputs?: ParsedWorkflowInput[] | { properties?: Record<string, unknown> };
}

interface ParsedWorkflow {
  enabled: boolean;
  settings?: { run_as?: string };
  triggers: ParsedWorkflowTrigger[];
  steps: ParsedWorkflowStep[];
}

const getParsedWorkflowYaml = (id: string, values: Record<string, unknown>): ParsedWorkflow => {
  const definition = getManagedWorkflowDefinition(id);
  if (!definition || !('yamlTemplate' in definition) || !definition.yamlTemplate) {
    throw new Error(`Managed workflow definition ${id} is missing a yamlTemplate`);
  }
  return parse(definition.yamlTemplate(values)) as ParsedWorkflow;
};

const getParsedStaticWorkflowYaml = (id: string): ParsedWorkflow => {
  const definition = getManagedWorkflowDefinition(id);
  if (!definition || !('yaml' in definition) || typeof definition.yaml !== 'string') {
    throw new Error(`Managed workflow definition ${id} is missing yaml`);
  }
  return parse(definition.yaml) as ParsedWorkflow;
};

const findStep = (steps: ParsedWorkflowStep[], name: string): ParsedWorkflowStep | undefined => {
  for (const step of steps) {
    if (step.name === name) {
      return step;
    }
    const nested = findStep(step.steps ?? [], name);
    if (nested) {
      return nested;
    }
  }
  return undefined;
};

const createMockManagementApi = (overrides: Record<string, jest.Mock> = {}) => {
  const api = {
    getWorkflow: jest.fn().mockResolvedValue({
      id: NIGHTSHIFT_BOUND_SCHEDULED_DETECTION_WORKFLOW_ID,
      enabled: false,
    }),
    updateWorkflow: jest.fn().mockResolvedValue({}),
    getWorkflowExecutions: jest.fn().mockResolvedValue({ results: [], total: 0 }),
    cancelWorkflowExecution: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return { ...api, getClient: jest.fn(() => api) };
};

const createMockManagedWorkflowsClient = () => ({
  install: jest.fn().mockResolvedValue(undefined),
  uninstall: jest.fn().mockResolvedValue(undefined),
  ready: jest.fn().mockResolvedValue(undefined),
  getWorkflowStatus: jest.fn(),
  execute: jest.fn(),
});

describe('scheduled Significant Events managed workflows', () => {
  it.each([
    ['detection', NIGHTSHIFT_BOUND_SCHEDULED_DETECTION_WORKFLOW_ID],
    ['review', NIGHTSHIFT_BOUND_SCHEDULED_REVIEW_WORKFLOW_ID],
  ])('registers the %s workflow as dynamic and restorable', (_label, id) => {
    const definition = getManagedWorkflowDefinition(id);

    // 'dynamic'/'restorable' is what lets the reconciliation service below
    // install/enable/disable/uninstall these per space; 'static'/'enforced'
    // (used by the always-on detection/discovery workflows) would make them
    // installed everywhere and impossible to turn off per space.
    expect(definition?.management).toEqual({
      lifecycle: 'dynamic',
      versionStrategy: 'auto',
      enablement: 'restorable',
    });
  });

  it('wires the detection interval into the trigger cadence and the tuning values into the detect inputs', () => {
    const defaults = getParsedWorkflowYaml(NIGHTSHIFT_BOUND_SCHEDULED_DETECTION_WORKFLOW_ID, {
      serviceAccountId: 'service-account-id',
      detectionIntervalMinutes: 5,
      detectionBucketIntervalMinutes: 1,
      detectionLookbackMinutes: 40,
      targetCoverageMinutes: 10,
    });
    const tuned = getParsedWorkflowYaml(NIGHTSHIFT_BOUND_SCHEDULED_DETECTION_WORKFLOW_ID, {
      serviceAccountId: 'service-account-id',
      detectionIntervalMinutes: 45,
      detectionBucketIntervalMinutes: 5,
      detectionLookbackMinutes: 150,
      targetCoverageMinutes: 10,
    });

    expect(defaults.enabled).toBe(false);
    expect(defaults.triggers).toEqual(
      expect.arrayContaining([{ type: 'scheduled', with: { every: '5m' } }])
    );
    const defaultsStep = findStep(defaults.steps, 'detect');
    expect(defaultsStep?.with).toEqual({
      'workflow-id': SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
      'run-as-mode': 'inherit',
      inputs: {
        lookback: 'now-40m',
        bucketInterval: '1m',
        detectionIntervalMinutes: 5,
        targetCoverageMinutes: 10,
      },
    });

    expect(tuned.triggers).toEqual(
      expect.arrayContaining([{ type: 'scheduled', with: { every: '45m' } }])
    );
    const tunedStep = findStep(tuned.steps, 'detect');
    expect(tunedStep?.with).toEqual({
      'workflow-id': SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
      'run-as-mode': 'inherit',
      inputs: {
        lookback: 'now-150m',
        bucketInterval: '5m',
        detectionIntervalMinutes: 45,
        targetCoverageMinutes: 10,
      },
    });
  });

  it.each([
    ['detection', NIGHTSHIFT_BOUND_SCHEDULED_DETECTION_WORKFLOW_ID],
    ['review', NIGHTSHIFT_BOUND_SCHEDULED_REVIEW_WORKFLOW_ID],
  ])('runs the %s workflow as the service account and its children inherit it', (_label, id) => {
    const parsed = getParsedWorkflowYaml(id, {
      serviceAccountId: 'service-account-id',
      detectionIntervalMinutes: 5,
      detectionBucketIntervalMinutes: 1,
      detectionLookbackMinutes: 40,
      targetCoverageMinutes: 10,
      reviewIntervalMinutes: 20,
      discoveryBatchSize: 7,
      maxReviewPasses: 6,
      flakyRuleDetectionThreshold: 12,
      flakyRuleProbeAfterMinutes: 180,
      flakyRuleExemptSeverityScore: 85,
    });

    expect(parsed.settings?.run_as).toBe('service-account-id');
    expect(JSON.stringify(parsed.steps)).toContain('"run-as-mode":"inherit"');
  });

  it('wires each review config value into the discovery drain-loop input', () => {
    const parsed = getParsedWorkflowYaml(NIGHTSHIFT_BOUND_SCHEDULED_REVIEW_WORKFLOW_ID, {
      serviceAccountId: 'service-account-id',
      reviewIntervalMinutes: 20,
      discoveryBatchSize: 7,
      maxReviewPasses: 6,
      flakyRuleDetectionThreshold: 12,
      flakyRuleProbeAfterMinutes: 180,
      flakyRuleExemptSeverityScore: 85,
    });

    expect(parsed.enabled).toBe(false);
    expect(parsed.triggers).toEqual(
      expect.arrayContaining([{ type: 'scheduled', with: { every: '20m' } }])
    );

    const drainLoop = findStep(parsed.steps, 'run_review_until_drained');
    expect(drainLoop?.type).toBe('while');
    expect(drainLoop?.['max-iterations']).toBe(6);
    expect(drainLoop?.['iteration-timeout']).toBe('50m');
    expect(drainLoop?.condition).toBe('${{ steps.discover.output.hasWork == true }}');

    const discover = findStep(drainLoop?.steps ?? [], 'discover');
    expect(discover?.with).toEqual({
      'workflow-id': SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
      'run-as-mode': 'inherit',
      inputs: {
        detectionBatchMax: 7,
        flakyRuleDetectionThreshold: 12,
        flakyRuleProbeAfterMinutes: 180,
        flakyRuleExemptSeverityScore: 85,
        rootTriggeredBy: '${{ execution.triggeredBy }}',
      },
    });
  });

  it('discovery always completes no-work runs as success and reports hasWork, so the scheduled drain loop can rely on hasWork instead of run status', () => {
    const parsed = getParsedStaticWorkflowYaml(SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID);

    const triggerInputs = parsed.triggers[0]?.inputs;
    const hasLegacyInput = Array.isArray(triggerInputs)
      ? triggerInputs.some((input) => input.name === 'completeNoWorkAsSuccess')
      : Object.hasOwn(triggerInputs?.properties ?? {}, 'completeNoWorkAsSuccess');
    expect(hasLegacyInput).toBe(false);

    const noWorkStep = findStep(parsed.steps, 'output_no_detections');
    expect(noWorkStep?.type).toBe('workflow.output');
    expect(noWorkStep?.status).not.toBe('cancelled');
    expect(noWorkStep?.with?.hasWork).toBe(false);

    expect(parsed.steps.some((step) => step.status === 'cancelled')).toBe(false);

    const resultStep = findStep(parsed.steps, 'output_result');
    expect(resultStep?.with).toMatchObject({
      hasWork: true,
      processedCount: expect.stringContaining('compute_batch_size.output.processedCount'),
    });
  });
});

const CONFIG = {
  detectionIntervalMinutes: 30,
  detectionBucketIntervalMinutes: 1,
  detectionLookbackMinutes: 40,
  targetCoverageMinutes: 30,
  reviewIntervalMinutes: 10,
  discoveryBatchSize: 3,
  maxReviewPasses: 3,
  flakyRuleDetectionThreshold: 10,
  flakyRuleProbeAfterMinutes: 360,
  flakyRuleExemptSeverityScore: 80,
};

// The space's account comes from its detection engine binding, and the bound workflows are
// installed through the request-scoped client.
const createServer = (
  managedWorkflowsClient: ReturnType<typeof createMockManagedWorkflowsClient>,
  serviceAccountId: string | null = 'account-id'
) =>
  ({
    core: {
      security: {
        serviceAccounts: {
          isEnabled: () => true,
          getWorkloadBinding: jest
            .fn()
            .mockResolvedValue(serviceAccountId ? { serviceAccountId } : undefined),
        },
      },
    },
    workflowsExtensions: {
      getClient: jest.fn().mockResolvedValue({ managedWorkflows: managedWorkflowsClient }),
    },
  } as unknown as Pick<SignificantEventsServer, 'core' | 'workflowsExtensions'>);

describe('SignificantEventsScheduledWorkflowsService', () => {
  it('lazily installs and enables per-space scheduled workflows', async () => {
    const managementApi = createMockManagementApi();
    const managedWorkflowsClient = createMockManagedWorkflowsClient();
    const request = httpServerMock.createKibanaRequest();
    const service = createSignificantEventsScheduledWorkflowsService({
      logger: loggerMock.create(),
      managementApi: managementApi as never,
      server: createServer(managedWorkflowsClient),
    });

    await service.ensureWorkflow({
      enabled: true,
      request,
      spaceId: 'space-a',
      config: {
        detectionIntervalMinutes: 30,
        detectionBucketIntervalMinutes: 1,
        detectionLookbackMinutes: 40,
        targetCoverageMinutes: 30,
        reviewIntervalMinutes: 10,
        discoveryBatchSize: 3,
        maxReviewPasses: 3,
        flakyRuleDetectionThreshold: 10,
        flakyRuleProbeAfterMinutes: 360,
        flakyRuleExemptSeverityScore: 80,
      },
    });

    expect(managedWorkflowsClient.install).toHaveBeenCalledWith(
      SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER,
      NIGHTSHIFT_BOUND_SCHEDULED_DETECTION_WORKFLOW_ID,
      {
        spaceId: 'space-a',
        workflowIdSuffix: 'space-a',
        values: {
          serviceAccountId: 'account-id',
          detectionIntervalMinutes: 30,
          detectionBucketIntervalMinutes: 1,
          detectionLookbackMinutes: 40,
          targetCoverageMinutes: 30,
        },
      }
    );
    expect(managedWorkflowsClient.install).toHaveBeenCalledWith(
      SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER,
      NIGHTSHIFT_BOUND_SCHEDULED_REVIEW_WORKFLOW_ID,
      {
        spaceId: 'space-a',
        workflowIdSuffix: 'space-a',
        values: {
          serviceAccountId: 'account-id',
          reviewIntervalMinutes: 10,
          discoveryBatchSize: 3,
          maxReviewPasses: 3,
          flakyRuleDetectionThreshold: 10,
          flakyRuleProbeAfterMinutes: 360,
          flakyRuleExemptSeverityScore: 80,
        },
      }
    );
    expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
      `${NIGHTSHIFT_BOUND_SCHEDULED_DETECTION_WORKFLOW_ID}-space-a`,
      { enabled: true },
      'space-a',
      request
    );
    expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
      `${NIGHTSHIFT_BOUND_SCHEDULED_REVIEW_WORKFLOW_ID}-space-a`,
      { enabled: true },
      'space-a',
      request
    );
    expect(managementApi.getWorkflow).not.toHaveBeenCalledWith(
      `${NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID}-space-a`,
      'space-a'
    );
  });

  it('updates template values without toggling workflows that are already enabled', async () => {
    const managementApi = createMockManagementApi({
      getWorkflow: jest.fn().mockResolvedValue({ enabled: true }),
    });
    const managedWorkflowsClient = createMockManagedWorkflowsClient();
    const service = createSignificantEventsScheduledWorkflowsService({
      logger: loggerMock.create(),
      managementApi: managementApi as never,
      server: createServer(managedWorkflowsClient),
    });

    await service.ensureWorkflow({
      enabled: true,
      request: httpServerMock.createKibanaRequest(),
      spaceId: 'space-a',
      config: {
        detectionIntervalMinutes: 60,
        detectionBucketIntervalMinutes: 2,
        detectionLookbackMinutes: 60,
        targetCoverageMinutes: 30,
        reviewIntervalMinutes: 15,
        discoveryBatchSize: 10,
        maxReviewPasses: 4,
        flakyRuleDetectionThreshold: 10,
        flakyRuleProbeAfterMinutes: 360,
        flakyRuleExemptSeverityScore: 80,
      },
    });

    expect(managedWorkflowsClient.install).toHaveBeenCalledTimes(2);
    expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
  });

  it('disables, drains, and uninstalls per-space scheduled workflows', async () => {
    const managementApi = createMockManagementApi({
      getWorkflow: jest.fn().mockResolvedValue({ enabled: true }),
      getWorkflowExecutions: jest
        .fn()
        .mockResolvedValueOnce({ results: [{ id: 'running-detection-execution' }], total: 1 })
        .mockResolvedValueOnce({ results: [], total: 0 })
        .mockResolvedValue({ results: [], total: 0 }),
    });
    const managedWorkflowsClient = createMockManagedWorkflowsClient();
    const request = httpServerMock.createKibanaRequest();
    const service = createSignificantEventsScheduledWorkflowsService({
      logger: loggerMock.create(),
      managementApi: managementApi as never,
      server: createServer(managedWorkflowsClient),
    });

    await service.ensureWorkflow({
      enabled: false,
      request,
      spaceId: 'space-a',
      config: {
        detectionIntervalMinutes: 30,
        detectionBucketIntervalMinutes: 1,
        detectionLookbackMinutes: 40,
        targetCoverageMinutes: 30,
        reviewIntervalMinutes: 10,
        discoveryBatchSize: 3,
        maxReviewPasses: 3,
        flakyRuleDetectionThreshold: 10,
        flakyRuleProbeAfterMinutes: 360,
        flakyRuleExemptSeverityScore: 80,
      },
    });

    expect(managementApi.updateWorkflow).toHaveBeenCalledWith(
      `${NIGHTSHIFT_BOUND_SCHEDULED_DETECTION_WORKFLOW_ID}-space-a`,
      { enabled: false },
      'space-a',
      request
    );
    expect(managementApi.cancelWorkflowExecution).toHaveBeenCalledWith(
      'running-detection-execution',
      'space-a',
      request
    );
    expect(managedWorkflowsClient.uninstall).toHaveBeenCalledWith(
      SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER,
      NIGHTSHIFT_BOUND_SCHEDULED_DETECTION_WORKFLOW_ID,
      { spaceId: 'space-a', workflowIdSuffix: 'space-a' }
    );
    expect(managedWorkflowsClient.uninstall).toHaveBeenCalledWith(
      SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER,
      NIGHTSHIFT_BOUND_SCHEDULED_REVIEW_WORKFLOW_ID,
      { spaceId: 'space-a', workflowIdSuffix: 'space-a' }
    );
    expect(managementApi.getWorkflow).not.toHaveBeenCalledWith(
      `${NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID}-space-a`,
      'space-a'
    );
    expect(managementApi.getWorkflowExecutions).not.toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: `${NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID}-space-a`,
      }),
      'space-a'
    );
  });
  it('is refused with a 503 when the space is not set up, and installs nothing', async () => {
    const managementApi = createMockManagementApi();
    const managedWorkflowsClient = createMockManagedWorkflowsClient();
    const service = createSignificantEventsScheduledWorkflowsService({
      logger: loggerMock.create(),
      managementApi: managementApi as never,
      server: createServer(managedWorkflowsClient, null),
    });

    await expect(
      service.ensureWorkflow({
        enabled: true,
        request: httpServerMock.createKibanaRequest(),
        spaceId: 'space-a',
        config: CONFIG,
      })
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(managedWorkflowsClient.install).not.toHaveBeenCalled();
    expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
  });

  describe('rebind', () => {
    it('renders the installed workflows again with the current account, keeping them as they are', async () => {
      const managementApi = createMockManagementApi({
        getWorkflow: jest.fn().mockResolvedValue({ enabled: true }),
      });
      const managedWorkflowsClient = createMockManagedWorkflowsClient();
      const service = createSignificantEventsScheduledWorkflowsService({
        logger: loggerMock.create(),
        managementApi: managementApi as never,
        server: createServer(managedWorkflowsClient, 'new-account-id'),
      });

      await service.rebind({
        request: httpServerMock.createKibanaRequest(),
        spaceId: 'space-a',
        config: CONFIG,
      });

      expect(managedWorkflowsClient.install).toHaveBeenCalledTimes(2);
      expect(managedWorkflowsClient.install).toHaveBeenCalledWith(
        SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER,
        NIGHTSHIFT_BOUND_SCHEDULED_DETECTION_WORKFLOW_ID,
        expect.objectContaining({
          values: expect.objectContaining({ serviceAccountId: 'new-account-id' }),
        })
      );
      expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
    });

    it('installs the scheduled workflows of a space that has none when asked to', async () => {
      const managementApi = createMockManagementApi({
        getWorkflow: jest.fn().mockResolvedValue(null),
      });
      const managedWorkflowsClient = createMockManagedWorkflowsClient();
      const service = createSignificantEventsScheduledWorkflowsService({
        logger: loggerMock.create(),
        managementApi: managementApi as never,
        server: createServer(managedWorkflowsClient),
      });

      await service.rebind({
        request: httpServerMock.createKibanaRequest(),
        spaceId: 'space-a',
        config: CONFIG,
        installIfMissing: true,
      });

      expect(managedWorkflowsClient.install).toHaveBeenCalledTimes(2);
      expect(managementApi.updateWorkflow).not.toHaveBeenCalled();
    });

    it('leaves a space without scheduled workflows alone', async () => {
      const managementApi = createMockManagementApi({
        getWorkflow: jest.fn().mockResolvedValue(null),
      });
      const managedWorkflowsClient = createMockManagedWorkflowsClient();
      const service = createSignificantEventsScheduledWorkflowsService({
        logger: loggerMock.create(),
        managementApi: managementApi as never,
        server: createServer(managedWorkflowsClient),
      });

      await service.rebind({
        request: httpServerMock.createKibanaRequest(),
        spaceId: 'space-a',
        config: CONFIG,
      });

      expect(managedWorkflowsClient.install).not.toHaveBeenCalled();
    });
  });
});
