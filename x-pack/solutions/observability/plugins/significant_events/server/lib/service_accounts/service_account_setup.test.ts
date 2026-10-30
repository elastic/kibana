/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conflict } from '@hapi/boom';
import { httpServerMock } from '@kbn/core/server/mocks';
import {
  OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
} from '@kbn/management-settings-ids';
import {
  getNightshiftBoundCleanupWorkflowId,
  getNightshiftBoundDiscoveryWorkflowId,
  getNightshiftBoundKiContinuousOnboardingWorkflowId,
  getNightshiftBoundKiOnboardingWorkflowId,
  getNightshiftBoundKiSyncWorkflowId,
  getNightshiftBoundScheduledDetectionWorkflowId,
  getNightshiftBoundScheduledReviewWorkflowId,
  NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_DISCOVERY_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER } from '../workflows/managed_workflow_owner';
import { createServiceAccountSetupService } from './service_account_setup';

const SPACE_ID = 'default';
const ACCOUNT_ID = 'account-id';

const request = httpServerMock.createKibanaRequest();

const setup = ({
  serviceAccountsEnabled = true,
  canManageSecurity = true,
  paused = false,
  continuousOnboardingOn = false,
  scheduledDiscoveryOn = false,
  boundAccountId = ACCOUNT_ID,
  pauseFailures = [],
}: {
  serviceAccountsEnabled?: boolean;
  canManageSecurity?: boolean;
  paused?: boolean;
  continuousOnboardingOn?: boolean;
  scheduledDiscoveryOn?: boolean;
  /** The account the space is bound to before the setup, if any. */
  boundAccountId?: string;
  /** What pausing the space could not stop. */
  pauseFailures?: Array<{ target: string; error: string }>;
} = {}) => {
  // What happened, in order, across the services the setup touches.
  const calls: string[] = [];
  const installed = new Map<string, boolean>();

  const serviceAccounts = {
    isEnabled: jest.fn(() => serviceAccountsEnabled),
    bindWorkload: jest.fn(async () => {
      calls.push('bind');
    }),
    unbindWorkload: jest.fn(async () => {
      calls.push('unbind');
    }),
    getWorkloadBinding: jest.fn(async () =>
      boundAccountId ? { serviceAccountId: boundAccountId } : undefined
    ),
    create: jest.fn(async (): Promise<{ id: string }> => ({ id: 'created-account-id' })),
    withScopedRequestForWorkload: jest.fn(
      async (_: unknown, fn: (accountRequest: typeof request) => Promise<unknown>) => fn(request)
    ),
  };
  const core = {
    security: {
      serviceAccounts,
      authc: { getCurrentUser: jest.fn(() => ({ username: 'admin' })) },
    },
    elasticsearch: {
      client: {
        asScoped: () => ({
          asCurrentUser: {
            security: { hasPrivileges: async () => ({ has_all_requested: canManageSecurity }) },
          },
        }),
      },
    },
  };

  // A new install is off, like a managed workflow's own default.
  const install = jest.fn(async (_owner: string, id: string, options: { spaceId: string }) => {
    calls.push('install');
    installed.set(`${id}-${options.spaceId}`, false);
  });
  const workflowsExtensions = {
    getClient: jest.fn(async () => ({ managedWorkflows: { install } })),
  };
  const management = {
    getWorkflow: jest.fn(async (id: string) =>
      installed.has(id) ? { id, enabled: installed.get(id) } : null
    ),
    updateWorkflow: jest.fn(async (id: string, patch: { enabled: boolean }) => {
      installed.set(id, patch.enabled);
    }),
    getWorkflowExecutions: jest.fn(async () => ({ results: [], total: 0 })),
  };
  const onboardingClient = {
    stopEntryPointRuns: jest.fn(async () => {
      calls.push('stopRuns');
    }),
  };
  const maintenanceService = {
    getState: jest.fn(async () => (paused ? 'paused' : 'enabled')),
    pause: jest.fn(async () => {
      calls.push('pause');
      return {
        state: 'paused',
        executionsCancelled: 0,
        workflowsDisabled: 0,
        rulesDisabled: 0,
        partialFailures: pauseFailures,
      };
    }),
  };
  const settings: Record<string, boolean> = {
    [OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED]: continuousOnboardingOn,
    [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED]: scheduledDiscoveryOn,
  };
  // The scheduled workflows are installed by their own service, which is mocked here: it installs
  // them off, as a new install is.
  const rebind = jest.fn(async ({ spaceId, installIfMissing }) => {
    if (installIfMissing) {
      installed.set(getNightshiftBoundScheduledDetectionWorkflowId(spaceId), false);
      installed.set(getNightshiftBoundScheduledReviewWorkflowId(spaceId), false);
    }
  });
  const getScopedClients = jest.fn(async () => ({
    uiSettingsClient: {
      getAll: jest.fn(async () => ({})),
      get: jest.fn(async (key: string) => settings[key] ?? false),
    },
    getSignificantEventsAlertingContext: async () => ({
      rulesClient: { findRuleEnabledStates: jest.fn(async () => new Map()) },
      alertingV2RulesClient: { bulkDisableRules: jest.fn(), bulkEnableRules: jest.fn() },
    }),
    getKnowledgeIndicatorClient: async () => ({ getRuleBackedQueryLinks: async () => [] }),
  }));

  const service = createServiceAccountSetupService({
    core,
    spaces: undefined,
    workflowsExtensions,
    workflowsManagement: management,
    onboardingClient,
    getScopedClients,
    maintenanceService,
    scheduledWorkflowsService: { rebind },
  } as never);

  return {
    service,
    calls,
    installed,
    install,
    rebind,
    serviceAccounts,
    management,
    maintenanceService,
  };
};

describe('createServiceAccountSetupService', () => {
  describe('enable', () => {
    const enable = (fixture: ReturnType<typeof setup>) =>
      fixture.service.enable({
        request,
        spaceId: SPACE_ID,
        serviceAccountIds: { detectionEngine: ACCOUNT_ID },
      });

    it('binds the account before installing the workflows, bound to it', async () => {
      const fixture = setup();

      await enable(fixture);

      expect(fixture.calls.indexOf('bind')).toBeLessThan(fixture.calls.indexOf('install'));
      expect(fixture.serviceAccounts.bindWorkload).toHaveBeenCalledWith(
        request,
        expect.objectContaining({ serviceAccountId: ACCOUNT_ID })
      );
      for (const id of [
        NIGHTSHIFT_BOUND_KI_ONBOARDING_WORKFLOW_ID,
        NIGHTSHIFT_BOUND_DISCOVERY_WORKFLOW_ID,
        NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID,
      ]) {
        expect(fixture.install).toHaveBeenCalledWith(
          SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER,
          id,
          {
            spaceId: SPACE_ID,
            workflowIdSuffix: SPACE_ID,
            values: { serviceAccountId: ACCOUNT_ID },
          }
        );
      }
    });

    it('switches the entry points, the sync and the cleanup on when the space is not paused', async () => {
      const fixture = setup();

      await enable(fixture);

      for (const id of [
        getNightshiftBoundKiOnboardingWorkflowId(SPACE_ID),
        getNightshiftBoundDiscoveryWorkflowId(SPACE_ID),
        getNightshiftBoundKiSyncWorkflowId(SPACE_ID),
        getNightshiftBoundCleanupWorkflowId(SPACE_ID),
      ]) {
        expect(fixture.installed.get(id)).toBe(true);
      }
    });

    it('keeps the scheduled workflows off while the space is paused, and the entry points on', async () => {
      const fixture = setup({ paused: true });

      await enable(fixture);

      expect(fixture.installed.get(getNightshiftBoundKiOnboardingWorkflowId(SPACE_ID))).toBe(true);
      expect(fixture.installed.get(getNightshiftBoundDiscoveryWorkflowId(SPACE_ID))).toBe(true);
      expect(fixture.installed.get(getNightshiftBoundKiSyncWorkflowId(SPACE_ID))).toBe(false);
      expect(fixture.installed.get(getNightshiftBoundCleanupWorkflowId(SPACE_ID))).toBe(false);
    });

    it('installs and switches on the workflows of the settings that are on', async () => {
      const fixture = setup({ continuousOnboardingOn: true, scheduledDiscoveryOn: true });

      await enable(fixture);

      expect(fixture.install).toHaveBeenCalledWith(
        SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER,
        NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
        expect.anything()
      );
      expect(fixture.rebind).toHaveBeenCalledWith(
        expect.objectContaining({ installIfMissing: true })
      );
      for (const id of [
        getNightshiftBoundKiContinuousOnboardingWorkflowId(SPACE_ID),
        getNightshiftBoundScheduledDetectionWorkflowId(SPACE_ID),
        getNightshiftBoundScheduledReviewWorkflowId(SPACE_ID),
      ]) {
        expect(fixture.installed.get(id)).toBe(true);
      }
    });

    it('installs nothing for the settings that are off', async () => {
      const fixture = setup();

      await enable(fixture);

      expect(fixture.install).not.toHaveBeenCalledWith(
        SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER,
        NIGHTSHIFT_BOUND_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
        expect.anything()
      );
      expect(fixture.rebind).toHaveBeenCalledWith(
        expect.objectContaining({ installIfMissing: false })
      );
    });

    it('installs the workflows of the settings that are on but keeps them off while paused', async () => {
      const fixture = setup({
        paused: true,
        continuousOnboardingOn: true,
        scheduledDiscoveryOn: true,
      });

      await enable(fixture);

      for (const id of [
        getNightshiftBoundKiContinuousOnboardingWorkflowId(SPACE_ID),
        getNightshiftBoundScheduledDetectionWorkflowId(SPACE_ID),
        getNightshiftBoundScheduledReviewWorkflowId(SPACE_ID),
      ]) {
        expect(fixture.installed.get(id)).toBe(false);
      }
    });

    it('uses the account the space is bound to when none is given', async () => {
      const fixture = setup({ boundAccountId: 'bound-account-id' });

      const result = await fixture.service.enable({ request, spaceId: SPACE_ID });

      expect(fixture.serviceAccounts.create).not.toHaveBeenCalled();
      expect(result.serviceAccountIds).toEqual({ detectionEngine: 'bound-account-id' });
    });

    it('creates the detection engine account when none is given and the space has none', async () => {
      const fixture = setup({ boundAccountId: '' });

      const result = await fixture.service.enable({ request, spaceId: SPACE_ID });

      expect(fixture.serviceAccounts.create).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          name: 'nightshift_detection_engine',
          roles: ['nightshift_detection_engine'],
        })
      );
      expect(fixture.serviceAccounts.bindWorkload).toHaveBeenCalledWith(
        request,
        expect.objectContaining({ serviceAccountId: 'created-account-id' })
      );
      expect(result.serviceAccountIds).toEqual({ detectionEngine: 'created-account-id' });
    });

    it('tells to pass the account id when an account of that name already exists', async () => {
      const fixture = setup({ boundAccountId: '' });
      fixture.serviceAccounts.create.mockRejectedValue(conflict());

      await expect(fixture.service.enable({ request, spaceId: SPACE_ID })).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringContaining('serviceAccountIds.detectionEngine'),
      });
      expect(fixture.serviceAccounts.bindWorkload).not.toHaveBeenCalled();
    });

    it('is refused with a 400 when service accounts are off, and writes nothing', async () => {
      const fixture = setup({ serviceAccountsEnabled: false });

      await expect(enable(fixture)).rejects.toMatchObject({ statusCode: 400 });
      expect(fixture.serviceAccounts.bindWorkload).not.toHaveBeenCalled();
      expect(fixture.install).not.toHaveBeenCalled();
    });

    it('is refused with a 403 without manage_security, and writes nothing', async () => {
      const fixture = setup({ canManageSecurity: false });

      await expect(enable(fixture)).rejects.toMatchObject({ statusCode: 403 });
      expect(fixture.serviceAccounts.bindWorkload).not.toHaveBeenCalled();
      expect(fixture.install).not.toHaveBeenCalled();
    });
  });

  describe('disable', () => {
    it('pauses the space, switches the entry points off and only then unbinds the account', async () => {
      const fixture = setup();
      await fixture.service.enable({
        request,
        spaceId: SPACE_ID,
        serviceAccountIds: { detectionEngine: ACCOUNT_ID },
      });
      fixture.calls.length = 0;

      const result = await fixture.service.disable({ request, spaceId: SPACE_ID });

      expect(result.pause).toMatchObject({ state: 'paused', partialFailures: [] });
      expect(result.serviceAccountIds).toEqual({ detectionEngine: ACCOUNT_ID });
      expect(fixture.calls).toEqual(['pause', 'stopRuns', 'unbind']);
      for (const id of [
        getNightshiftBoundKiOnboardingWorkflowId(SPACE_ID),
        getNightshiftBoundDiscoveryWorkflowId(SPACE_ID),
      ]) {
        expect(fixture.installed.get(id)).toBe(false);
      }
    });

    it('keeps the setup and names what it could not stop when the pause reports failures', async () => {
      const fixture = setup({
        pauseFailures: [
          { target: 'rule:rule-1', error: 'boom' },
          { target: 'workflow:sync@default', error: 'boom' },
        ],
      });
      await fixture.service.enable({
        request,
        spaceId: SPACE_ID,
        serviceAccountIds: { detectionEngine: ACCOUNT_ID },
      });
      fixture.calls.length = 0;

      await expect(fixture.service.disable({ request, spaceId: SPACE_ID })).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining('rule:rule-1, workflow:sync@default'),
      });

      expect(fixture.calls).toEqual(['pause']);
      expect(fixture.serviceAccounts.unbindWorkload).not.toHaveBeenCalled();
    });

    it('names only the first failures and counts the rest', async () => {
      const fixture = setup({
        pauseFailures: Array.from({ length: 7 }, (_, index) => ({
          target: `rule:rule-${index}`,
          error: 'boom',
        })),
      });

      await expect(fixture.service.disable({ request, spaceId: SPACE_ID })).rejects.toMatchObject({
        message: expect.stringMatching(/rule:rule-4 and 2 more\./),
      });
    });

    it('keeps the workflows installed, so their run history survives', async () => {
      const fixture = setup();
      await fixture.service.enable({
        request,
        spaceId: SPACE_ID,
        serviceAccountIds: { detectionEngine: ACCOUNT_ID },
      });

      await fixture.service.disable({ request, spaceId: SPACE_ID });

      expect(fixture.installed.has(getNightshiftBoundKiOnboardingWorkflowId(SPACE_ID))).toBe(true);
    });
  });
});
