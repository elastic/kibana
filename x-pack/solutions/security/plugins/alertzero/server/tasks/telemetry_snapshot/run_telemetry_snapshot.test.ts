/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { createAnalytics } from '@elastic/ebt/client';
import { loggerMock } from '@kbn/logging-mocks';
import {
  ALERTZERO_ENABLED_SETTING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
} from '@kbn/alertzero-common';
import type { ManagedWorkflowStatusReport } from '@kbn/workflows/server/types';
import { workerRegistry } from '../../managed_workflows/worker_registry';
import { ALERTZERO_TELEMETRY_EVENTS, registerAlertZeroTelemetryEvents } from '../../telemetry';
import { runTelemetrySnapshot } from './run_telemetry_snapshot';
import type { TelemetrySnapshotDependencies } from './types';

const NOW = new Date('2026-09-28T03:00:00.000Z');
const AD_WORKER_ID = SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID;

const createDevAnalytics = () => {
  const analytics = createAnalytics({ isDev: true, logger: loggerMock.create() });
  registerAlertZeroTelemetryEvents(analytics);
  const reportEvent = jest.spyOn(analytics, 'reportEvent');
  return { analytics, reportEvent };
};

const reportedPayloads = (reportEvent: ReturnType<typeof createDevAnalytics>['reportEvent']) =>
  reportEvent.mock.calls.map(([, payload]) => payload as Record<string, unknown>);

const adWorkerValues = (autonomy: 'manual' | 'supervised') => {
  const registration = workerRegistry.get(AD_WORKER_ID);
  if (!registration) {
    throw new Error('the Attack Discovery Worker is not registered');
  }
  const applied = registration.settings.applyPatch(registration.settings.createDefaultValues(), {
    autonomy,
  });
  if ('invalid' in applied) {
    throw new Error(applied.invalid);
  }
  return applied.values;
};

/** The AD Worker is installed in `default` (supervised, enabled) and `space-a` (manual, disabled). */
const INSTALLED_AD_WORKERS: Record<
  string,
  { autonomy: 'manual' | 'supervised'; enabled: boolean }
> = {
  default: { autonomy: 'supervised', enabled: true },
  'space-a': { autonomy: 'manual', enabled: false },
};

const createManagedWorkflows = () => ({
  getInstalledWorkflowState: jest.fn(async (workflowId: string, spaceId: string) => ({
    definitionId: AD_WORKER_ID,
    documentVersion: 1,
    spaceId,
    templateValues: adWorkerValues(INSTALLED_AD_WORKERS[spaceId].autonomy),
    workflowId,
  })),
  getWorkflowStatus: jest.fn(
    async (
      id: string,
      { spaceId }: { spaceId: string }
    ): Promise<
      Pick<ManagedWorkflowStatusReport, 'enabled' | 'installed' | 'status' | 'workflowId'>
    > => {
      const installed = id === AD_WORKER_ID ? INSTALLED_AD_WORKERS[spaceId] : undefined;
      return installed
        ? {
            enabled: installed.enabled,
            installed: true,
            status: installed.enabled ? 'intact' : 'disabled',
            workflowId: `${id}-${spaceId}`,
          }
        : { enabled: null, installed: false, status: 'missing', workflowId: `${id}-${spaceId}` };
    }
  ),
});

const SPACE_SETTINGS: Record<string, Record<string, unknown>> = {
  default: { [ALERTZERO_ENABLED_SETTING_ID]: true },
  'space-a': {
    [ALERTZERO_ENABLED_SETTING_ID]: true,
    'securitySolution:enableAttackDiscoveryWorkflows': true,
  },
  'space-b': {},
};

const createDependencies = (overrides: Partial<TelemetrySnapshotDependencies> = {}) => {
  const { analytics, reportEvent } = createDevAnalytics();
  const managedWorkflows = createManagedWorkflows();
  const getUiSettingsClient = jest.fn((spaceId: string) => ({
    get: jest.fn(async (key: string) => SPACE_SETTINGS[spaceId]?.[key]),
  }));
  const listSpaceIds = jest.fn(async () => ['default', 'space-a', 'space-b']);
  const getManagedWorkflows = jest.fn(async () => managedWorkflows);
  const getAttackDiscoveryWorkflowsEnabled = jest.fn(async () => true);
  const dependencies: TelemetrySnapshotDependencies = {
    analytics,
    getAttackDiscoveryWorkflowsEnabled,
    getManagedWorkflows,
    getUiSettingsClient,
    isOptedIn$: new BehaviorSubject(true),
    listSpaceIds,
    serviceAccountsEnabled: true,
    ...overrides,
  };
  return {
    dependencies,
    getManagedWorkflows,
    getUiSettingsClient,
    listSpaceIds,
    managedWorkflows,
    reportEvent,
  };
};

const run = ({
  dependencies,
  logger = loggerMock.create(),
  now = NOW,
  signal = new AbortController().signal,
  state = {},
}: {
  dependencies: TelemetrySnapshotDependencies;
  logger?: ReturnType<typeof loggerMock.create>;
  now?: Date;
  signal?: AbortSignal;
  state?: { lastSnapshotDay?: string };
}) =>
  runTelemetrySnapshot({
    getDependencies: async () => dependencies,
    logger,
    now,
    signal,
    state,
  });

describe('runTelemetrySnapshot', () => {
  it('reports one cluster-level autonomy snapshot and one feature flags snapshot', async () => {
    const { dependencies, reportEvent } = createDependencies();

    const result = await run({ dependencies });

    expect(reportEvent.mock.calls).toEqual([
      [
        ALERTZERO_TELEMETRY_EVENTS.AutonomySnapshot,
        {
          service_accounts_enabled: true,
          snapshot_day: '2026-09-28',
          space_count: 3,
          workers: [
            { autonomy_level: 'manual', count: 1, enabled: false, worker_id: AD_WORKER_ID },
            { autonomy_level: 'supervised', count: 1, enabled: true, worker_id: AD_WORKER_ID },
          ],
        },
      ],
      [
        ALERTZERO_TELEMETRY_EVENTS.FeatureFlagsSnapshot,
        {
          flags: [
            { enabled_space_count: 2, flag: 'securitySolution:enableAlertZero' },
            { enabled_space_count: 1, flag: 'securitySolution:enableAttackDiscoveryWorkflows' },
            { enabled_space_count: 3, flag: 'securitySolution.attackDiscoveryWorkflowsEnabled' },
          ],
          service_accounts_enabled: true,
          snapshot_day: '2026-09-28',
          space_count: 3,
        },
      ],
    ]);
    // The dev-mode client throws on a payload that does not match its registered schema.
    expect(reportEvent.mock.results.every(({ type }) => type === 'return')).toBe(true);
    expect(result).toEqual({ state: { lastSnapshotDay: '2026-09-28' } });
  });

  it('carries no space ids in any payload', async () => {
    const { dependencies, reportEvent } = createDependencies();

    await run({ dependencies });

    const serialized = JSON.stringify(reportEvent.mock.calls.map(([, payload]) => payload));
    expect(serialized).not.toContain('space-a');
    expect(serialized).not.toContain('space-b');
    expect(serialized).not.toContain('"default"');
  });

  it('reads each space through its own namespace-scoped settings client', async () => {
    const { dependencies, getUiSettingsClient } = createDependencies();

    await run({ dependencies });

    expect(getUiSettingsClient.mock.calls.map(([spaceId]) => spaceId).sort()).toEqual([
      'default',
      'space-a',
      'space-b',
    ]);
  });

  describe('when telemetry is opted out', () => {
    it.each([
      ['opted out', new BehaviorSubject(false)],
      ['without the telemetry plugin', undefined],
    ])('does no Elasticsearch work and reports nothing (%s)', async (_label, isOptedIn$) => {
      const { dependencies, getManagedWorkflows, getUiSettingsClient, listSpaceIds, reportEvent } =
        createDependencies({ isOptedIn$ });

      const result = await run({ dependencies, state: { lastSnapshotDay: '2026-09-27' } });

      expect(listSpaceIds).not.toHaveBeenCalled();
      expect(getManagedWorkflows).not.toHaveBeenCalled();
      expect(getUiSettingsClient).not.toHaveBeenCalled();
      expect(dependencies.getAttackDiscoveryWorkflowsEnabled).not.toHaveBeenCalled();
      expect(reportEvent).not.toHaveBeenCalled();
      expect(result).toEqual({ state: { lastSnapshotDay: '2026-09-27' } });
    });
  });

  describe('when service accounts are off', () => {
    it('reports both snapshots with service_accounts_enabled false, and no workers field', async () => {
      const { dependencies, getManagedWorkflows, reportEvent } = createDependencies({
        serviceAccountsEnabled: false,
      });

      const result = await run({ dependencies });

      expect(reportEvent.mock.calls).toEqual([
        [
          ALERTZERO_TELEMETRY_EVENTS.AutonomySnapshot,
          {
            service_accounts_enabled: false,
            snapshot_day: '2026-09-28',
            space_count: 3,
          },
        ],
        [
          ALERTZERO_TELEMETRY_EVENTS.FeatureFlagsSnapshot,
          {
            flags: [
              { enabled_space_count: 2, flag: 'securitySolution:enableAlertZero' },
              { enabled_space_count: 1, flag: 'securitySolution:enableAttackDiscoveryWorkflows' },
              { enabled_space_count: 3, flag: 'securitySolution.attackDiscoveryWorkflowsEnabled' },
            ],
            service_accounts_enabled: false,
            snapshot_day: '2026-09-28',
            space_count: 3,
          },
        ],
      ]);
      // The dev-mode client throws on a payload that does not match its registered schema.
      expect(reportEvent.mock.results.every(({ type }) => type === 'return')).toBe(true);
      // AlertZero starts no managed workflows client then, so no Worker is read.
      expect(getManagedWorkflows).not.toHaveBeenCalled();
      expect(result).toEqual({ state: { lastSnapshotDay: '2026-09-28' } });
    });

    it('does no Elasticsearch work and reports nothing when telemetry is opted out', async () => {
      const { dependencies, getManagedWorkflows, getUiSettingsClient, listSpaceIds, reportEvent } =
        createDependencies({
          isOptedIn$: new BehaviorSubject(false),
          serviceAccountsEnabled: false,
        });

      const result = await run({ dependencies, state: { lastSnapshotDay: '2026-09-27' } });

      expect(listSpaceIds).not.toHaveBeenCalled();
      expect(getManagedWorkflows).not.toHaveBeenCalled();
      expect(getUiSettingsClient).not.toHaveBeenCalled();
      expect(reportEvent).not.toHaveBeenCalled();
      expect(result).toEqual({ state: { lastSnapshotDay: '2026-09-27' } });
    });
  });

  it('skips a second run on the same UTC day, so a catch-up run never double-reports', async () => {
    const { dependencies, listSpaceIds, reportEvent } = createDependencies();

    const result = await run({ dependencies, state: { lastSnapshotDay: '2026-09-28' } });

    expect(listSpaceIds).not.toHaveBeenCalled();
    expect(reportEvent).not.toHaveBeenCalled();
    expect(result).toEqual({ state: { lastSnapshotDay: '2026-09-28' } });
  });

  it('sends each day once across the runs of a 3-hour schedule', async () => {
    const { dependencies, reportEvent } = createDependencies();
    const runAt = (iso: string, state: { lastSnapshotDay?: string }) =>
      run({ dependencies, now: new Date(iso), state }).then((result) => result.state);

    const hours = ['00', '03', '06', '09', '12', '15', '18', '21'];
    const afterFirstDay = await hours.reduce(
      async (state, hour) => runAt(`2026-09-28T${hour}:30:00.000Z`, await state),
      Promise.resolve({})
    );
    expect(reportEvent).toHaveBeenCalledTimes(2);

    await runAt('2026-09-29T00:30:00.000Z', afterFirstDay);
    expect(reportEvent).toHaveBeenCalledTimes(4);
  });

  it('reports again on the next UTC day', async () => {
    const { dependencies, reportEvent } = createDependencies();

    const result = await run({
      dependencies,
      now: new Date('2026-09-29T00:00:01.000Z'),
      state: { lastSnapshotDay: '2026-09-28' },
    });

    expect(reportEvent).toHaveBeenCalledTimes(2);
    expect(reportedPayloads(reportEvent).map(({ snapshot_day: day }) => day)).toEqual([
      '2026-09-29',
      '2026-09-29',
    ]);
    expect(result).toEqual({ state: { lastSnapshotDay: '2026-09-29' } });
  });

  it('logs a failed read and returns cleanly without reporting or marking the day', async () => {
    const logger = loggerMock.create();
    const { dependencies, reportEvent } = createDependencies({
      listSpaceIds: jest.fn().mockRejectedValue(new Error('es down')),
    });

    const result = await run({ dependencies, logger, state: { lastSnapshotDay: '2026-09-27' } });

    expect(reportEvent).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('es down'));
    expect(result).toEqual({ state: { lastSnapshotDay: '2026-09-27' } });
  });

  describe('when a summary cannot be reported', () => {
    it.each([
      [ALERTZERO_TELEMETRY_EVENTS.AutonomySnapshot],
      [ALERTZERO_TELEMETRY_EVENTS.FeatureFlagsSnapshot],
    ])('does not mark the day when %s fails, and logs it', async (failingEventType) => {
      const logger = loggerMock.create();
      const { dependencies, reportEvent } = createDependencies();
      reportEvent.mockImplementation((eventType) => {
        if (eventType === failingEventType) {
          throw new Error('Attempted to report event type before registering it');
        }
      });

      const result = await run({ dependencies, logger, state: { lastSnapshotDay: '2026-09-27' } });

      expect({
        reported: reportEvent.mock.calls.map(([eventType]) => eventType),
        state: result.state,
        warned: logger.warn.mock.calls.map(([message]) => String(message)),
      }).toEqual({
        reported: [
          ALERTZERO_TELEMETRY_EVENTS.AutonomySnapshot,
          ALERTZERO_TELEMETRY_EVENTS.FeatureFlagsSnapshot,
        ],
        state: { lastSnapshotDay: '2026-09-27' },
        warned: [expect.stringContaining('could not report every summary for 2026-09-28')],
      });
    });

    it('sends both summaries again on the next run of the same day', async () => {
      const { dependencies, reportEvent } = createDependencies();
      reportEvent.mockImplementationOnce(() => {
        throw new Error('Attempted to report event type before registering it');
      });

      const first = await run({ dependencies, state: {} });
      const second = await run({ dependencies, state: first.state });

      expect({
        firstState: first.state,
        reportCalls: reportEvent.mock.calls.length,
        secondState: second.state,
      }).toEqual({
        firstState: {},
        reportCalls: 4,
        secondState: { lastSnapshotDay: '2026-09-28' },
      });
    });
  });

  it('returns cleanly when its dependencies cannot be resolved', async () => {
    const logger = loggerMock.create();

    const result = await runTelemetrySnapshot({
      getDependencies: jest.fn().mockRejectedValue(new Error('not started')),
      logger,
      now: NOW,
      signal: new AbortController().signal,
      state: {},
    });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('not started'));
    expect(result).toEqual({ state: {} });
  });

  it('skips the day when managed workflows are unavailable', async () => {
    const { dependencies, reportEvent } = createDependencies({
      getManagedWorkflows: jest.fn(async () => undefined),
    });

    const result = await run({ dependencies });

    expect(reportEvent).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {} });
  });

  it('leaves a space that cannot be read out of both snapshots', async () => {
    const logger = loggerMock.create();
    const { dependencies, reportEvent } = createDependencies();
    const { getUiSettingsClient } = dependencies;
    dependencies.getUiSettingsClient = (spaceId) =>
      spaceId === 'space-b'
        ? { get: jest.fn().mockRejectedValue(new Error('forbidden')) }
        : getUiSettingsClient(spaceId);

    await run({ dependencies, logger });

    expect(reportedPayloads(reportEvent).map(({ space_count: count }) => count)).toEqual([2, 2]);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('1 of 3 spaces'));
  });

  it('reports nothing when no space can be read', async () => {
    const { dependencies, reportEvent } = createDependencies({
      getUiSettingsClient: () => ({ get: jest.fn().mockRejectedValue(new Error('forbidden')) }),
    });

    const result = await run({ dependencies });

    expect(reportEvent).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {} });
  });

  it('reports nothing once the run is aborted', async () => {
    const controller = new AbortController();
    const { dependencies, reportEvent } = createDependencies({
      listSpaceIds: jest.fn(async () => {
        controller.abort();
        return ['default'];
      }),
    });

    const result = await run({ dependencies, signal: controller.signal });

    expect(reportEvent).not.toHaveBeenCalled();
    expect(result).toEqual({ state: {} });
  });

  describe('logs why a run reports nothing', () => {
    const debugMessages = (logger: ReturnType<typeof loggerMock.create>) =>
      logger.debug.mock.calls.map(([message]) =>
        typeof message === 'function' ? message() : message
      );

    it.each<[string, Partial<TelemetrySnapshotDependencies>, { lastSnapshotDay?: string }, string]>(
      [
        ['opted out', { isOptedIn$: new BehaviorSubject(false) }, {}, 'telemetry is opted out'],
        [
          'already reported',
          {},
          { lastSnapshotDay: '2026-09-28' },
          'already reported for 2026-09-28',
        ],
        [
          'no managed workflows',
          { getManagedWorkflows: jest.fn(async () => undefined) },
          {},
          'managed workflows are unavailable',
        ],
      ]
    )('%s', async (_label, overrides, state, expected) => {
      const logger = loggerMock.create();
      const { dependencies } = createDependencies(overrides);

      await run({ dependencies, logger, state });

      expect(debugMessages(logger)).toEqual([expect.stringContaining(expected)]);
    });

    it('aborted', async () => {
      const logger = loggerMock.create();
      const controller = new AbortController();
      controller.abort();
      const { dependencies } = createDependencies();

      await run({ dependencies, logger, signal: controller.signal });

      expect(debugMessages(logger)).toEqual([expect.stringContaining('aborted before reporting')]);
    });
  });

  it('passes the run signal to the space enumeration', async () => {
    const { dependencies, listSpaceIds } = createDependencies();
    const { signal } = new AbortController();

    await run({ dependencies, signal });

    expect(listSpaceIds).toHaveBeenCalledWith(signal);
  });
});
