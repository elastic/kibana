/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  normalizeSloDefinition,
  normalizeIndicatorIndex,
  toDurationString,
  DEFAULT_INDEX_BY_INDICATOR_TYPE,
} from './normalize_slo_definition';

describe('toDurationString', () => {
  it('returns valid duration strings unchanged', () => {
    expect(toDurationString('1m', '5m')).toBe('1m');
    expect(toDurationString('30d', '5m')).toBe('30d');
    expect(toDurationString('2h', '5m')).toBe('2h');
  });

  it('converts numbers to minute-based duration strings', () => {
    expect(toDurationString(1, '5m')).toBe('1m');
    expect(toDurationString(10, '5m')).toBe('10m');
    expect(toDurationString(0, '5m')).toBe('0m');
  });

  it('returns default for invalid values', () => {
    expect(toDurationString(undefined, '5m')).toBe('5m');
    expect(toDurationString(null, '5m')).toBe('5m');
    expect(toDurationString('invalid', '5m')).toBe('5m');
    expect(toDurationString('', '5m')).toBe('5m');
    expect(toDurationString({}, '5m')).toBe('5m');
  });
});

describe('normalizeIndicatorIndex', () => {
  it('sets default index for APM transaction duration indicator', () => {
    const definition: Record<string, unknown> = {
      indicator: {
        type: 'sli.apm.transactionDuration',
        params: { service: 'my-service', threshold: 500 },
      },
    };

    normalizeIndicatorIndex(definition);

    const indicator = definition.indicator as { params: Record<string, unknown> };
    expect(indicator.params.index).toBe('metrics-apm*');
    expect(indicator.params.transactionName).toBe('*');
    expect(indicator.params.environment).toBe('*');
    expect(indicator.params.transactionType).toBe('request');
  });

  it('sets default index for APM transaction error rate indicator', () => {
    const definition: Record<string, unknown> = {
      indicator: {
        type: 'sli.apm.transactionErrorRate',
        params: { service: 'my-service' },
      },
    };

    normalizeIndicatorIndex(definition);

    const indicator = definition.indicator as { params: Record<string, unknown> };
    expect(indicator.params.index).toBe('metrics-apm*');
  });

  it('does not overwrite existing index', () => {
    const definition: Record<string, unknown> = {
      indicator: {
        type: 'sli.apm.transactionDuration',
        params: { service: 'my-service', index: 'custom-index*', threshold: 500 },
      },
    };

    normalizeIndicatorIndex(definition);

    const indicator = definition.indicator as { params: Record<string, unknown> };
    expect(indicator.params.index).toBe('custom-index*');
  });

  it('does not overwrite existing APM fields', () => {
    const definition: Record<string, unknown> = {
      indicator: {
        type: 'sli.apm.transactionErrorRate',
        params: {
          service: 'my-service',
          environment: 'production',
          transactionType: 'custom',
          transactionName: '/api/users',
        },
      },
    };

    normalizeIndicatorIndex(definition);

    const indicator = definition.indicator as { params: Record<string, unknown> };
    expect(indicator.params.environment).toBe('production');
    expect(indicator.params.transactionType).toBe('custom');
    expect(indicator.params.transactionName).toBe('/api/users');
    expect(indicator.params.service).toBe('my-service');
  });

  it('sets default index for KQL custom indicator', () => {
    const definition: Record<string, unknown> = {
      indicator: {
        type: 'sli.kql.custom',
        params: { good: 'status: 200', total: '*' },
      },
    };

    normalizeIndicatorIndex(definition);

    const indicator = definition.indicator as { params: Record<string, unknown> };
    expect(indicator.params.index).toBe('logs-*');
    expect(indicator.params.timestampField).toBe('@timestamp');
  });

  it('sets default index for metric custom indicator', () => {
    const definition: Record<string, unknown> = {
      indicator: {
        type: 'sli.metric.custom',
        params: {},
      },
    };

    normalizeIndicatorIndex(definition);

    const indicator = definition.indicator as { params: Record<string, unknown> };
    expect(indicator.params.index).toBe('metrics-*');
  });

  it('sets default index for synthetics availability indicator', () => {
    const definition: Record<string, unknown> = {
      indicator: {
        type: 'sli.synthetics.availability',
        params: {},
      },
    };

    normalizeIndicatorIndex(definition);

    const indicator = definition.indicator as { params: Record<string, unknown> };
    expect(indicator.params.index).toBe('synthetics-*');
  });

  it('handles missing indicator gracefully', () => {
    const definition: Record<string, unknown> = {};
    normalizeIndicatorIndex(definition);
    expect(definition.indicator).toBeUndefined();
  });

  it('handles indicator without params gracefully', () => {
    const definition: Record<string, unknown> = {
      indicator: { type: 'sli.kql.custom' },
    };
    normalizeIndicatorIndex(definition);
    expect(definition.indicator).toEqual({ type: 'sli.kql.custom' });
  });

  it('covers all indicator types in DEFAULT_INDEX_BY_INDICATOR_TYPE', () => {
    const expectedTypes = [
      'sli.apm.transactionDuration',
      'sli.apm.transactionErrorRate',
      'sli.kql.custom',
      'sli.metric.custom',
      'sli.metric.timeslice',
      'sli.histogram.custom',
      'sli.synthetics.availability',
    ];
    expect(Object.keys(DEFAULT_INDEX_BY_INDICATOR_TYPE).sort()).toEqual(expectedTypes.sort());
  });
});

describe('normalizeSloDefinition', () => {
  it('adds auto-discovered tag when no tags exist', () => {
    const result = normalizeSloDefinition({ name: 'test' });
    expect(result.tags).toEqual(['auto-discovered']);
  });

  it('appends auto-discovered tag to existing tags', () => {
    const result = normalizeSloDefinition({ name: 'test', tags: ['existing'] });
    expect(result.tags).toEqual(['existing', 'auto-discovered']);
  });

  it('does not duplicate auto-discovered tag', () => {
    const result = normalizeSloDefinition({ name: 'test', tags: ['auto-discovered'] });
    expect(result.tags).toEqual(['auto-discovered']);
  });

  it('sets default groupBy when missing', () => {
    const result = normalizeSloDefinition({ name: 'test' });
    expect(result.groupBy).toBe('*');
  });

  it('preserves existing groupBy', () => {
    const result = normalizeSloDefinition({ name: 'test', groupBy: 'service.name' });
    expect(result.groupBy).toBe('service.name');
  });

  it('normalizes numeric syncDelay to duration string', () => {
    const result = normalizeSloDefinition({
      name: 'test',
      settings: { syncDelay: 5 },
    });
    expect((result.settings as Record<string, unknown>).syncDelay).toBe('5m');
  });

  it('normalizes numeric frequency to duration string', () => {
    const result = normalizeSloDefinition({
      name: 'test',
      settings: { frequency: 1 },
    });
    expect((result.settings as Record<string, unknown>).frequency).toBe('1m');
  });

  it('preserves valid duration string settings', () => {
    const result = normalizeSloDefinition({
      name: 'test',
      settings: { syncDelay: '2m', frequency: '5m' },
    });
    const settings = result.settings as Record<string, unknown>;
    expect(settings.syncDelay).toBe('2m');
    expect(settings.frequency).toBe('5m');
  });

  it('preserves preventInitialBackfill boolean', () => {
    const result = normalizeSloDefinition({
      name: 'test',
      settings: { preventInitialBackfill: true },
    });
    expect((result.settings as Record<string, unknown>).preventInitialBackfill).toBe(true);
  });

  it('preserves syncField string', () => {
    const result = normalizeSloDefinition({
      name: 'test',
      settings: { syncField: '@timestamp' },
    });
    expect((result.settings as Record<string, unknown>).syncField).toBe('@timestamp');
  });

  it('strips unknown settings fields', () => {
    const result = normalizeSloDefinition({
      name: 'test',
      settings: { syncDelay: '1m', unknownField: 'foo' },
    });
    expect((result.settings as Record<string, unknown>).unknownField).toBeUndefined();
  });

  it('normalizes indicator index via normalizeIndicatorIndex', () => {
    const result = normalizeSloDefinition({
      name: 'test',
      indicator: {
        type: 'sli.apm.transactionErrorRate',
        params: { service: 'my-service' },
      },
    });
    const indicator = result.indicator as { params: Record<string, unknown> };
    expect(indicator.params.index).toBe('metrics-apm*');
  });

  it('handles a complete AI-generated definition', () => {
    const aiGenerated = {
      name: 'API Availability',
      description: 'Tracks API error rate',
      indicator: {
        type: 'sli.apm.transactionErrorRate',
        params: {
          service: 'api-gateway',
          environment: 'production',
        },
      },
      timeWindow: { duration: '30d', type: 'rolling' },
      budgetingMethod: 'occurrences',
      objective: { target: 0.995 },
      settings: { syncDelay: 1, frequency: 1, preventInitialBackfill: false },
      tags: ['api'],
      extraField: 'should be preserved',
    };

    const result = normalizeSloDefinition(aiGenerated);

    expect(result.name).toBe('API Availability');
    expect(result.tags).toEqual(['api', 'auto-discovered']);
    expect(result.groupBy).toBe('*');

    const settings = result.settings as Record<string, unknown>;
    expect(settings.syncDelay).toBe('1m');
    expect(settings.frequency).toBe('1m');
    expect(settings.preventInitialBackfill).toBe(false);

    const indicator = result.indicator as { params: Record<string, unknown> };
    expect(indicator.params.index).toBe('metrics-apm*');
    expect(indicator.params.transactionName).toBe('*');
    expect(indicator.params.transactionType).toBe('request');
  });
});
