/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import {
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_BUCKET_INTERVAL_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_LOOKBACK_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
} from '@kbn/management-settings-ids';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { SourceChangeEvent } from '@kbn/nightshift-sources-plugin/server';
import { installDiscoveryAgents } from '../../agent_builder/agents/discovery';
import type { SignificantEventsScheduledWorkflowsService } from '../workflows/significant_events_scheduled_workflows';
import { syncScheduledDiscovery } from './sync_scheduled_discovery';

jest.mock('../../agent_builder/agents/discovery', () => ({
  installDiscoveryAgents: jest.fn().mockResolvedValue(undefined),
}));

const installDiscoveryAgentsMock = installDiscoveryAgents as jest.MockedFunction<
  typeof installDiscoveryAgents
>;

const request = { spaceId: 'default' } as KibanaRequest;
const agentBuilder = { agents: { ensure: jest.fn() } } as unknown as AgentBuilderPluginStart;
const source: NightshiftSource = {
  id: 'source-1',
  title: 'Source 1',
  description: '',
  tags: [],
  type: 'logs',
  slug: 'source-1',
  view_name: '$.nightshift.sources.default.source-1',
  esql: 'FROM logs-*',
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

const setup = ({
  total = 1,
  paused = false,
  previousEnabled = false,
  storedInterval = 45,
  storedBucketInterval,
  storedLookback,
  withAgentBuilder = true,
}: {
  total?: number;
  paused?: boolean;
  previousEnabled?: boolean;
  storedInterval?: number;
  storedBucketInterval?: number;
  storedLookback?: number;
  withAgentBuilder?: boolean;
} = {}) => {
  const uiSettingsClient = {
    get: jest.fn().mockResolvedValue(previousEnabled),
    getAll: jest.fn().mockResolvedValue({
      [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES]:
        storedInterval,
      ...(storedBucketInterval === undefined
        ? {}
        : {
            [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_BUCKET_INTERVAL_MINUTES]:
              storedBucketInterval,
          }),
      ...(storedLookback === undefined
        ? {}
        : {
            [OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_LOOKBACK_MINUTES]:
              storedLookback,
          }),
    }),
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
    ...(withAgentBuilder ? { agentBuilder } : {}),
    nightshiftSources: {
      getSourcesClient: jest.fn().mockResolvedValue(sourcesClient),
    },
  };
  const getStartServices = jest.fn().mockResolvedValue({ coreStart, pluginsStart });
  const workflowService = {
    ensureWorkflow: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<SignificantEventsScheduledWorkflowsService>;
  const maintenanceService = {
    getState: jest.fn().mockResolvedValue(paused ? 'paused' : 'enabled'),
    clearScheduledDiscoveryRestore: jest.fn().mockResolvedValue(undefined),
  };
  const logger = { warn: jest.fn() } as unknown as Logger;

  type SyncParams = Parameters<typeof syncScheduledDiscovery>[0];
  const run = (event: SourceChangeEvent, overrides: Partial<Omit<SyncParams, 'event'>> = {}) =>
    syncScheduledDiscovery({
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

describe('syncScheduledDiscovery', () => {
  beforeEach(() => {
    installDiscoveryAgentsMock.mockClear();
  });

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
    const { getStartServices, maintenanceService, run } = setup({ paused: true });

    await run(makeEvent('created'));

    expect(getStartServices).not.toHaveBeenCalled();
    expect(maintenanceService.clearScheduledDiscoveryRestore).not.toHaveBeenCalled();
  });

  it('clears the restore intent when the last source is deleted while paused', async () => {
    const { maintenanceService, run, workflowService } = setup({ paused: true, total: 0 });

    await run(makeEvent('deleted'));

    expect(maintenanceService.clearScheduledDiscoveryRestore).toHaveBeenCalledWith({ request });
    expect(workflowService.ensureWorkflow).not.toHaveBeenCalled();
  });

  it('keeps the restore intent when sources remain while paused', async () => {
    const { maintenanceService, run } = setup({ paused: true, total: 1 });

    await run(makeEvent('deleted'));

    expect(maintenanceService.clearScheduledDiscoveryRestore).not.toHaveBeenCalled();
  });

  it('enables discovery for the first source using stored cadence and the registered defaults', async () => {
    const { coreStart, internalSavedObjectsClient, run, uiSettingsClient, workflowService } = setup(
      { previousEnabled: false, storedInterval: 45 }
    );

    await run(makeEvent('created'));

    expect(coreStart.savedObjects.getUnsafeInternalClient).toHaveBeenCalledWith();
    expect(internalSavedObjectsClient.asScopedToNamespace).toHaveBeenCalledWith(request.spaceId);
    expect(uiSettingsClient.set).toHaveBeenCalledWith(
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
      true
    );
    expect(installDiscoveryAgentsMock).toHaveBeenCalledWith({
      agentBuilder,
      spaceId: request.spaceId,
    });
    expect(workflowService.ensureWorkflow).toHaveBeenCalledWith({
      enabled: true,
      request,
      spaceId: request.spaceId,
      config: expect.objectContaining({
        detectionIntervalMinutes: 45,
        discoveryBatchSize: 3,
      }),
    });
  });

  it('rejects an invalid stored detection window before enabling', async () => {
    const { run, uiSettingsClient, workflowService } = setup({
      previousEnabled: false,
      storedBucketInterval: 7,
      storedLookback: 150,
    });

    await expect(run(makeEvent('created'))).rejects.toThrow(
      'must be an exact multiple of detectionBucketIntervalMinutes'
    );

    expect(uiSettingsClient.set).not.toHaveBeenCalled();
    expect(workflowService.ensureWorkflow).not.toHaveBeenCalled();
  });

  it('leaves an explicit disable in place when sources already exist', async () => {
    const { coreStart, run } = setup({ total: 2, previousEnabled: false });

    await run(makeEvent('created'));

    expect(coreStart.savedObjects.getUnsafeInternalClient).not.toHaveBeenCalled();
    expect(installDiscoveryAgentsMock).not.toHaveBeenCalled();
  });

  it('disables discovery without draining executions when the last source is deleted', async () => {
    const { run, uiSettingsClient, workflowService } = setup({ total: 0, previousEnabled: true });

    await run(makeEvent('deleted'));

    expect(uiSettingsClient.set).toHaveBeenCalledWith(
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
      false
    );
    expect(installDiscoveryAgentsMock).not.toHaveBeenCalled();
    expect(workflowService.ensureWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        skipExecutionDrain: true,
      })
    );
  });

  it('disables discovery when the last source is deleted even if the stored detection window is invalid', async () => {
    const { run, uiSettingsClient, workflowService } = setup({
      total: 0,
      previousEnabled: true,
      storedBucketInterval: 7,
      storedLookback: 150,
    });

    await run(makeEvent('deleted'));

    expect(uiSettingsClient.set).toHaveBeenCalledWith(
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
      false
    );
    expect(workflowService.ensureWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        skipExecutionDrain: true,
      })
    );
  });

  it('rolls the toggle back when enabling fails', async () => {
    const { run, uiSettingsClient, workflowService } = setup({ previousEnabled: false });
    const error = new Error('workflow unavailable');
    workflowService.ensureWorkflow.mockRejectedValue(error);

    await expect(run(makeEvent('created'))).rejects.toBe(error);

    expect(uiSettingsClient.set).toHaveBeenNthCalledWith(
      1,
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
      true
    );
    expect(uiSettingsClient.set).toHaveBeenNthCalledWith(
      2,
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
      false
    );
  });

  it('rolls the toggle back when Agent Builder is unavailable', async () => {
    const { run, uiSettingsClient } = setup({ previousEnabled: false, withAgentBuilder: false });

    await expect(run(makeEvent('created'))).rejects.toThrow(
      'Agent Builder is required to enable significant events scheduled discovery'
    );

    expect(installDiscoveryAgentsMock).not.toHaveBeenCalled();
    expect(uiSettingsClient.set).toHaveBeenNthCalledWith(
      2,
      OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
      false
    );
  });
});
