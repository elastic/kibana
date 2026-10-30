/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED } from '@kbn/management-settings-ids';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SourceChangeEvent } from '@kbn/nightshift-sources-plugin/server';
import type { ContinuousOnboardingWorkflowService } from '../workflows/continuous_onboarding_workflow';
import { syncContinuousOnboarding } from './sync_continuous_onboarding';

const request = { spaceId: 'space-a' } as KibanaRequest;
const source: NightshiftSource = {
  id: 'source-1',
  title: 'Source 1',
  description: '',
  tags: [],
  esql: 'FROM logs-*',
  type: 'logs',
  slug: 'source-1',
  view_name: '$.nightshift.sources.default.source-1',
  enabled: true,
  created_by: 'user',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  esql_updated_at: '2026-01-01T00:00:00.000Z',
};

const makeEvent = (type: SourceChangeEvent['type']): SourceChangeEvent =>
  (type === 'updated'
    ? { type, source, previous: source, request }
    : { type, source, request }) as SourceChangeEvent;

const setup = ({ total = 1, paused = false }: { total?: number; paused?: boolean } = {}) => {
  const uiSettingsClient = {
    get: jest.fn().mockResolvedValue(false),
    set: jest.fn().mockResolvedValue(undefined),
  };
  const namespaceClient = {};
  const internalSavedObjectsClient = {
    asScopedToNamespace: jest.fn().mockReturnValue(namespaceClient),
  };
  const coreStart = {
    savedObjects: {
      getUnsafeInternalClient: jest.fn().mockReturnValue(internalSavedObjectsClient),
    },
    uiSettings: {
      asScopedToClient: jest.fn().mockReturnValue(uiSettingsClient),
    },
  };
  const sourcesClient = {
    list: jest.fn().mockResolvedValue({ total }),
  };
  const pluginsStart = {
    nightshiftSources: {
      getSourcesClient: jest.fn().mockResolvedValue(sourcesClient),
    },
  };
  const getStartServices = jest.fn().mockResolvedValue({ coreStart, pluginsStart });
  const workflowService = {
    ensureWorkflow: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ContinuousOnboardingWorkflowService>;
  const maintenanceService = {
    getState: jest.fn().mockResolvedValue(paused ? 'paused' : 'enabled'),
    clearContinuousOnboardingRestore: jest.fn().mockResolvedValue(undefined),
  };
  const logger = { warn: jest.fn() } as unknown as Logger;

  type SyncParams = Parameters<typeof syncContinuousOnboarding>[0];
  const run = (event: SourceChangeEvent, overrides: Partial<Omit<SyncParams, 'event'>> = {}) =>
    syncContinuousOnboarding({
      event,
      workflowService,
      maintenanceService,
      getStartServices,
      logger,
      ...overrides,
    });

  return {
    coreStart,
    getStartServices,
    internalSavedObjectsClient,
    maintenanceService,
    pluginsStart,
    run,
    sourcesClient,
    uiSettingsClient,
    workflowService,
  };
};

describe('syncContinuousOnboarding', () => {
  it('skips updated events before reading maintenance state', async () => {
    const { maintenanceService, run } = setup();

    await run(makeEvent('updated'));

    expect(maintenanceService.getState).not.toHaveBeenCalled();
  });

  it('skips when the workflow service is unavailable', async () => {
    const { getStartServices, run } = setup();

    await run(makeEvent('created'), { workflowService: undefined });

    expect(getStartServices).not.toHaveBeenCalled();
  });

  it('skips creates while paused without loading start services', async () => {
    const { getStartServices, run } = setup({ paused: true });

    await run(makeEvent('created'));

    expect(getStartServices).not.toHaveBeenCalled();
  });

  it('clears the restore intent when the last source is deleted while paused', async () => {
    const { maintenanceService, run, sourcesClient, workflowService } = setup({
      paused: true,
      total: 0,
    });

    await run(makeEvent('deleted'));

    expect(sourcesClient.list).toHaveBeenCalledWith({ page: 1, perPage: 1 });
    expect(maintenanceService.clearContinuousOnboardingRestore).toHaveBeenCalledWith({ request });
    expect(workflowService.ensureWorkflow).not.toHaveBeenCalled();
  });

  it('keeps the restore intent when sources remain while paused', async () => {
    const { maintenanceService, run } = setup({ paused: true, total: 1 });

    await run(makeEvent('deleted'));

    expect(maintenanceService.clearContinuousOnboardingRestore).not.toHaveBeenCalled();
  });

  it.each([
    { eventType: 'created' as const, previousEnabled: false, total: 1, enabled: true },
    { eventType: 'deleted' as const, previousEnabled: true, total: 0, enabled: false },
  ])(
    'writes the $eventType transition with the system client scoped to the request space',
    async ({ eventType, previousEnabled, total, enabled }) => {
      const {
        coreStart,
        internalSavedObjectsClient,
        pluginsStart,
        run,
        sourcesClient,
        uiSettingsClient,
        workflowService,
      } = setup({ total });
      uiSettingsClient.get.mockResolvedValue(previousEnabled);

      await run(makeEvent(eventType));

      expect(pluginsStart.nightshiftSources.getSourcesClient).toHaveBeenCalledWith({ request });
      expect(sourcesClient.list).toHaveBeenCalledWith({ page: 1, perPage: 1 });
      expect(coreStart.savedObjects.getUnsafeInternalClient).toHaveBeenCalledWith();
      expect(internalSavedObjectsClient.asScopedToNamespace).toHaveBeenCalledWith(request.spaceId);
      expect(coreStart.uiSettings.asScopedToClient).toHaveBeenCalledWith(
        internalSavedObjectsClient.asScopedToNamespace.mock.results[0].value
      );
      expect(uiSettingsClient.set).toHaveBeenCalledWith(
        OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_ENABLED,
        enabled
      );
      expect(workflowService.ensureWorkflow).toHaveBeenCalledWith({
        enabled,
        request,
        spaceId: request.spaceId,
        waitForRunningExecutions: false,
      });
    }
  );

  it('leaves the setting alone when a create does not produce the first source', async () => {
    const { coreStart, run } = setup({ total: 2 });

    await run(makeEvent('created'));

    expect(coreStart.savedObjects.getUnsafeInternalClient).not.toHaveBeenCalled();
  });
});
