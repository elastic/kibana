/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import {
  getNightshiftBoundCleanupWorkflowId,
  getNightshiftBoundDiscoveryWorkflowId,
  getNightshiftBoundKiOnboardingWorkflowId,
  getNightshiftBoundKiSyncWorkflowId,
  NIGHTSHIFT_BOUND_CLEANUP_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_DISCOVERY_WORKFLOW_ID,
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
}: {
  serviceAccountsEnabled?: boolean;
  canManageSecurity?: boolean;
  paused?: boolean;
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
    getWorkloadBinding: jest.fn(async () => ({ serviceAccountId: ACCOUNT_ID })),
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
      return { state: 'paused' };
    }),
  };
  const getScopedClients = jest.fn(async () => ({
    uiSettingsClient: { getAll: jest.fn(async () => ({})), get: jest.fn(async () => false) },
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
    scheduledWorkflowsService: { rebind: jest.fn() },
  } as never);

  return { service, calls, installed, install, serviceAccounts, management, maintenanceService };
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

      expect(result.pause).toEqual({ state: 'paused' });
      expect(fixture.calls).toEqual(['pause', 'stopRuns', 'unbind']);
      for (const id of [
        getNightshiftBoundKiOnboardingWorkflowId(SPACE_ID),
        getNightshiftBoundDiscoveryWorkflowId(SPACE_ID),
      ]) {
        expect(fixture.installed.get(id)).toBe(false);
      }
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
