/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type { ManagedWorkflowStatus, ManagedWorkflowStatusReport } from '@kbn/workflows/server';
import {
  ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
  ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

import { checkManagedWorkflowIntegrity } from './check_managed_workflow_integrity';

const createMockAnalytics = (): jest.Mocked<AnalyticsServiceSetup> =>
  ({
    reportEvent: jest.fn(),
  } as unknown as jest.Mocked<AnalyticsServiceSetup>);

const createIntactReport = (id: string): ManagedWorkflowStatusReport => ({
  definitionId: id as ManagedWorkflowStatusReport['definitionId'],
  enabled: true,
  installed: true,
  managedBy: 'discoveries',
  registryHash: 'registry-hash',
  registryVersion: 1,
  spaceId: 'default',
  status: 'intact',
  storedHash: 'registry-hash',
  storedVersion: 1,
  valid: true,
  workflowId: id,
});

const createReport = (
  id: string,
  status: ManagedWorkflowStatus,
  overrides: Partial<ManagedWorkflowStatusReport> = {}
): ManagedWorkflowStatusReport => ({
  ...createIntactReport(id),
  status,
  ...overrides,
});

interface MockManagedClient {
  getWorkflowStatus: jest.Mock;
}

const createMockManagedClient = (
  overrides: Partial<Record<string, ManagedWorkflowStatusReport>> = {}
): MockManagedClient => ({
  getWorkflowStatus: jest.fn().mockImplementation((id: string) => {
    if (id in overrides) {
      return Promise.resolve(overrides[id]);
    }
    return Promise.resolve(createIntactReport(id));
  }),
});

const createMockWorkflowsExtensions = ({
  managedClient,
  registeredStepTypes = [],
}: {
  managedClient: MockManagedClient;
  registeredStepTypes?: string[];
}): jest.Mocked<WorkflowsExtensionsServerPluginStart> =>
  ({
    hasStepDefinition: jest.fn((stepTypeId: string) => registeredStepTypes.includes(stepTypeId)),
    initManagedWorkflowsClient: jest.fn().mockResolvedValue(managedClient),
  } as unknown as jest.Mocked<WorkflowsExtensionsServerPluginStart>);

const AD_STEP_TYPES = [
  'security.attack-discovery.defaultAlertRetrieval',
  'security.attack-discovery.generate',
  'security.attack-discovery.defaultValidation',
  'security.attack-discovery.persistDiscoveries',
  'security.attack-discovery.run',
];

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

describe('checkManagedWorkflowIntegrity', () => {
  describe('all_intact', () => {
    it('returns all_intact when all required workflows report intact', async () => {
      const managedClient = createMockManagedClient();
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
      });

      expect(result.status).toBe('all_intact');
      expect(result.repaired).toEqual([]);
      expect(result.unrepairableErrors).toEqual([]);
      expect(result.optionalRepaired).toEqual([]);
      expect(result.optionalWarnings).toEqual([]);
    });

    it('initializes the managed workflows client with the discoveries plugin id', async () => {
      const managedClient = createMockManagedClient();
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
      });

      expect(workflowsExtensions.initManagedWorkflowsClient).toHaveBeenCalledWith('discoveries');
    });

    it('queries all 5 AD workflow IDs via getWorkflowStatus', async () => {
      const managedClient = createMockManagedClient();
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
      });

      expect(managedClient.getWorkflowStatus).toHaveBeenCalledWith(
        ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
        { spaceId: 'default' }
      );
      expect(managedClient.getWorkflowStatus).toHaveBeenCalledWith(
        ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
        { spaceId: 'default' }
      );
      expect(managedClient.getWorkflowStatus).toHaveBeenCalledWith(
        ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
        { spaceId: 'default' }
      );
      expect(managedClient.getWorkflowStatus).toHaveBeenCalledWith(
        ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
        { spaceId: 'default' }
      );
      expect(managedClient.getWorkflowStatus).toHaveBeenCalledWith(
        ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
        { spaceId: 'default' }
      );
    });
  });

  describe('repaired', () => {
    it('returns repaired when a required workflow reports drifted', async () => {
      const managedClient = createMockManagedClient({
        [ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID]: createReport(
          ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
          'drifted',
          { storedHash: 'outdated-hash-from-previous-version' }
        ),
      });
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
      });

      expect(result.status).toBe('repaired');
      expect(result.repaired).toEqual([
        { key: 'generation', workflowId: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID },
      ]);
      expect(result.unrepairableErrors).toEqual([]);
    });

    it('returns repaired with all affected keys when multiple required workflows report drifted', async () => {
      const managedClient = createMockManagedClient({
        [ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID]: createReport(
          ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
          'drifted'
        ),
        [ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID]: createReport(
          ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
          'drifted'
        ),
      });
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
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
    it('returns repair_failed when a required workflow reports missing', async () => {
      const managedClient = createMockManagedClient({
        [ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID]: createReport(
          ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
          'missing',
          {
            installed: false,
            enabled: null,
            valid: null,
            managedBy: null,
            storedHash: null,
            storedVersion: null,
          }
        ),
      });
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
      });

      expect(result.status).toBe('repair_failed');
      expect(result.unrepairableErrors).toEqual([
        expect.objectContaining({
          error: expect.stringContaining('not found'),
          key: 'generation',
          workflowId: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
        }),
      ]);
    });

    it('returns repair_failed when a required workflow reports disabled', async () => {
      const managedClient = createMockManagedClient({
        [ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID]: createReport(
          ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
          'disabled',
          { enabled: false }
        ),
      });
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
      });

      expect(result.status).toBe('repair_failed');
      expect(result.unrepairableErrors).toEqual([
        expect.objectContaining({
          error: expect.stringContaining('disabled'),
          key: 'default_alert_retrieval',
          workflowId: ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
        }),
      ]);
    });

    it('returns repair_failed when a required workflow reports not_managed', async () => {
      const managedClient = createMockManagedClient({
        [ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID]: createReport(
          ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
          'not_managed',
          { managedBy: null }
        ),
      });
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
      });

      expect(result.status).toBe('repair_failed');
      expect(result.unrepairableErrors).toEqual([
        expect.objectContaining({
          error: expect.stringContaining('not managed'),
          key: 'validate',
          workflowId: ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
        }),
      ]);
    });

    it('returns repair_failed when a required workflow reports invalid', async () => {
      const managedClient = createMockManagedClient({
        [ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID]: createReport(
          ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
          'invalid',
          { valid: false }
        ),
      });
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
      });

      expect(result.status).toBe('repair_failed');
      expect(result.unrepairableErrors).toEqual([
        expect.objectContaining({
          error: expect.stringContaining('invalid definition'),
          key: 'generation',
          workflowId: ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
        }),
      ]);
    });

    it('takes precedence over repaired when unrepairableErrors exist', async () => {
      const managedClient = createMockManagedClient({
        [ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID]: createReport(
          ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
          'missing'
        ),
        [ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID]: createReport(
          ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
          'drifted'
        ),
      });
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
      });

      expect(result.status).toBe('repair_failed');
    });
  });

  describe('optional workflows', () => {
    it('does not affect status when an optional workflow reports drifted, adds to optionalRepaired', async () => {
      const managedClient = createMockManagedClient({
        [ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID]: createReport(
          ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
          'drifted'
        ),
      });
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
      });

      expect(result.status).toBe('all_intact');
      expect(result.optionalRepaired).toEqual([
        { key: 'run_example', workflowId: ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID },
      ]);
    });

    it('does not affect status when an optional workflow reports missing, adds to optionalWarnings', async () => {
      const managedClient = createMockManagedClient({
        [ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID]: createReport(
          ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
          'missing'
        ),
      });
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
      });

      expect(result.status).toBe('all_intact');
      expect(result.optionalWarnings).toEqual([
        expect.objectContaining({
          error: expect.stringContaining('not found'),
          key: 'custom_validation_example',
          workflowId: ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
        }),
      ]);
    });

    it('does not affect status when an optional workflow reports disabled, adds to optionalWarnings', async () => {
      const managedClient = createMockManagedClient({
        [ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID]: createReport(
          ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
          'disabled',
          { enabled: false }
        ),
      });
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
      });

      expect(result.status).toBe('all_intact');
      expect(result.optionalWarnings).toEqual([
        expect.objectContaining({
          error: expect.stringContaining('disabled'),
          key: 'run_example',
          workflowId: ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
        }),
      ]);
    });

    it('does not affect status when an optional workflow reports invalid, adds to optionalWarnings', async () => {
      const managedClient = createMockManagedClient({
        [ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID]: createReport(
          ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
          'invalid',
          { valid: false }
        ),
      });
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
      });

      expect(result.status).toBe('all_intact');
      expect(result.optionalWarnings).toEqual([
        expect.objectContaining({
          error: expect.stringContaining('invalid definition'),
          key: 'run_example',
          workflowId: ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
        }),
      ]);
    });
  });

  describe('telemetry (workflow_modified)', () => {
    it('emits workflow_modified for each required workflow reporting drifted', async () => {
      const analytics = createMockAnalytics();
      const managedClient = createMockManagedClient({
        [ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID]: createReport(
          ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
          'drifted'
        ),
        [ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID]: createReport(
          ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
          'drifted'
        ),
      });
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      await checkManagedWorkflowIntegrity({
        analytics,
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
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

    it('emits workflow_modified for an optional workflow reporting drifted', async () => {
      const analytics = createMockAnalytics();
      const managedClient = createMockManagedClient({
        [ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID]: createReport(
          ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
          'drifted'
        ),
      });
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      await checkManagedWorkflowIntegrity({
        analytics,
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
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
      const managedClient = createMockManagedClient();
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      await checkManagedWorkflowIntegrity({
        analytics,
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
      });

      expect(analytics.reportEvent).not.toHaveBeenCalled();
    });

    it('does not emit telemetry when required workflows are missing (unrepairableError)', async () => {
      const analytics = createMockAnalytics();
      const managedClient = createMockManagedClient({
        [ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID]: createReport(
          ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
          'missing'
        ),
      });
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      await checkManagedWorkflowIntegrity({
        analytics,
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
      });

      expect(analytics.reportEvent).not.toHaveBeenCalled();
    });

    it('does not throw when analytics is not provided and a required workflow has drifted', async () => {
      const managedClient = createMockManagedClient({
        [ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID]: createReport(
          ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
          'drifted'
        ),
      });
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      await expect(
        checkManagedWorkflowIntegrity({
          logger: createMockLogger(),
          spaceId: 'default',
          workflowsExtensions,
        })
      ).resolves.toBeDefined();
    });
  });

  describe('step type registration', () => {
    it('returns repair_failed when a required workflow references an unregistered step type', async () => {
      const managedClient = createMockManagedClient();
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES.filter(
          (t) => t !== 'security.attack-discovery.defaultAlertRetrieval'
        ),
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
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
      const managedClient = createMockManagedClient();
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
      });

      expect(result.status).toBe('all_intact');
      expect(result.unrepairableErrors).toEqual([]);
    });

    it('does not call hasStepDefinition for built-in data.* step types', async () => {
      const managedClient = createMockManagedClient();
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES,
      });

      await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
      });

      expect(workflowsExtensions.hasStepDefinition).not.toHaveBeenCalledWith(
        expect.stringMatching(/^data\./)
      );
    });

    it('does not perform the step-type check when a required workflow is already drifted', async () => {
      const managedClient = createMockManagedClient({
        [ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID]: createReport(
          ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
          'drifted'
        ),
      });
      const workflowsExtensions = createMockWorkflowsExtensions({
        managedClient,
        registeredStepTypes: AD_STEP_TYPES.filter(
          (t) => t !== 'security.attack-discovery.defaultAlertRetrieval'
        ),
      });

      const result = await checkManagedWorkflowIntegrity({
        logger: createMockLogger(),
        spaceId: 'default',
        workflowsExtensions,
      });

      expect(result.status).toBe('repaired');
      expect(result.repaired).toEqual([
        {
          key: 'default_alert_retrieval',
          workflowId: ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
        },
      ]);
    });
  });
});
