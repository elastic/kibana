/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createSLO } from '../../services/fixtures/slo';
import { toSloDefinitionEbtData } from './build_slo_ebt_data';
import { SLO_RESET_EBT_EVENT_TYPE } from './ebt_event_types';
import type { EventOrigin } from './event_origin';
import { SloTelemetryService } from './slo_telemetry_service';

const origin: EventOrigin = { actor: 'user', channel: 'ui', app: 'slo' };
const data = toSloDefinitionEbtData(createSLO());

describe('SloTelemetryService', () => {
  it('reports the event with the origin of the reporter', () => {
    const analytics = { reportEvent: jest.fn() };
    const service = new SloTelemetryService(analytics, loggingSystemMock.createLogger());

    service.getReporter(origin).report(SLO_RESET_EBT_EVENT_TYPE, () => data);

    expect(analytics.reportEvent).toHaveBeenCalledWith(SLO_RESET_EBT_EVENT_TYPE, {
      ...data,
      origin,
    });
  });

  it('logs and swallows a reporting failure', () => {
    const analytics = {
      reportEvent: jest.fn(() => {
        throw new Error('analytics failure');
      }),
    };
    const logger = loggingSystemMock.createLogger();
    const service = new SloTelemetryService(analytics, logger);

    expect(() =>
      service.getReporter(origin).report(SLO_RESET_EBT_EVENT_TYPE, () => data)
    ).not.toThrow();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(SLO_RESET_EBT_EVENT_TYPE));
  });

  it('logs and swallows a failure to build the event data', () => {
    const analytics = { reportEvent: jest.fn() };
    const logger = loggingSystemMock.createLogger();
    const service = new SloTelemetryService(analytics, logger);

    expect(() =>
      service.getReporter(origin).report(SLO_RESET_EBT_EVENT_TYPE, () => {
        throw new Error('invalid definition');
      })
    ).not.toThrow();
    expect(analytics.reportEvent).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('invalid definition'));
  });
});
