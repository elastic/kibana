/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { PND_INCIDENT_CLOSED_TRIGGER_ID } from '@kbn/pnd-common';

import { warnUnlessEmitted } from '.';

const defaultParams = {
  sourceId: 'system-security-watch-floor:run-1:step-exec-1',
  triggerId: PND_INCIDENT_CLOSED_TRIGGER_ID,
};

describe('warnUnlessEmitted', () => {
  it('stays silent when the signal fired', () => {
    const logger = loggerMock.create();

    warnUnlessEmitted({
      ...defaultParams,
      logger,
      result: { status: 'fulfilled', value: { emitted: true } },
    });

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns once when the signal did not fire', () => {
    const logger = loggerMock.create();

    warnUnlessEmitted({
      ...defaultParams,
      logger,
      result: { status: 'fulfilled', value: { emitted: false, reason: 'emit_failed' } },
    });

    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('names the proposal the analyst acted on', () => {
    const logger = loggerMock.create();

    warnUnlessEmitted({
      ...defaultParams,
      logger,
      result: { status: 'fulfilled', value: { emitted: false, reason: 'emit_failed' } },
    });

    expect(loggerMock.collect(logger).warn).toEqual([
      [expect.stringContaining(defaultParams.sourceId)],
    ]);
  });

  it('names the trigger that did not fire', () => {
    const logger = loggerMock.create();

    warnUnlessEmitted({
      ...defaultParams,
      logger,
      result: { status: 'fulfilled', value: { emitted: false, reason: 'emit_failed' } },
    });

    expect(loggerMock.collect(logger).warn).toEqual([
      [expect.stringContaining(PND_INCIDENT_CLOSED_TRIGGER_ID)],
    ]);
  });

  it('names the reason the signal did not fire', () => {
    const logger = loggerMock.create();

    warnUnlessEmitted({
      ...defaultParams,
      logger,
      result: {
        status: 'fulfilled',
        value: { emitted: false, reason: 'missing_attack_discovery_alert_id' },
      },
    });

    expect(loggerMock.collect(logger).warn).toEqual([
      [expect.stringContaining('missing_attack_discovery_alert_id')],
    ]);
  });

  it('reports a helper that regressed to throwing, rather than letting it reach the route', () => {
    const logger = loggerMock.create();

    warnUnlessEmitted({
      ...defaultParams,
      logger,
      result: { reason: new Error('helper threw'), status: 'rejected' },
    });

    expect(loggerMock.collect(logger).warn).toEqual([[expect.stringContaining('emit_threw')]]);
  });

  it('carries the thrown message, so the regression is diagnosable', () => {
    const logger = loggerMock.create();

    warnUnlessEmitted({
      ...defaultParams,
      logger,
      result: { reason: new Error('helper threw'), status: 'rejected' },
    });

    expect(loggerMock.collect(logger).warn).toEqual([[expect.stringContaining('helper threw')]]);
  });

  it('handles a non-Error rejection', () => {
    const logger = loggerMock.create();

    warnUnlessEmitted({
      ...defaultParams,
      logger,
      result: { reason: 'a string', status: 'rejected' },
    });

    expect(loggerMock.collect(logger).warn).toEqual([[expect.stringContaining('a string')]]);
  });
});
