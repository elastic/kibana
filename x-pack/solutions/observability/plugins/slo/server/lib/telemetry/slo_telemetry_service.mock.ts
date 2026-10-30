/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SloEbtEventMap, SloEbtEventType } from './ebt_event_types';
import type { SloTelemetryReporter } from './slo_telemetry_service';

export const createSloTelemetryReporterMock = (): jest.Mocked<SloTelemetryReporter> => ({
  report: jest.fn(),
});

export const getReportedEvents = (
  reporter: jest.Mocked<SloTelemetryReporter>
): Array<[SloEbtEventType, SloEbtEventMap[SloEbtEventType]]> =>
  reporter.report.mock.calls.map(([eventType, getData]) => [eventType, getData()]);
