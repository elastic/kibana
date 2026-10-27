/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { analyticsServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createRunInstrumentation } from './reporting';
import { createRunHealthTracker } from './run_health';

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
