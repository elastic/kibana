/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type { WorkflowDetailDto } from '@kbn/workflows';
import {
  ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
  ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

import { checkManagedWorkflowIntegrity } from './check_managed_workflow_integrity';

const createMockAnalytics = (): jest.Mocked<AnalyticsServiceSetup> =>
  ({
    reportEvent: jest.fn(),
  } as unknown as jest.Mocked<AnalyticsServiceSetup>);

const computeExpectedHash = (workflowId: string): string => {
  const definition = getManagedWorkflowDefinition(workflowId);
  const yaml = definition?.yaml ?? '';
  return createHash('sha256').update(yaml.trim()).digest('hex');
};

const createIntactWorkflowDto = (id: string): WorkflowDetailDto => ({
  id,
  name: `Test workflow ${id}`,
  enabled: true,
  managed: true,
  definitionHash: computeExpectedHash(id),
  yaml: '',
  valid: true,
  definition: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  createdBy: 'kibana',
  lastUpdatedAt: '2024-01-01T00:00:00.000Z',
  lastUpdatedBy: 'kibana',
});

const createMockWorkflowsExtensions = (
  registeredStepTypes: string[] = []
): jest.Mocked<WorkflowsExtensionsServerPluginStart> =>
  ({
    hasStepDefinition: jest.fn((stepTypeId: string) => registeredStepTypes.includes(stepTypeId)),
  } as unknown as jest.Mocked<WorkflowsExtensionsServerPluginStart>);

const createMockManagementApi = (
  overrides: Partial<Record<string, WorkflowDetailDto | null>> = {}
): WorkflowsServerPluginSetup['management'] => {
  const getWorkflow = jest.fn().mockImplementation((id: string) => {
    if (id in overrides) {
      return Promise.resolve(overrides[id]);
    }
    return Promise.resolve(createIntactWorkflowDto(id));
  });

  return { getWorkflow } as unknown as WorkflowsServerPluginSetup['management'];
};

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

describe('checkManagedWorkflowIntegrity', () => {
  describe('all_intact', () => {
    it('returns all_intact when all required workflows exist, are managed, enabled, and have current definitionHash', async () => {
      const workflowsManagementApi = createMockManagementApi();

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsManagementApi,
      });

      expect(result.status).toBe('all_intact');
      expect(result.repaired).toEqual([]);
      expect(result.unrepairableErrors).toEqual([]);
      expect(result.optionalRepaired).toEqual([]);
      expect(result.optionalWarnings).toEqual([]);
    });

    it('queries all 5 AD workflow IDs', async () => {
      const workflowsManagementApi = createMockManagementApi();

      await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsManagementApi,
      });

      expect(workflowsManagementApi.getWorkflow).toHaveBeenCalledWith(
        ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
        'default'
      );
      expect(workflowsManagementApi.getWorkflow).toHaveBeenCalledWith(
        ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
        'default'
      );
      expect(workflowsManagementApi.getWorkflow).toHaveBeenCalledWith(
        ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
        'default'
      );
      expect(workflowsManagementApi.getWorkflow).toHaveBeenCalledWith(
        ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
        'default'
      );
      expect(workflowsManagementApi.getWorkflow).toHaveBeenCalledWith(
        ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
        'default'
      );
    });
  });

  describe('repaired', () => {
    it('returns repaired when a required workflow has an outdated definitionHash', async () => {
      const workflowsManagementApi = createMockManagementApi({
        [ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID]: {
          ...createIntactWorkflowDto(ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID),
          definitionHash: 'outdated-hash-from-previous-version',
        },
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsManagementApi,
      });

      expect(result.status).toBe('repaired');
      expect(result.repaired).toEqual([
        { key: 'generation', workflowId: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID },
      ]);
      expect(result.unrepairableErrors).toEqual([]);
    });

    it('returns repaired with all affected keys when multiple required workflows have outdated hashes', async () => {
      const workflowsManagementApi = createMockManagementApi({
        [ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID]: {
          ...createIntactWorkflowDto(ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID),
          definitionHash: 'old-hash-a',
        },
        [ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID]: {
          ...createIntactWorkflowDto(ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID),
          definitionHash: 'old-hash-b',
        },
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsManagementApi,
      });

      expect(result.status).toBe('repaired');
      expect(result.repaired).toEqual(
        expect.arrayContaining([
          { key: 'generation', workflowId: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID },
          { key: 'validate', workflowId: ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID },
        ])
      );
    });
  });

  describe('repair_failed', () => {
    it('returns repair_failed when a required workflow is missing (null)', async () => {
      const workflowsManagementApi = createMockManagementApi({
        [ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID]: null,
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsManagementApi,
      });

      expect(result.status).toBe('repair_failed');
      expect(result.unrepairableErrors).toEqual([
        expect.objectContaining({
          key: 'generation',
          workflowId: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
        }),
      ]);
    });

    it('returns repair_failed when a required workflow is disabled', async () => {
      const workflowsManagementApi = createMockManagementApi({
        [ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID]: {
          ...createIntactWorkflowDto(ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID),
          enabled: false,
        },
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsManagementApi,
      });

      expect(result.status).toBe('repair_failed');
      expect(result.unrepairableErrors).toEqual([
        expect.objectContaining({
          key: 'default_alert_retrieval',
          workflowId: ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
        }),
      ]);
    });

    it('returns repair_failed when a required workflow has managed: false', async () => {
      const workflowsManagementApi = createMockManagementApi({
        [ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID]: {
          ...createIntactWorkflowDto(ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID),
          managed: false,
        },
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsManagementApi,
      });

      expect(result.status).toBe('repair_failed');
      expect(result.unrepairableErrors).toEqual([
        expect.objectContaining({
          key: 'validate',
          workflowId: ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
        }),
      ]);
    });

    it('takes precedence over repaired when unrepairableErrors exist', async () => {
      const workflowsManagementApi = createMockManagementApi({
        [ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID]: null,
        [ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID]: {
          ...createIntactWorkflowDto(ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID),
          definitionHash: 'old-hash',
        },
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsManagementApi,
      });

      expect(result.status).toBe('repair_failed');
    });
  });

  describe('optional workflows', () => {
    it('does not affect status when an optional workflow has an outdated definitionHash', async () => {
      const workflowsManagementApi = createMockManagementApi({
        [ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID]: {
          ...createIntactWorkflowDto(ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID),
          definitionHash: 'old-optional-hash',
        },
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsManagementApi,
      });

      expect(result.status).toBe('all_intact');
      expect(result.optionalRepaired).toEqual([
        { key: 'run_example', workflowId: ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID },
      ]);
    });

    it('does not affect status when an optional workflow is missing, adds to optionalWarnings', async () => {
      const workflowsManagementApi = createMockManagementApi({
        [ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID]: null,
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsManagementApi,
      });

      expect(result.status).toBe('all_intact');
      expect(result.optionalWarnings).toEqual([
        expect.objectContaining({
          key: 'custom_validation_example',
          workflowId: ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
        }),
      ]);
    });

    it('does not affect status when an optional workflow is disabled, adds to optionalWarnings', async () => {
      const workflowsManagementApi = createMockManagementApi({
        [ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID]: {
          ...createIntactWorkflowDto(ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID),
          enabled: false,
        },
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsManagementApi,
      });

      expect(result.status).toBe('all_intact');
      expect(result.optionalWarnings).toEqual([
        expect.objectContaining({
          key: 'run_example',
          workflowId: ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
        }),
      ]);
    });
  });

  describe('telemetry (workflow_modified)', () => {
    it('emits workflow_modified for each required workflow with an outdated definitionHash', async () => {
      const analytics = createMockAnalytics();
      const workflowsManagementApi = createMockManagementApi({
        [ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID]: {
          ...createIntactWorkflowDto(ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID),
          definitionHash: 'outdated-hash',
        },
        [ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID]: {
          ...createIntactWorkflowDto(ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID),
          definitionHash: 'another-outdated-hash',
        },
      });

      await checkManagedWorkflowIntegrity({
        analytics,
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsManagementApi,
      });

      expect(analytics.reportEvent).toHaveBeenCalledTimes(2);

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        'attack_discovery_misconfiguration',
        expect.objectContaining({
          detail: expect.stringContaining('platform will reconcile on next restart'),
          misconfiguration_type: 'workflow_modified',
          space_id: 'default',
          workflow_id: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
        })
      );

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        'attack_discovery_misconfiguration',
        expect.objectContaining({
          detail: expect.stringContaining('platform will reconcile on next restart'),
          misconfiguration_type: 'workflow_modified',
          space_id: 'default',
          workflow_id: ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
        })
      );
    });

    it('emits workflow_modified for an optional workflow with an outdated definitionHash', async () => {
      const analytics = createMockAnalytics();
      const workflowsManagementApi = createMockManagementApi({
        [ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID]: {
          ...createIntactWorkflowDto(ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID),
          definitionHash: 'outdated-optional-hash',
        },
      });

      await checkManagedWorkflowIntegrity({
        analytics,
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsManagementApi,
      });

      expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(analytics.reportEvent).toHaveBeenCalledWith(
        'attack_discovery_misconfiguration',
        expect.objectContaining({
          detail: expect.stringContaining('platform will reconcile on next restart'),
          misconfiguration_type: 'workflow_modified',
          space_id: 'default',
          workflow_id: ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
        })
      );
    });

    it('does not emit telemetry when all workflows are intact', async () => {
      const analytics = createMockAnalytics();
      const workflowsManagementApi = createMockManagementApi();

      await checkManagedWorkflowIntegrity({
        analytics,
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsManagementApi,
      });

      expect(analytics.reportEvent).not.toHaveBeenCalled();
    });

    it('does not emit telemetry when required workflows are missing (unrepairableError)', async () => {
      const analytics = createMockAnalytics();
      const workflowsManagementApi = createMockManagementApi({
        [ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID]: null,
      });

      await checkManagedWorkflowIntegrity({
        analytics,
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsManagementApi,
      });

      expect(analytics.reportEvent).not.toHaveBeenCalled();
    });

    it('does not emit telemetry when analytics is not provided', async () => {
      const workflowsManagementApi = createMockManagementApi({
        [ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID]: {
          ...createIntactWorkflowDto(ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID),
          definitionHash: 'outdated-hash',
        },
      });

      await expect(
        checkManagedWorkflowIntegrity({
          logger: createMockLogger(),
          spaceId: 'default',
          workflowsManagementApi,
        })
      ).resolves.toBeDefined();
    });
  });

  describe('step type registration', () => {
    const AD_STEP_TYPES = [
      'security.attack-discovery.defaultAlertRetrieval',
      'security.attack-discovery.generate',
      'security.attack-discovery.defaultValidation',
      'security.attack-discovery.persistDiscoveries',
      'security.attack-discovery.run',
    ];

    it('returns repair_failed when a required workflow references an unregistered step type', async () => {
      const workflowsManagementApi = createMockManagementApi();
      const workflowsExtensions = createMockWorkflowsExtensions(
        AD_STEP_TYPES.filter((t) => t !== 'security.attack-discovery.defaultAlertRetrieval')
      );

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
        workflowsManagementApi,
      });

      expect(result.status).toBe('repair_failed');
      expect(result.unrepairableErrors).toEqual([
        expect.objectContaining({
          error: expect.stringContaining('security.attack-discovery.defaultAlertRetrieval'),
          key: 'default_alert_retrieval',
          workflowId: ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
        }),
      ]);
    });

    it('returns all_intact when all step types referenced by required workflows are registered', async () => {
      const workflowsManagementApi = createMockManagementApi();
      const workflowsExtensions = createMockWorkflowsExtensions(AD_STEP_TYPES);

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
        workflowsManagementApi,
      });

      expect(result.status).toBe('all_intact');
      expect(result.unrepairableErrors).toEqual([]);
    });

    it('does not call hasStepDefinition for built-in data.* step types', async () => {
      const workflowsManagementApi = createMockManagementApi();
      const workflowsExtensions = createMockWorkflowsExtensions(AD_STEP_TYPES);

      await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
        workflowsManagementApi,
      });

      expect(workflowsExtensions.hasStepDefinition).not.toHaveBeenCalledWith(
        expect.stringMatching(/^data\./)
      );
    });

    it('skips step type checks when workflowsExtensions is not provided', async () => {
      const workflowsManagementApi = createMockManagementApi();

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsManagementApi,
      });

      expect(result.status).toBe('all_intact');
    });
  });
});
