/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ALERTZERO_TELEMETRY_EVENTS } from './constants';
import type { AlertZeroWorkerInvestigationClosedPayload } from './event_types';
import { createAlertZeroTelemetryReporter, safeReportEvent } from './safe_report_event';

const payload: AlertZeroWorkerInvestigationClosedPayload = {
  autonomy_level: 'manual',
  autonomy_mode: 'gated',
  close_reason: 'false_positive',
  execution_id: 'c5d0e2a9-3b7e-4c61-8f2d-6a9b0e4d7f21',
  investigation_id: '5f0c3c8e-2d51-4b8a-9e0f-7c1d2b3a4e5f',
  is_default_space: true,
  run_id: '0b6a1f4e-8c43-4a39-9a4e-1f7f5f3f9c10',
  trigger_type: 'scheduled',
  watch_tag: 'watch-floor',
  worker_id: 'system-security-floor-attack-discovery',
};

const EVENT_TYPE = ALERTZERO_TELEMETRY_EVENTS.WorkerInvestigationClosed;

const createDeps = () => ({
  analytics: coreMock.createSetup().analytics,
  logger: loggingSystemMock.createLogger(),
});

type Deps = ReturnType<typeof createDeps>;

const createThrowingDeps = (thrown: unknown): Deps => {
  const deps = createDeps();
  deps.analytics.reportEvent.mockImplementation(() => {
    throw thrown;
  });
  return deps;
};

/** Calls `safeReportEvent` with `deps`, returning them alongside its result. */
const report = (deps: Deps = createDeps()): Deps & { reported: boolean } => ({
  ...deps,
  reported: safeReportEvent({ ...deps, eventType: EVENT_TYPE, payload }),
});

describe('safeReportEvent', () => {
  it('reports the event type and payload through core analytics', () => {
    const { analytics } = report();

    expect(analytics.reportEvent).toHaveBeenCalledWith(EVENT_TYPE, payload);
  });

  it('does not throw when reportEvent throws', () => {
    const deps = createThrowingDeps(
      new Error('Attempted to report event type before registering it')
    );

    expect(() => report(deps)).not.toThrow();
  });

  it('logs the failure lazily at debug level', () => {
    const { logger } = report(createThrowingDeps(new Error('boom')));

    expect(logger.debug).toHaveBeenCalledWith(expect.any(Function));
  });

  it.each<{ detail: string; thrown: unknown; title: string }>([
    {
      detail: 'boom',
      thrown: new Error('boom'),
      title: 'names the event type and the error in the debug message',
    },
    {
      detail: 'not an error',
      thrown: 'not an error',
      title: 'describes a non-Error throw in the debug message',
    },
  ])('$title', ({ detail, thrown }) => {
    const { logger } = report(createThrowingDeps(thrown));
    const message = (logger.debug.mock.calls[0][0] as () => string)();

    expect(message).toBe(`Failed to report telemetry event ${EVENT_TYPE}: ${detail}`);
  });

  it.each([
    { createScenarioDeps: createDeps, expected: true, scenario: 'the event is reported' },
    {
      createScenarioDeps: () => createThrowingDeps(new Error('boom')),
      expected: false,
      scenario: 'reportEvent throws',
    },
  ])('returns $expected when $scenario', ({ createScenarioDeps, expected }) => {
    const { reported } = report(createScenarioDeps());

    expect(reported).toBe(expected);
  });

  it('does not log when the event is reported', () => {
    const { logger } = report();

    expect(logger.debug).not.toHaveBeenCalled();
  });
});

describe('createAlertZeroTelemetryReporter', () => {
  it('returns a reporter bound to the analytics service', () => {
    const { analytics, logger } = createDeps();
    const reportEvent = createAlertZeroTelemetryReporter({ analytics, logger });

    reportEvent(EVENT_TYPE, payload);

    expect(analytics.reportEvent).toHaveBeenCalledWith(EVENT_TYPE, payload);
  });

  it('returns a reporter that never throws', () => {
    const reportEvent = createAlertZeroTelemetryReporter(createThrowingDeps(new Error('boom')));

    expect(() => reportEvent(EVENT_TYPE, payload)).not.toThrow();
  });

  it('returns a reporter that tells whether the event was reported', () => {
    const reportEvent = createAlertZeroTelemetryReporter(createDeps());

    expect(reportEvent(EVENT_TYPE, payload)).toBe(true);
  });
});
