/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDeduplicationAggQuery,
  getExcludeProcessedAlertsFilter,
  DEDUPLICATION_PRESETS,
} from './get_deduplication_agg_query';
import type { DeduplicationConfig, CorrelationField } from './types';

describe('getDeduplicationAggQuery', () => {
  describe('with default config', () => {
    it('should generate aggregation with correlation script', () => {
      const config: DeduplicationConfig = {
        correlationFields: ['file.hash.sha256', 'kibana.alert.rule.name', 'host.name'],
        maxGroups: 500,
        maxAlertsPerGroup: 100,
      };

      const result = getDeduplicationAggQuery(config);

      expect(result.terms).toBeDefined();
      expect(result.terms?.script).toBeDefined();
      expect(result.terms?.script?.source).toContain("doc['file']['hash']['sha256']");
      expect(result.terms?.script?.source).toContain("doc['kibana']['alert']['rule']['name']");
      expect(result.terms?.script?.source).toContain("doc['host']['name']");
      expect(result.terms?.size).toBe(500);
    });

    it('should include max_risk_score aggregation for ordering', () => {
      const config: DeduplicationConfig = {
        correlationFields: ['file.hash.sha256'],
        maxGroups: 100,
        maxAlertsPerGroup: 50,
      };

      const result = getDeduplicationAggQuery(config);

      expect(result.aggs).toBeDefined();
      expect(result.aggs?.max_risk_score).toEqual({
        max: {
          field: 'kibana.alert.risk_score',
        },
      });
    });

    it('should include top_alert aggregation for representative alert', () => {
      const config: DeduplicationConfig = {
        correlationFields: ['file.hash.sha256'],
        maxGroups: 100,
        maxAlertsPerGroup: 50,
      };

      const result = getDeduplicationAggQuery(config);

      expect(result.aggs?.top_alert).toEqual({
        top_hits: {
          size: 1,
          sort: [
            { 'kibana.alert.risk_score': { order: 'desc' } },
            { '@timestamp': { order: 'desc' } },
          ],
          _source: false,
        },
      });
    });

    it('should include alert_ids aggregation for reference preservation', () => {
      const config: DeduplicationConfig = {
        correlationFields: ['file.hash.sha256'],
        maxGroups: 100,
        maxAlertsPerGroup: 50,
      };

      const result = getDeduplicationAggQuery(config);

      expect(result.aggs?.alert_ids).toEqual({
        terms: {
          field: '_id',
          size: 50,
        },
      });
    });

    it('should include field-specific aggregations for correlation values', () => {
      const config: DeduplicationConfig = {
        correlationFields: ['file.hash.sha256', 'host.name'],
        maxGroups: 100,
        maxAlertsPerGroup: 50,
      };

      const result = getDeduplicationAggQuery(config);

      expect(result.aggs?.field_file_hash_sha256).toEqual({
        terms: {
          field: 'file.hash.sha256',
          size: 1,
        },
      });
      expect(result.aggs?.field_host_name).toEqual({
        terms: {
          field: 'host.name',
          size: 1,
        },
      });
    });
  });

  describe('with custom config', () => {
    it('should use custom maxGroups', () => {
      const config: DeduplicationConfig = {
        correlationFields: ['host.name'],
        maxGroups: 1000,
        maxAlertsPerGroup: 200,
      };

      const result = getDeduplicationAggQuery(config);

      expect(result.terms?.size).toBe(1000);
      expect(result.aggs?.alert_ids).toEqual({
        terms: {
          field: '_id',
          size: 200,
        },
      });
    });

    it('should handle single correlation field', () => {
      const config: DeduplicationConfig = {
        correlationFields: ['user.name'],
        maxGroups: 100,
        maxAlertsPerGroup: 50,
      };

      const result = getDeduplicationAggQuery(config);

      expect(result.terms?.script?.source).toBe(
        "(doc['user']['name'].size() > 0 ? doc['user']['name'].value : '_missing_')"
      );
    });

    it('should handle deeply nested fields', () => {
      const config: DeduplicationConfig = {
        correlationFields: ['process.hash.sha256' as CorrelationField],
        maxGroups: 100,
        maxAlertsPerGroup: 50,
      };

      const result = getDeduplicationAggQuery(config);

      expect(result.terms?.script?.source).toContain("doc['process']['hash']['sha256']");
    });
  });

  describe('error handling', () => {
    it('should throw error when no valid correlation fields provided', () => {
      const config: DeduplicationConfig = {
        correlationFields: [] as CorrelationField[],
        maxGroups: 100,
        maxAlertsPerGroup: 50,
      };

      expect(() => getDeduplicationAggQuery(config)).toThrow(
        'At least one valid correlation field must be specified'
      );
    });

    it('should filter out invalid correlation fields', () => {
      const config: DeduplicationConfig = {
        correlationFields: ['invalid.field' as CorrelationField, 'host.name'],
        maxGroups: 100,
        maxAlertsPerGroup: 50,
      };

      const result = getDeduplicationAggQuery(config);

      // Should only include valid field
      expect(result.terms?.script?.source).not.toContain('invalid');
      expect(result.terms?.script?.source).toContain("doc['host']['name']");
    });
  });

  describe('script generation', () => {
    it('should generate correct concatenation for multiple fields', () => {
      const config: DeduplicationConfig = {
        correlationFields: ['file.hash.sha256', 'host.name'],
        maxGroups: 100,
        maxAlertsPerGroup: 50,
      };

      const result = getDeduplicationAggQuery(config);
      const script = result.terms?.script?.source;

      // Should contain pipe separator
      expect(script).toContain("+ '|' +");
      // Should handle missing values
      expect(script).toContain("'_missing_'");
    });

    it('should handle missing field values gracefully in script', () => {
      const config: DeduplicationConfig = {
        correlationFields: ['source.ip'],
        maxGroups: 100,
        maxAlertsPerGroup: 50,
      };

      const result = getDeduplicationAggQuery(config);
      const script = result.terms?.script?.source;

      expect(script).toContain('.size() > 0');
      expect(script).toContain("'_missing_'");
    });
  });
});

describe('getExcludeProcessedAlertsFilter', () => {
  it('should return null for empty array', () => {
    const result = getExcludeProcessedAlertsFilter([]);

    expect(result).toBeNull();
  });

  it('should return ids must_not filter for non-empty array', () => {
    const alertIds = ['alert-1', 'alert-2', 'alert-3'];

    const result = getExcludeProcessedAlertsFilter(alertIds);

    expect(result).toEqual({
      bool: {
        must_not: [
          {
            ids: {
              values: alertIds,
            },
          },
        ],
      },
    });
  });
});

describe('DEDUPLICATION_PRESETS', () => {
  it('should have malware preset with file hash correlation', () => {
    expect(DEDUPLICATION_PRESETS.malware.correlationFields).toContain('file.hash.sha256');
    expect(DEDUPLICATION_PRESETS.malware.correlationFields).toContain('kibana.alert.rule.name');
    expect(DEDUPLICATION_PRESETS.malware.correlationFields).toContain('host.name');
  });

  it('should have processBased preset with process hash correlation', () => {
    expect(DEDUPLICATION_PRESETS.processBased.correlationFields).toContain('process.hash.sha256');
  });

  it('should have userFocused preset with user correlation', () => {
    expect(DEDUPLICATION_PRESETS.userFocused.correlationFields).toContain('user.name');
  });

  it('should have networkBased preset with IP correlation', () => {
    expect(DEDUPLICATION_PRESETS.networkBased.correlationFields).toContain('source.ip');
    expect(DEDUPLICATION_PRESETS.networkBased.correlationFields).toContain('destination.ip');
  });

  it('should have aggressive preset with minimal correlation', () => {
    expect(DEDUPLICATION_PRESETS.aggressive.correlationFields).toHaveLength(2);
    expect(DEDUPLICATION_PRESETS.aggressive.correlationFields).toContain('kibana.alert.rule.name');
    expect(DEDUPLICATION_PRESETS.aggressive.correlationFields).toContain('host.name');
  });

  it('all presets should have valid maxGroups and maxAlertsPerGroup', () => {
    Object.values(DEDUPLICATION_PRESETS).forEach((preset) => {
      expect(preset.maxGroups).toBeGreaterThan(0);
      expect(preset.maxAlertsPerGroup).toBeGreaterThan(0);
    });
  });
});
