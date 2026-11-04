/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import {
  ALERT_END,
  ALERT_GROUP,
  ALERT_GROUP_FIELD,
  ALERT_GROUP_VALUE,
  ALERT_INDEX_PATTERN,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_TYPE_ID,
  ALERT_START,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import { investigationSeedFromAlert } from './investigation_seed_from_alert';

describe('investigationSeedFromAlert', () => {
  it('copies the alert window and the service entity', () => {
    const seed = investigationSeedFromAlert({
      fields: {
        [ALERT_UUID]: 'alert-1',
        [ALERT_RULE_TYPE_ID]: 'apm.threshold',
        [ALERT_START]: '2026-11-02T11:00:00.000Z',
        [ALERT_END]: '2026-11-02T12:00:00.000Z',
        'service.name': ['checkout'],
        'service.environment': 'prod',
      },
    });

    expect(seed).toEqual({
      origin: { app: 'alerts', alertId: 'alert-1', ruleTypeId: 'apm.threshold' },
      timeRange: { from: '2026-11-02T11:00:00.000Z', to: '2026-11-02T12:00:00.000Z' },
      filters: [],
      entities: { 'service.name': 'checkout', 'service.environment': 'prod' },
    });
  });

  it('keeps an APM index pattern out of the seed', () => {
    const seed = investigationSeedFromAlert({
      fields: {
        [ALERT_UUID]: 'alert-apm',
        [ALERT_RULE_TYPE_ID]: 'apm.transaction_duration',
        [ALERT_START]: '2026-11-02T11:00:00.000Z',
        [ALERT_END]: '2026-11-02T12:00:00.000Z',
        [ALERT_INDEX_PATTERN]: 'metrics-apm*,apm-*',
      },
    });

    expect(seed?.indexPattern).toBeUndefined();
    expect(seed?.dataViewId).toBeUndefined();
    expect(seed?.origin).toEqual({
      app: 'alerts',
      alertId: 'alert-apm',
      ruleTypeId: 'apm.transaction_duration',
    });
  });

  it('extracts a saved data view and count metric from custom threshold alerts', () => {
    const seed = investigationSeedFromAlert({
      fields: {
        [ALERT_UUID]: 'alert-2',
        [ALERT_RULE_TYPE_ID]: 'observability.rules.custom_threshold',
        [ALERT_START]: '2026-11-02T11:00:00.000Z',
        [ALERT_END]: '2026-11-02T11:20:00.000Z',
        [ALERT_INDEX_PATTERN]: 'metrics-*',
        [ALERT_RULE_PARAMETERS]: {
          searchConfiguration: { index: 'logs-view' },
          criteria: [{ metrics: [{ aggType: 'count' }], timeSize: 5, timeUnit: 'm' }],
        },
      },
    });

    expect(seed).toEqual({
      origin: {
        app: 'alerts',
        alertId: 'alert-2',
        ruleTypeId: 'observability.rules.custom_threshold',
        alertEnd: '2026-11-02T11:20:00.000Z',
        lookback: { timeSize: 5, timeUnit: 'm' },
      },
      timeRange: { from: '2026-11-02T11:00:00.000Z', to: '2026-11-02T11:20:00.000Z' },
      filters: [],
      entities: {},
      dataViewId: 'logs-view',
      metric: { operationType: 'count' },
    });
  });

  it('uses an ad-hoc data view title and keeps a Lucene query separate from the metric KQL filter', () => {
    const seed = investigationSeedFromAlert({
      fields: {
        [ALERT_UUID]: 'alert-3',
        [ALERT_RULE_TYPE_ID]: 'observability.rules.custom_threshold',
        [ALERT_START]: '2026-11-02T11:00:00.000Z',
        [ALERT_RULE_PARAMETERS]: {
          searchConfiguration: {
            index: { title: 'logs-app-*' },
            query: { language: 'lucene', query: 'status:500' },
            filter: [{ meta: { key: 'host.name' }, query: { term: { 'host.name': 'web-1' } } }],
          },
          criteria: [{ metrics: [{ aggType: 'count', filter: 'log.level: error' }] }],
        },
        [ALERT_GROUP]: [{ field: 'service.name', value: 'checkout' }],
      },
    });

    expect(seed?.indexPattern).toBe('logs-app-*');
    expect(seed?.dataViewId).toBeUndefined();
    expect(seed?.query).toEqual({ language: 'lucene', query: 'status:500' });
    expect(seed?.origin).not.toHaveProperty('alertEnd');
    expect(seed?.filters).toEqual([
      { meta: { key: 'host.name' }, query: { term: { 'host.name': 'web-1' } } },
      { meta: {}, query: toElasticsearchQuery(fromKueryExpression('log.level: error')) },
      { meta: {}, query: { match_phrase: { 'service.name': 'checkout' } } },
    ]);
  });

  it('reads flattened alert group field and value arrays', () => {
    const seed = investigationSeedFromAlert({
      fields: {
        [ALERT_UUID]: 'alert-4',
        [ALERT_RULE_TYPE_ID]: 'observability.rules.custom_threshold',
        [ALERT_START]: '2026-11-02T11:00:00.000Z',
        [ALERT_RULE_PARAMETERS]: {
          searchConfiguration: { index: 'logs-view' },
          criteria: [{ metrics: [{ aggType: 'count' }] }],
        },
        [ALERT_GROUP_FIELD]: ['service.name', 'host.name'],
        [ALERT_GROUP_VALUE]: ['checkout', 'web-1'],
      },
    });

    expect(seed?.filters).toEqual([
      { meta: {}, query: { match_phrase: { 'service.name': 'checkout' } } },
      { meta: {}, query: { match_phrase: { 'host.name': 'web-1' } } },
    ]);
  });

  it('merges rule-level filters when they would exceed the seed filter cap', () => {
    const ruleFilters = Array.from({ length: 51 }, (_, index) => ({
      meta: { key: 'host.name' },
      query: { term: { 'host.name': `web-${index}` } },
    }));
    const seed = investigationSeedFromAlert({
      fields: {
        [ALERT_UUID]: 'alert-5',
        [ALERT_RULE_TYPE_ID]: 'observability.rules.custom_threshold',
        [ALERT_START]: '2026-11-02T11:00:00.000Z',
        [ALERT_RULE_PARAMETERS]: {
          searchConfiguration: { index: 'logs-view', filter: ruleFilters },
          criteria: [{ metrics: [{ aggType: 'count' }] }],
        },
      },
    });

    expect(seed?.filters).toHaveLength(1);
    expect(seed?.filters[0]?.query).toEqual({
      bool: { filter: ruleFilters.map((filter) => filter.query) },
    });
  });

  it('turns log threshold criteria into one filter and keeps the log view id', () => {
    const seed = investigationSeedFromAlert({
      fields: {
        [ALERT_UUID]: 'alert-6',
        [ALERT_RULE_TYPE_ID]: 'logs.alert.document.count',
        [ALERT_START]: '2026-11-02T11:00:00.000Z',
        [ALERT_END]: '2026-11-02T11:10:00.000Z',
        [ALERT_INDEX_PATTERN]: 'logs-*',
        [ALERT_RULE_PARAMETERS]: {
          timeSize: 1.5,
          timeUnit: 'm',
          logView: { type: 'log-view-reference', logViewId: 'log-view-1' },
          criteria: [
            { field: 'log.level', comparator: 'equals', value: 'error' },
            { field: 'event.dataset', comparator: 'does not equal', value: 'heartbeat' },
          ],
        },
        [ALERT_GROUP]: [{ field: 'host.name', value: 'web-1' }],
      },
    });

    expect(seed?.indexPattern).toBe('logs-*');
    expect(seed?.metric).toEqual({ operationType: 'count' });
    expect(seed?.origin).toMatchObject({
      alertEnd: '2026-11-02T11:10:00.000Z',
      logViewId: 'log-view-1',
      lookback: { timeSize: 1.5, timeUnit: 'm' },
    });
    expect(seed?.filters).toEqual([
      {
        meta: {},
        query: {
          bool: {
            filter: [{ term: { 'log.level': { value: 'error' } } }],
            must_not: [{ term: { 'event.dataset': { value: 'heartbeat' } } }],
          },
        },
      },
      { meta: {}, query: { match_phrase: { 'host.name': 'web-1' } } },
    ]);
  });

  it('marks a log threshold ratio rule so log rate analysis does not run', () => {
    const seed = investigationSeedFromAlert({
      fields: {
        [ALERT_UUID]: 'alert-7',
        [ALERT_RULE_TYPE_ID]: 'logs.alert.document.count',
        [ALERT_START]: '2026-11-02T11:00:00.000Z',
        [ALERT_RULE_PARAMETERS]: {
          criteria: [
            [{ field: 'log.level', comparator: 'equals', value: 'error' }],
            [{ field: 'log.level', comparator: 'equals', value: 'info' }],
          ],
        },
      },
    });

    expect(seed?.metric).toEqual({ operationType: 'ratio' });
  });

  it('hides the action when the alert id, rule type, or start is missing', () => {
    expect(
      investigationSeedFromAlert({
        fields: {
          [ALERT_RULE_TYPE_ID]: 'apm.threshold',
          [ALERT_START]: '2026-11-02T11:00:00.000Z',
        },
      })
    ).toBeUndefined();
  });

  it('uses lastUpdated when the alert has not ended', () => {
    const seed = investigationSeedFromAlert({
      lastUpdated: Date.parse('2026-11-02T12:30:00.000Z'),
      fields: {
        [ALERT_UUID]: 'alert-1',
        [ALERT_RULE_TYPE_ID]: 'apm.threshold',
        [ALERT_START]: '2026-11-02T11:00:00.000Z',
      },
    });

    expect(seed?.timeRange.to).toBe('2026-11-02T12:30:00.000Z');
  });
});
