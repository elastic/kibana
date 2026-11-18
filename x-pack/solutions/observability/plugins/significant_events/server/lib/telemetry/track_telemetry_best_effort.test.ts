/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { trackTelemetryBestEffort } from './track_telemetry_best_effort';

describe('trackTelemetryBestEffort', () => {
  it('logs and swallows a tracking failure', () => {
    const logger = loggerMock.create();

    expect(() =>
      trackTelemetryBestEffort({
        logger,
        description: 'test telemetry',
        track: () => {
          throw new Error('unregistered event type');
        },
      })
    ).not.toThrow();
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to track test telemetry: unregistered event type'
    );
  });
});
