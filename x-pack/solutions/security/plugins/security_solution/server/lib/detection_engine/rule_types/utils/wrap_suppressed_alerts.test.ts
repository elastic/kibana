/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wrapSuppressedAlerts } from './wrap_suppressed_alerts';

import {
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_INSTANCE_ID,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
} from '@kbn/rule-data-utils';

import type { CompleteRule, ThreatRuleParams } from '../../rule_schema';
import { transformHitToAlert } from '../factories/utils/transform_hit_to_alert';

import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';

jest.mock('../factories/utils/transform_hit_to_alert', () => ({ transformHitToAlert: jest.fn() }));

const transformHitToAlertMock = transformHitToAlert as jest.Mock;

const ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();

const completeRuleMock: CompleteRule<ThreatRuleParams> = {
  ruleConfig: {
    name: 'ALert suppression IM test rule',
    tags: [],
    consumer: 'siem',
    schedule: {
      interval: '30m',
    },
    enabled: true,
    actions: [],
    id: 'c1436b3e-e2a6-412a-92ff-ef7e86b926fe',
    createdAt: new Date('2024-01-29T13:16:55.678Z'),
    createdBy: 'elastic',
    producer: 'preview-producer',
    revision: 0,
    ruleTypeId: 'siem.indicatorRule',
    ruleTypeName: 'Indicator Match Rule',
    updatedAt: new Date('2024-01-29T13:16:55.678Z'),
    updatedBy: 'elastic',
    muteAll: false,
    snoozeSchedule: [],
  },
  ruleParams: {
    author: [],
    description: 'Tests a simple query',
    ruleId: 'threat-match-rule',
    falsePositives: [],
    from: 'now-35m',
    immutable: false,
    outputIndex: '',
    maxSignals: 100,
    riskScore: 1,
    riskScoreMapping: [],
    severity: 'high',
    severityMapping: [],
    threat: [],
    to: 'now',
    references: [],
    version: 1,
    exceptionsList: [],
    relatedIntegrations: [],
    requiredFields: [],
    setup: '',
    type: 'threat_match',
    language: 'kuery',
    index: ['ecs_compliant'],
    query: 'id:a517ae81-eb16-4232-a794-aa81f0ed0302 and NOT agent.type:threat',
    threatQuery: 'id:a517ae81-eb16-4232-a794-aa81f0ed0302 and agent.type:threat',
    threatMapping: [
      {
        entries: [
          {
            field: 'host.name',
            type: 'mapping',
            value: 'host.name',
          },
        ],
      },
    ],
    threatLanguage: 'kuery',
    threatIndex: ['ecs_compliant'],
    threatIndicatorPath: 'threat.indicator',
    alertSuppression: {
      groupBy: ['host.name'],
      missingFieldsStrategy: 'suppress',
    },
  },
  alertId: 'c1436b3e-e2a6-412a-92ff-ef7e86b926fe',
};

const wrappedParams = {
  spaceId: 'default',
  completeRule: {
    ...completeRuleMock,
    ruleParams: {
      ...completeRuleMock.ruleParams,
      alertSuppression: {
        groupBy: ['agent.name', 'user.name'],
      },
    },
  },
  mergeStrategy: 'missingFields' as const,
  indicesToQuery: ['test*'],
  buildReasonMessage: () => 'mock',
  alertTimestampOverride: undefined,
  ruleExecutionLogger,
  publicBaseUrl: 'public-url-mock',
  primaryTimestamp: '@timestamp',
  secondaryTimestamp: 'event.ingested',
  intendedTimestamp: undefined,
};

describe('wrapSuppressedAlerts', () => {
  transformHitToAlertMock.mockReturnValue({ 'mock-props': true });

  it('should wrap event with alert fields and correctly set suppression fields', () => {
    const expectedTimestamp = '2020-10-28T06:30:00.000Z';
    const wrappedAlerts = wrapSuppressedAlerts({
      events: [
        {
          fields: {
            '@timestamp': [expectedTimestamp],
            'agent.name': ['agent-0'],
            'user.name': ['user-1', 'user-2'],
          },
          _id: '1',
          _index: 'test*',
        },
      ],
      ...wrappedParams,
    });

    expect(transformHitToAlertMock).toHaveBeenCalledWith({
      spaceId: 'default',
      completeRule: wrappedParams.completeRule,
      doc: {
        fields: {
          '@timestamp': [expectedTimestamp],
          'agent.name': ['agent-0'],
          'user.name': ['user-1', 'user-2'],
        },
        _id: '1',
        _index: 'test*',
      },
      mergeStrategy: 'missingFields',
      ignoreFields: {},
      ignoreFieldsRegexes: [],
      applyOverrides: true,
      buildReasonMessage: wrappedParams.buildReasonMessage,
      indicesToQuery: ['test*'],
      alertTimestampOverride: undefined,
      ruleExecutionLogger,
      alertUuid: expect.any(String),
      publicBaseUrl: 'public-url-mock',
    });
    expect(wrappedAlerts[0]._source).toEqual(
      expect.objectContaining({
        [ALERT_SUPPRESSION_TERMS]: [
          {
            field: 'agent.name',
            value: ['agent-0'],
          },
          {
            field: 'user.name',
            value: ['user-1', 'user-2'],
          },
        ],
        [ALERT_SUPPRESSION_START]: new Date(expectedTimestamp),
        [ALERT_SUPPRESSION_END]: new Date(expectedTimestamp),
        [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
        'mock-props': true,
      })
    );
  });

  it('should set instance id of the same value for unsorted identical arrays', () => {
    const expectedTimestamp = '2020-10-28T06:30:00.000Z';
    const wrappedAlerts = wrapSuppressedAlerts({
      events: [
        {
          fields: {
            '@timestamp': [expectedTimestamp],
            'agent.name': ['agent-0'],
            'user.name': ['user-1', 'user-2'],
          },
          _id: '1',
          _index: 'test*',
        },
        {
          fields: {
            '@timestamp': [expectedTimestamp],
            'agent.name': ['agent-0'],
            'user.name': ['user-2', 'user-1'],
          },
          _id: '1',
          _index: 'test*',
        },
      ],
      ...wrappedParams,
    });

    expect(wrappedAlerts[0]._source[ALERT_INSTANCE_ID]).toBe(
      wrappedAlerts[1]._source[ALERT_INSTANCE_ID]
    );
  });
  it('should set suppression boundaries from secondary timestamp event.ingested if primary is absent', () => {
    const expectedTimestamp = '2020-10-28T06:30:00.000Z';
    const wrappedAlerts = wrapSuppressedAlerts({
      events: [
        {
          fields: {
            'agent.name': ['agent-0'],
            'user.name': ['user-1', 'user-2'],
            'event.ingested': expectedTimestamp,
          },
          _id: '1',
          _index: 'test*',
        },
      ],
      ...wrappedParams,
    });

    expect(wrappedAlerts[0]._source).toEqual(
      expect.objectContaining({
        [ALERT_SUPPRESSION_START]: new Date(expectedTimestamp),
        [ALERT_SUPPRESSION_END]: new Date(expectedTimestamp),
      })
    );
  });
});
