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
import { getRuleMock } from '../../../routes/__mocks__/request_responses';
import { getQueryRuleParams, getEqlRuleParams } from '../../../rule_schema/mocks';
import {
  DETECTION_RULE_INSTALL_EVENT,
  DETECTION_RULE_DUPLICATE_EVENT,
} from '../../../../telemetry/event_based/events';
import {
  sendRuleLifecycleTelemetryEvent,
  sendRuleDuplicateTelemetryEvent,
} from './rule_lifecycle_telemetry';

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

describe('sendRuleLifecycleTelemetryEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('reports isPrebuilt false and isCustomized false for an internal rule', () => {
    const analytics = mockAnalytics();
    const rule = { ...getRulesSchemaMock(), rule_source: { type: 'internal' as const } };

    sendRuleLifecycleTelemetryEvent(analytics, DETECTION_RULE_INSTALL_EVENT, rule);

    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    const [eventType, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];

    expect(eventType).toBe(DETECTION_RULE_INSTALL_EVENT.eventType);
    expect(payload).toEqual({
      ruleId: rule.id,
      ruleType: 'query',
      isPrebuilt: false,
      isCustomized: false,
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

    sendRuleLifecycleTelemetryEvent(analytics, DETECTION_RULE_INSTALL_EVENT, rule);

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

    sendRuleLifecycleTelemetryEvent(analytics, DETECTION_RULE_INSTALL_EVENT, rule);

    const [, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];
    expect(payload.isPrebuilt).toBe(true);
    expect(payload.isCustomized).toBe(true);
  });

  test('reports the rule type, e.g. "eql"', () => {
    const analytics = mockAnalytics();
    const rule = { ...getRulesEqlSchemaMock(), rule_source: { type: 'internal' as const } };

    sendRuleLifecycleTelemetryEvent(analytics, DETECTION_RULE_INSTALL_EVENT, rule);

    const [, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];
    expect(payload.ruleType).toBe('eql');
  });

  test('reports under the eventType passed in, e.g. supports multiple lifecycle events', () => {
    const analytics = mockAnalytics();
    const rule = getRulesSchemaMock();

    sendRuleLifecycleTelemetryEvent(analytics, DETECTION_RULE_INSTALL_EVENT, rule);

    const [eventType] = (analytics.reportEvent as jest.Mock).mock.calls[0];
    expect(eventType).toBe('detection_rule_install');
  });

  test('payload contains exactly ruleId, ruleType, isPrebuilt, isCustomized', () => {
    const analytics = mockAnalytics();
    const rule = getRulesSchemaMock();

    sendRuleLifecycleTelemetryEvent(analytics, DETECTION_RULE_INSTALL_EVENT, rule);

    const [, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];
    expect(Object.keys(payload).sort()).toEqual(
      ['isCustomized', 'isPrebuilt', 'ruleId', 'ruleType'].sort()
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
      sendRuleLifecycleTelemetryEvent(analytics, DETECTION_RULE_INSTALL_EVENT, rule, logger);
    }).not.toThrow();

    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(
      `Failed to send ${DETECTION_RULE_INSTALL_EVENT.eventType} telemetry`,
      expect.any(Error)
    );
  });

  test('does not throw when analytics.reportEvent throws and no logger is provided', () => {
    const analytics = mockAnalytics();
    const rule = getRulesSchemaMock();

    (analytics.reportEvent as jest.Mock).mockImplementation(() => {
      throw new Error('Analytics service error');
    });

    expect(() => {
      sendRuleLifecycleTelemetryEvent(analytics, DETECTION_RULE_INSTALL_EVENT, rule);
    }).not.toThrow();
  });
});

describe('sendRuleDuplicateTelemetryEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('reports isPrebuiltSource false and isCustomizedSource false for a rule duplicated from an internal rule', () => {
    const analytics = mockAnalytics();
    const sourceRule = getRuleMock(getQueryRuleParams({ ruleSource: { type: 'internal' } }));
    const createdRule = getRuleMock(getQueryRuleParams(), { id: 'new-rule-id' });

    sendRuleDuplicateTelemetryEvent(analytics, { createdRule, sourceRule });

    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    const [eventType, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];

    expect(eventType).toBe(DETECTION_RULE_DUPLICATE_EVENT.eventType);
    expect(payload).toEqual({
      ruleId: createdRule.id,
      sourceRuleId: sourceRule.id,
      ruleType: 'query',
      isPrebuiltSource: false,
      isCustomizedSource: false,
    });
  });

  test('reports isPrebuiltSource true and isCustomizedSource false when duplicating a non-customized prebuilt rule', () => {
    const analytics = mockAnalytics();
    const sourceRule = getRuleMock(
      getQueryRuleParams({ ruleSource: { type: 'external', isCustomized: false } })
    );
    const createdRule = getRuleMock(getQueryRuleParams(), { id: 'new-rule-id' });

    sendRuleDuplicateTelemetryEvent(analytics, { createdRule, sourceRule });

    const [, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];
    expect(payload.isPrebuiltSource).toBe(true);
    expect(payload.isCustomizedSource).toBe(false);
  });

  test('reports isPrebuiltSource true and isCustomizedSource true when duplicating a customized prebuilt rule', () => {
    const analytics = mockAnalytics();
    const sourceRule = getRuleMock(
      getQueryRuleParams({ ruleSource: { type: 'external', isCustomized: true } })
    );
    const createdRule = getRuleMock(getQueryRuleParams(), { id: 'new-rule-id' });

    sendRuleDuplicateTelemetryEvent(analytics, { createdRule, sourceRule });

    const [, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];
    expect(payload.isPrebuiltSource).toBe(true);
    expect(payload.isCustomizedSource).toBe(true);
  });

  test('reports the source rule type, e.g. "eql"', () => {
    const analytics = mockAnalytics();
    const sourceRule = getRuleMock(getEqlRuleParams({ ruleSource: { type: 'internal' } }));
    const createdRule = getRuleMock(getQueryRuleParams(), { id: 'new-rule-id' });

    sendRuleDuplicateTelemetryEvent(analytics, { createdRule, sourceRule });

    const [, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];
    expect(payload.ruleType).toBe('eql');
  });

  test('uses the id of the created rule and the id of the source rule', () => {
    const analytics = mockAnalytics();
    const sourceRule = getRuleMock(getQueryRuleParams({ ruleSource: { type: 'internal' } }), {
      id: 'source-rule-id',
    });
    const createdRule = getRuleMock(getQueryRuleParams(), { id: 'created-rule-id' });

    sendRuleDuplicateTelemetryEvent(analytics, { createdRule, sourceRule });

    const [, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];
    expect(payload.ruleId).toBe('created-rule-id');
    expect(payload.sourceRuleId).toBe('source-rule-id');
  });

  test('payload contains exactly ruleId, sourceRuleId, ruleType, isPrebuiltSource, isCustomizedSource', () => {
    const analytics = mockAnalytics();
    const sourceRule = getRuleMock(getQueryRuleParams({ ruleSource: { type: 'internal' } }));
    const createdRule = getRuleMock(getQueryRuleParams());

    sendRuleDuplicateTelemetryEvent(analytics, { createdRule, sourceRule });

    const [, payload] = (analytics.reportEvent as jest.Mock).mock.calls[0];
    expect(Object.keys(payload).sort()).toEqual(
      ['isCustomizedSource', 'isPrebuiltSource', 'ruleId', 'ruleType', 'sourceRuleId'].sort()
    );
  });

  test('does not throw and logs via logger.debug when analytics.reportEvent throws', () => {
    const analytics = mockAnalytics();
    const logger = mockLogger();
    const sourceRule = getRuleMock(getQueryRuleParams({ ruleSource: { type: 'internal' } }));
    const createdRule = getRuleMock(getQueryRuleParams());

    (analytics.reportEvent as jest.Mock).mockImplementation(() => {
      throw new Error('Analytics service error');
    });

    expect(() => {
      sendRuleDuplicateTelemetryEvent(analytics, { createdRule, sourceRule }, logger);
    }).not.toThrow();

    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(
      'Failed to send detection rule duplicate telemetry',
      expect.any(Error)
    );
  });

  test('does not throw when analytics.reportEvent throws and no logger is provided', () => {
    const analytics = mockAnalytics();
    const sourceRule = getRuleMock(getQueryRuleParams({ ruleSource: { type: 'internal' } }));
    const createdRule = getRuleMock(getQueryRuleParams());

    (analytics.reportEvent as jest.Mock).mockImplementation(() => {
      throw new Error('Analytics service error');
    });

    expect(() => {
      sendRuleDuplicateTelemetryEvent(analytics, { createdRule, sourceRule });
    }).not.toThrow();
  });
});
