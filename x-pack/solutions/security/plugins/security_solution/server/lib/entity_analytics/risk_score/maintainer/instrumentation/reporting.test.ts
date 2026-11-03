/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { analyticsServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createRunInstrumentation } from './reporting';
import { createRunHealthTracker } from './run_health';

it('publishes calculation identity and completed stages before run finalization', () => {
  const setCustomTaskRunEventFields = jest.fn<void, [Record<string, unknown>]>();
  const reporting = createRunInstrumentation({
    logger: loggingSystemMock.createLogger(),
    telemetry: analyticsServiceMock.createAnalyticsServiceSetup(),
    calculationRunId: 'cancelled-calculation',
    namespace: 'default',
    setCustomTaskRunEventFields,
  });
  expect(setCustomTaskRunEventFields).toHaveBeenLastCalledWith({
    calculationRunId: 'cancelled-calculation',
    status: 'running',
    durationMs: expect.any(Number),
    stages: [],
    omittedStages: 0,
  });
  const [initialSnapshot] = setCustomTaskRunEventFields.mock.calls[0];

  const lookup = { stage: 'lookup', status: 'success' as const, durationMs: 10 };
  reporting.reportStage(lookup);
  expect(setCustomTaskRunEventFields).toHaveBeenLastCalledWith(
    expect.objectContaining({ stages: [lookup] })
  );

  const base = { entityType: 'host', stage: 'base', status: 'success' as const, durationMs: 20 };
  const pages = reporting.createPageTimings('host', 'base', {
    profile: false,
    profileInterval: 20,
  });
  pages.startPage();
  reporting.finishStage(base, pages);
  expect(setCustomTaskRunEventFields).toHaveBeenLastCalledWith({
    calculationRunId: 'cancelled-calculation',
    status: 'running',
    durationMs: expect.any(Number),
    stages: [lookup, base],
    omittedStages: 0,
  });
  const [cancellationSnapshot] = setCustomTaskRunEventFields.mock.calls[2];

  reporting.finishRun(createRunHealthTracker().start().stop(), 'aborted');
  expect(setCustomTaskRunEventFields).toHaveBeenLastCalledWith(
    expect.objectContaining({ status: 'aborted', stages: [lookup, base] })
  );
  expect(initialSnapshot).toMatchObject({ status: 'running', stages: [] });
  expect(cancellationSnapshot).toMatchObject({ status: 'running', stages: [lookup, base] });
});

it('correlates every page, sampled profiles, telemetry and the scheduled event', () => {
  const logger = loggingSystemMock.createLogger();
  const telemetry = analyticsServiceMock.createAnalyticsServiceSetup();
  const setCustomTaskRunEventFields = jest.fn();
  const reporting = createRunInstrumentation({
    logger,
    telemetry,
    calculationRunId: 'calculation-1',
    namespace: 'default',
    setCustomTaskRunEventFields,
  });
  const pages = reporting.createPageTimings('host', 'base', { profile: true, profileInterval: 20 });
  for (let page = 1; page <= 101; page++) {
    pages.startPage();
    if (pages.shouldProfile()) pages.recordProfile({ wallMs: 10, rows: 2, tookMs: 5 });
  }
  reporting.finishStage(
    { entityType: 'host', stage: 'base', status: 'success', durationMs: 1000 },
    pages
  );
  reporting.finishRun(createRunHealthTracker().start().stop(), 'success');
  expect(
    logger.info.mock.calls.filter(([message]) => message === 'Risk score page timings')
  ).toHaveLength(101);
  expect(logger.info).toHaveBeenCalledWith(
    'Risk score ES|QL page profile',
    expect.objectContaining({
      risk_score: expect.objectContaining({ calculationRunId: 'calculation-1', page: 101 }),
    })
  );
  expect(telemetry.reportEvent).toHaveBeenCalledWith(
    'risk_score_maintainer_performance',
    expect.objectContaining({
      calculationRunId: 'calculation-1',
      entityType: 'host',
      stage: 'base',
      measurements: expect.arrayContaining([
        { name: 'laterPages.profiles.samples', value: 5, unit: 'count' },
      ]),
    })
  );
  expect(setCustomTaskRunEventFields).toHaveBeenCalledWith(
    expect.objectContaining({
      calculationRunId: 'calculation-1',
      stages: [{ entityType: 'host', stage: 'base', status: 'success', durationMs: 1000 }],
    })
  );
});

it('preserves operation tags through structured logs and telemetry', () => {
  const logger = loggingSystemMock.createLogger();
  const telemetry = analyticsServiceMock.createAnalyticsServiceSetup();
  const reporting = createRunInstrumentation({
    logger,
    telemetry,
    calculationRunId: 'run-2',
    namespace: 'default',
  });
  const pages = reporting.createPageTimings('host', 'base', {
    profile: false,
    profileInterval: 20,
  });
  pages.startPage();
  pages.timeSync(['store', 'write'], () => undefined);
  reporting.finishStage(
    { entityType: 'host', stage: 'base', status: 'success', durationMs: 1 },
    pages
  );
  expect(logger.info).toHaveBeenCalledWith(
    'Risk score page timings',
    expect.objectContaining({
      risk_score: expect.objectContaining({
        steps: [expect.objectContaining({ tags: ['store', 'write'] })],
      }),
    })
  );
  expect(telemetry.reportEvent).toHaveBeenCalledWith(
    'risk_score_maintainer_performance',
    expect.objectContaining({
      measurements: expect.arrayContaining([
        { name: 'firstPage.steps.calls', tags: ['store', 'write'], value: 1, unit: 'count' },
      ]),
    })
  );
});
