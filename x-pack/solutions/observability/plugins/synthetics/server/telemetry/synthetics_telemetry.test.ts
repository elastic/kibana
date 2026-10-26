/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { ERROR_THROTTLE_MS } from './error_noise';
import { SyntheticsTelemetry } from './synthetics_telemetry';
import type { MonitorErrorEvent } from './types';

const errorEvent: MonitorErrorEvent = {
  type: 'invalidApiKey',
  message: 'bad key',
  stackVersion: '9.5.0',
};

describe('SyntheticsTelemetry', () => {
  const setup = () => {
    const { analytics } = coreMock.createSetup();
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    return { analytics, logger, esClient, telemetry: new SyntheticsTelemetry(analytics, logger) };
  };

  it('adds the license holder to reported events', async () => {
    const { analytics, esClient, telemetry } = setup();
    esClient.license.get.mockResolvedValue({ license: { issued_to: 'Acme' } } as never);

    await telemetry.loadLicenseInfo(esClient);
    telemetry.reportEvent('synthetics_monitor_error', errorEvent);

    expect(analytics.reportEvent).toHaveBeenCalledWith('synthetics_monitor_error', {
      ...errorEvent,
      issuedTo: 'Acme',
    });
  });

  it('still reports events when the license cannot be fetched', async () => {
    const { analytics, esClient, telemetry } = setup();
    esClient.license.get.mockRejectedValue(new Error('nope'));

    await telemetry.loadLicenseInfo(esClient);
    telemetry.reportEvent('synthetics_monitor_error', errorEvent);

    expect(analytics.reportEvent).toHaveBeenCalledWith('synthetics_monitor_error', {
      ...errorEvent,
      issuedTo: undefined,
    });
  });

  describe('shouldReportError', () => {
    it('allows an error once per hour and again after the window', () => {
      const { telemetry } = setup();
      const start = 1_000_000;

      expect(telemetry.shouldReportError(errorEvent, start)).toBe(true);
      expect(telemetry.shouldReportError(errorEvent, start + ERROR_THROTTLE_MS - 1)).toBe(false);
      expect(telemetry.shouldReportError(errorEvent, start + ERROR_THROTTLE_MS)).toBe(true);
    });

    it('forgets expired errors the next time any error is reported', () => {
      const { telemetry } = setup();

      telemetry.shouldReportError(errorEvent, 0);
      telemetry.shouldReportError({ ...errorEvent, message: 'other' }, ERROR_THROTTLE_MS);

      expect(telemetry.shouldReportError(errorEvent, ERROR_THROTTLE_MS)).toBe(true);
    });

    it('throttles each error type and message independently', () => {
      const { telemetry } = setup();

      expect(telemetry.shouldReportError(errorEvent, 0)).toBe(true);
      expect(telemetry.shouldReportError({ ...errorEvent, message: 'other' }, 0)).toBe(true);
      expect(telemetry.shouldReportError({ ...errorEvent, type: 'syncError' }, 0)).toBe(true);
    });
  });
});
