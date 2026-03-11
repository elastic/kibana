/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from '@kbn/core/server/mocks';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import moment from 'moment';
import { GAP_DETECTED_EVENT } from '../../../../telemetry/event_based/events';

import { sendGapDetectedTelemetryEvent } from './send_gap_detected_telemetry_event';
import type { RuleParams } from '../../../rule_schema';

describe('sendGapDetectedTelemetryEvent', () => {
  let mockAnalytics: jest.Mocked<AnalyticsServiceSetup>;
  let mockCore: ReturnType<typeof coreMock.createSetup>;

  beforeEach(() => {
    mockCore = coreMock.createSetup();
    mockAnalytics = mockCore.analytics;
  });

  it('should report correct event data with valid parameters', () => {
    const interval = '5m';
    const gapDuration = moment.duration(10, 'minutes');
    const originalFrom = moment('2023-01-01T00:00:00Z');
    const originalTo = moment('2023-01-01T01:00:00Z');
    const ruleParams = {
      type: 'query',
      ruleSource: { type: 'external', isCustomized: true },
    } as unknown as RuleParams;

    sendGapDetectedTelemetryEvent({
      analytics: mockAnalytics,
      interval,
      gapDuration,
      originalFrom,
      originalTo,
      ruleParams,
    });

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(GAP_DETECTED_EVENT.eventType, {
      gapDuration: 600000, // 10 minutes in milliseconds
      intervalDuration: 300000, // 5 minutes in milliseconds
      intervalAndLookbackDuration: 3600000, // 1 hour in milliseconds
      ruleType: 'query',
      ruleSource: 'external',
      isCustomized: true,
    });
  });

  it('should not report event when interval parsing fails', () => {
    const invalidInterval = 'invalid-interval';
    const gapDuration = moment.duration(10, 'minutes');
    const originalFrom = moment('2023-01-01T00:00:00Z');
    const originalTo = moment('2023-01-01T01:00:00Z');
    const ruleParams = { type: 'query' } as unknown as RuleParams;

    sendGapDetectedTelemetryEvent({
      analytics: mockAnalytics,
      interval: invalidInterval,
      gapDuration,
      originalFrom,
      originalTo,
      ruleParams,
    });

    expect(mockAnalytics.reportEvent).not.toHaveBeenCalled();
  });
});
