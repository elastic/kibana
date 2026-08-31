/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import {
  getRulesSchemaMock,
  getRulesEqlSchemaMock,
} from '../../../../../../common/api/detection_engine/model/rule_schema/rule_response_schema.mock';
import {
  DETECTION_RULE_RESTORE_EVENT,
  DETECTION_RULE_RESTORE_ERROR_EVENT,
} from '../../../../telemetry/event_based/events';
import {
  sendRuleRestoreTelemetryEvent,
  sendRuleRestoreErrorTelemetryEvent,
} from './restore_telemetry';

const mockAnalytics = (): AnalyticsServiceSetup =>
  ({ reportEvent: jest.fn() } as unknown as AnalyticsServiceSetup);

const mockLogger = (): Logger =>
  ({
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger);

describe('sendRuleRestoreTelemetryEvent', () => {
  const restoredRevisionTimestamp = '2020-02-19T03:57:54.037Z';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('reports isPrebuilt false and isCustomized false for an internal rule', () => {
    const analytics = mockAnalytics();
    const rule = { ...getRulesSchemaMock(), rule_source: { type: 'internal' as const } };

    sendRuleRestoreTelemetryEvent(analytics, { rule, restoredRevisionTimestamp });

    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    const [eventType, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];

    expect(eventType).toBe(DETECTION_RULE_RESTORE_EVENT.eventType);
    expect(payload).toEqual({
      ruleId: rule.id,
      ruleType: 'query',
      isPrebuilt: false,
      isCustomized: false,
      restoredRevisionTimestamp,
    });
  });

  test('reports isPrebuilt true and isCustomized false for a non-customized prebuilt rule', () => {
    const analytics = mockAnalytics();
    const rule = {
      ...getRulesSchemaMock(),
      rule_source: {
        type: 'external' as const,
        is_customized: false,
        has_base_version: true,
        customized_fields: [],
      },
    };

    sendRuleRestoreTelemetryEvent(analytics, { rule, restoredRevisionTimestamp });

    const [, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];
    expect(payload.isPrebuilt).toBe(true);
    expect(payload.isCustomized).toBe(false);
  });

  test('reports isPrebuilt true and isCustomized true for a customized prebuilt rule', () => {
    const analytics = mockAnalytics();
    const rule = {
      ...getRulesSchemaMock(),
      rule_source: {
        type: 'external' as const,
        is_customized: true,
        has_base_version: true,
        customized_fields: [],
      },
    };

    sendRuleRestoreTelemetryEvent(analytics, { rule, restoredRevisionTimestamp });

    const [, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];
    expect(payload.isPrebuilt).toBe(true);
    expect(payload.isCustomized).toBe(true);
  });

  test('reports the rule type, e.g. "eql", from the restored rule', () => {
    const analytics = mockAnalytics();
    const rule = { ...getRulesEqlSchemaMock(), rule_source: { type: 'internal' as const } };

    sendRuleRestoreTelemetryEvent(analytics, { rule, restoredRevisionTimestamp });

    const [, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];
    expect(payload.ruleType).toBe('eql');
  });

  test('payload contains exactly ruleId, ruleType, isPrebuilt, isCustomized, restoredRevisionTimestamp', () => {
    const analytics = mockAnalytics();
    const rule = getRulesSchemaMock();

    sendRuleRestoreTelemetryEvent(analytics, { rule, restoredRevisionTimestamp });

    const [, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];
    expect(Object.keys(payload).sort()).toEqual(
      ['isCustomized', 'isPrebuilt', 'restoredRevisionTimestamp', 'ruleId', 'ruleType'].sort()
    );
  });

  test('does not throw and logs via logger.debug when analytics.reportEvent throws', () => {
    const analytics = mockAnalytics();
    const logger = mockLogger();
    const rule = getRulesSchemaMock();

    (analytics.reportEvent as jest.Mock).mockImplementation(() => {
      throw new Error('Analytics service error');
    });

    expect(() => {
      sendRuleRestoreTelemetryEvent(analytics, { rule, restoredRevisionTimestamp }, logger);
    }).not.toThrow();

    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(
      'Failed to send detection rule restore telemetry',
      expect.any(Error)
    );
  });
});

describe('sendRuleRestoreErrorTelemetryEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('reports the conflict status and error details', () => {
    const analytics = mockAnalytics();

    sendRuleRestoreErrorTelemetryEvent(analytics, {
      ruleId: 'rule-1',
      changeId: 'change-1',
      status: 'conflict',
      errorMessage: 'Rule has been modified since the changeId revision',
    });

    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    const [eventType, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];

    expect(eventType).toBe(DETECTION_RULE_RESTORE_ERROR_EVENT.eventType);
    expect(payload).toEqual({
      ruleId: 'rule-1',
      changeId: 'change-1',
      status: 'conflict',
      errorMessage: 'Rule has been modified since the changeId revision',
    });
  });

  test('reports the error status', () => {
    const analytics = mockAnalytics();

    sendRuleRestoreErrorTelemetryEvent(analytics, {
      ruleId: 'rule-1',
      changeId: 'change-1',
      status: 'error',
      errorMessage: 'cluster_block_exception',
    });

    const [, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];
    expect(payload.status).toBe('error');
  });

  test('does not throw and logs via logger.debug when analytics.reportEvent throws', () => {
    const analytics = mockAnalytics();
    const logger = mockLogger();

    (analytics.reportEvent as jest.Mock).mockImplementation(() => {
      throw new Error('Analytics service error');
    });

    expect(() => {
      sendRuleRestoreErrorTelemetryEvent(
        analytics,
        { ruleId: 'rule-1', changeId: 'change-1', status: 'error', errorMessage: 'boom' },
        logger
      );
    }).not.toThrow();

    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(
      'Failed to send detection rule restore error telemetry',
      expect.any(Error)
    );
  });
});
