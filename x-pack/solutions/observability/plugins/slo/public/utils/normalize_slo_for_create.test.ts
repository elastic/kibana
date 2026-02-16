/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  normalizeForCreate,
  ensureIndicatorIndex,
  toDurationString,
  DEFAULT_INDEX_BY_TYPE,
} from './normalize_slo_for_create';

describe('toDurationString', () => {
  it('returns valid duration strings unchanged', () => {
    expect(toDurationString('1m')).toBe('1m');
    expect(toDurationString('30d')).toBe('30d');
    expect(toDurationString('2h')).toBe('2h');
  });

  it('converts numbers to minute-based duration strings', () => {
    expect(toDurationString(1)).toBe('1m');
    expect(toDurationString(10)).toBe('10m');
  });

  it('returns default 1m for invalid values', () => {
    expect(toDurationString(undefined)).toBe('1m');
    expect(toDurationString(null)).toBe('1m');
    expect(toDurationString('invalid')).toBe('1m');
  });
});

describe('ensureIndicatorIndex', () => {
  it('returns undefined indicators unchanged', () => {
    expect(ensureIndicatorIndex(undefined)).toBeUndefined();
  });

  it('returns indicator without type unchanged', () => {
    const indicator = { params: { index: 'test' } };
    expect(ensureIndicatorIndex(indicator)).toBe(indicator);
  });

  it('sets default index for APM transaction duration indicator', () => {
    const result = ensureIndicatorIndex({
      type: 'sli.apm.transactionDuration',
      params: { service: 'my-service', threshold: 500 },
    });

    expect(result?.params?.index).toBe('metrics-apm*');
    expect(result?.params?.transactionName).toBe('*');
    expect(result?.params?.environment).toBe('*');
    expect(result?.params?.transactionType).toBe('request');
    expect(result?.params?.service).toBe('my-service');
  });

  it('sets default index for APM transaction error rate indicator', () => {
    const result = ensureIndicatorIndex({
      type: 'sli.apm.transactionErrorRate',
      params: { service: 'my-service' },
    });

    expect(result?.params?.index).toBe('metrics-apm*');
  });

  it('does not overwrite existing index', () => {
    const result = ensureIndicatorIndex({
      type: 'sli.apm.transactionDuration',
      params: { index: 'custom-index*', service: 'my-service', threshold: 500 },
    });

    expect(result?.params?.index).toBe('custom-index*');
  });

  it('sets timestampField for KQL custom indicator', () => {
    const result = ensureIndicatorIndex({
      type: 'sli.kql.custom',
      params: { good: 'status: 200', total: '*' },
    });

    expect(result?.params?.index).toBe('logs-*');
    expect(result?.params?.timestampField).toBe('@timestamp');
  });

  it('covers all expected indicator types', () => {
    const expectedTypes = [
      'sli.apm.transactionDuration',
      'sli.apm.transactionErrorRate',
      'sli.kql.custom',
      'sli.metric.custom',
      'sli.metric.timeslice',
      'sli.histogram.custom',
      'sli.synthetics.availability',
    ];
    expect(Object.keys(DEFAULT_INDEX_BY_TYPE).sort()).toEqual(expectedTypes.sort());
  });
});

describe('normalizeForCreate', () => {
  const minimalDefinition = {
    name: 'Test SLO',
    description: 'A test SLO',
    indicator: {
      type: 'sli.kql.custom',
      params: {
        index: 'logs-*',
        good: 'status: 200',
        total: '*',
        timestampField: '@timestamp',
      },
    },
    timeWindow: { duration: '30d', type: 'rolling' },
    budgetingMethod: 'occurrences',
    objective: { target: 0.99 },
  };

  it('returns a normalized object with only expected fields', () => {
    const result = normalizeForCreate({
      ...minimalDefinition,
      extraField: 'should be stripped',
      anotherExtra: 123,
    });

    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('description');
    expect(result).toHaveProperty('indicator');
    expect(result).toHaveProperty('timeWindow');
    expect(result).toHaveProperty('budgetingMethod');
    expect(result).toHaveProperty('objective');
    expect(result).not.toHaveProperty('extraField');
    expect(result).not.toHaveProperty('anotherExtra');
  });

  it('provides defaults for missing name and description', () => {
    const result = normalizeForCreate({
      indicator: minimalDefinition.indicator,
      timeWindow: minimalDefinition.timeWindow,
      objective: minimalDefinition.objective,
    });

    expect(result.name).toBe('Untitled SLO');
    expect(result.description).toBe('');
    expect(result.budgetingMethod).toBe('occurrences');
  });

  it('preserves id when provided', () => {
    const result = normalizeForCreate({ ...minimalDefinition, id: 'custom-id' });
    expect(result.id).toBe('custom-id');
  });

  it('excludes id when not provided', () => {
    const result = normalizeForCreate(minimalDefinition);
    expect(result).not.toHaveProperty('id');
  });

  it('includes tags when present and non-empty', () => {
    const result = normalizeForCreate({ ...minimalDefinition, tags: ['production', 'api'] });
    expect(result.tags).toEqual(['production', 'api']);
  });

  it('excludes tags when empty array', () => {
    const result = normalizeForCreate({ ...minimalDefinition, tags: [] });
    expect(result).not.toHaveProperty('tags');
  });

  it('includes groupBy when not wildcard', () => {
    const result = normalizeForCreate({ ...minimalDefinition, groupBy: 'service.name' });
    expect(result.groupBy).toBe('service.name');
  });

  it('excludes groupBy when wildcard', () => {
    const result = normalizeForCreate({ ...minimalDefinition, groupBy: '*' });
    expect(result).not.toHaveProperty('groupBy');
  });

  it('normalizes numeric settings to duration strings', () => {
    const result = normalizeForCreate({
      ...minimalDefinition,
      settings: { syncDelay: 5, frequency: 1 },
    });

    const settings = result.settings as Record<string, unknown>;
    expect(settings.syncDelay).toBe('5m');
    expect(settings.frequency).toBe('1m');
  });

  it('preserves valid duration string settings', () => {
    const result = normalizeForCreate({
      ...minimalDefinition,
      settings: { syncDelay: '2m', frequency: '5m' },
    });

    const settings = result.settings as Record<string, unknown>;
    expect(settings.syncDelay).toBe('2m');
    expect(settings.frequency).toBe('5m');
  });

  it('preserves preventInitialBackfill and syncField', () => {
    const result = normalizeForCreate({
      ...minimalDefinition,
      settings: { preventInitialBackfill: true, syncField: '@timestamp' },
    });

    const settings = result.settings as Record<string, unknown>;
    expect(settings.preventInitialBackfill).toBe(true);
    expect(settings.syncField).toBe('@timestamp');
  });

  it('excludes settings when empty after normalization', () => {
    const result = normalizeForCreate({
      ...minimalDefinition,
      settings: {},
    });
    expect(result).not.toHaveProperty('settings');
  });

  it('normalizes indicator with missing index via ensureIndicatorIndex', () => {
    const result = normalizeForCreate({
      ...minimalDefinition,
      indicator: {
        type: 'sli.apm.transactionErrorRate',
        params: { service: 'my-service' },
      },
    });

    const indicator = result.indicator as { params: Record<string, unknown> };
    expect(indicator.params.index).toBe('metrics-apm*');
    expect(indicator.params.transactionName).toBe('*');
    expect(indicator.params.environment).toBe('*');
    expect(indicator.params.transactionType).toBe('request');
  });

  it('handles a full AI-generated definition with all edge cases', () => {
    const aiGenerated = {
      name: 'Checkout Latency',
      description: 'P99 latency for checkout flow',
      indicator: {
        type: 'sli.apm.transactionDuration',
        params: {
          service: 'checkout-service',
          environment: 'production',
          threshold: 500,
        },
      },
      timeWindow: { duration: '30d', type: 'rolling' },
      budgetingMethod: 'occurrences',
      objective: { target: 0.995 },
      tags: ['checkout', 'latency'],
      groupBy: 'service.environment',
      settings: { syncDelay: 1, frequency: 1, preventInitialBackfill: false },
      priority: 'critical',
      category: 'latency',
      rationale: 'High-traffic checkout flow',
    };

    const result = normalizeForCreate(aiGenerated);

    expect(result.name).toBe('Checkout Latency');
    expect(result.tags).toEqual(['checkout', 'latency']);
    expect(result.groupBy).toBe('service.environment');

    expect(result).not.toHaveProperty('priority');
    expect(result).not.toHaveProperty('category');
    expect(result).not.toHaveProperty('rationale');

    const indicator = result.indicator as { params: Record<string, unknown> };
    expect(indicator.params.index).toBe('metrics-apm*');
    expect(indicator.params.transactionName).toBe('*');

    const settings = result.settings as Record<string, unknown>;
    expect(settings.syncDelay).toBe('1m');
    expect(settings.frequency).toBe('1m');
  });
});
