/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_INDEX_PATTERN, ApmRuleType } from '@kbn/rule-data-utils';
import type { Rule } from '@kbn/alerts-ui-shared';
import type { TopAlert } from '../../../../../typings/alerts';
import { getApmErrorCountRuleData } from './apm_error_count_rule';

describe('getApmErrorCountRuleData', () => {
  const mockAlert: TopAlert = {
    fields: {
      [ALERT_INDEX_PATTERN]: 'logs-apm.error-*',
    },
    start: Date.now(),
  } as unknown as TopAlert;

  const baseRule: Rule = {
    ruleTypeId: ApmRuleType.ErrorCount,
    params: {},
  } as unknown as Rule;

  describe('when alert has no index pattern', () => {
    it('returns empty object', () => {
      const alertWithoutIndex = {
        fields: {},
      } as unknown as TopAlert;

      const result = getApmErrorCountRuleData({ alert: alertWithoutIndex, rule: baseRule });

      expect(result).toBeNull();
    });
  });

  describe('when alert has index pattern', () => {
    it('returns discover params with all filters when all rule params provided', () => {
      const rule: Rule = {
        ...baseRule,
        params: {
          serviceName: 'checkout-service',
          errorGroupingKey: 'abc123',
          environment: 'production',
        },
      };

      const result = getApmErrorCountRuleData({ alert: mockAlert, rule });

      expect(result).toEqual({
        discoverAppLocatorParams: {
          dataViewSpec: {
            title: 'logs-apm.error-*',
            timeFieldName: '@timestamp',
          },
          query: {
            language: 'kuery',
            query:
              '(service.name:"checkout-service" AND error.grouping_key:"abc123" AND service.environment:"production" AND processor.event:"error")',
          },
        },
      });
    });

    it('excludes service.name filter when not provided', () => {
      const rule: Rule = {
        ...baseRule,
        params: {
          errorGroupingKey: 'abc123',
          environment: 'production',
        },
      };

      const result = getApmErrorCountRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(error.grouping_key:"abc123" AND service.environment:"production" AND processor.event:"error")'
      );
    });

    it('excludes error.grouping_key filter when not provided', () => {
      const rule: Rule = {
        ...baseRule,
        params: {
          serviceName: 'checkout-service',
          environment: 'production',
        },
      };

      const result = getApmErrorCountRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"checkout-service" AND service.environment:"production" AND processor.event:"error")'
      );
    });

    it('excludes service.environment filter when ENVIRONMENT_ALL', () => {
      const rule: Rule = {
        ...baseRule,
        params: {
          serviceName: 'checkout-service',
          errorGroupingKey: 'abc123',
          environment: 'ENVIRONMENT_ALL',
        },
      };

      const result = getApmErrorCountRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"checkout-service" AND error.grouping_key:"abc123" AND processor.event:"error")'
      );
    });

    it('includes only processor.event filter when no other params provided', () => {
      const rule: Rule = {
        ...baseRule,
        params: {},
      };

      const result = getApmErrorCountRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe('processor.event:"error"');
    });

    it('handles all combinations of optional params', () => {
      const testCases = [
        {
          params: { serviceName: 'service-a' },
          expectedQuery: '(service.name:"service-a" AND processor.event:"error")',
        },
        {
          params: { errorGroupingKey: 'xyz789' },
          expectedQuery: '(error.grouping_key:"xyz789" AND processor.event:"error")',
        },
        {
          params: { environment: 'staging' },
          expectedQuery: '(service.environment:"staging" AND processor.event:"error")',
        },
        {
          params: { serviceName: 'service-b', environment: 'development' },
          expectedQuery:
            '(service.name:"service-b" AND service.environment:"development" AND processor.event:"error")',
        },
        {
          params: { errorGroupingKey: 'def456', environment: 'qa' },
          expectedQuery:
            '(error.grouping_key:"def456" AND service.environment:"qa" AND processor.event:"error")',
        },
      ];

      testCases.forEach(({ params, expectedQuery }) => {
        const rule: Rule = { ...baseRule, params };
        const result = getApmErrorCountRuleData({ alert: mockAlert, rule })!;
        expect(result).toBeDefined();
        expect(result.discoverAppLocatorParams?.query?.query).toBe(expectedQuery);
      });
    });

    it('uses kuery as query language', () => {
      const rule: Rule = {
        ...baseRule,
        params: {
          serviceName: 'test-service',
        },
      };

      const result = getApmErrorCountRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.language).toBe('kuery');
    });

    it('sets @timestamp as timeFieldName', () => {
      const result = getApmErrorCountRuleData({ alert: mockAlert, rule: baseRule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.dataViewSpec?.timeFieldName).toBe('@timestamp');
    });

    it('uses index pattern from alert fields', () => {
      const customIndexAlert = {
        ...mockAlert,
        fields: {
          [ALERT_INDEX_PATTERN]: 'custom-apm-index-*',
        },
      } as unknown as TopAlert;

      const result = getApmErrorCountRuleData({ alert: customIndexAlert, rule: baseRule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.dataViewSpec?.title).toBe('custom-apm-index-*');
    });
  });

  describe('when searchConfiguration is provided', () => {
    it('uses searchConfiguration query instead of building from params', () => {
      const rule: Rule = {
        ...baseRule,
        params: {
          serviceName: 'checkout-service',
          errorGroupingKey: 'abc123',
          environment: 'production',
          searchConfiguration: {
            query: {
              query: 'custom.field: "custom-value" AND another.field: 123',
            },
          },
        },
      };

      const result = getApmErrorCountRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        'custom.field: "custom-value" AND another.field: 123'
      );
    });

    it('ignores rule params when searchConfiguration query exists', () => {
      const rule: Rule = {
        ...baseRule,
        params: {
          serviceName: 'ignored-service',
          errorGroupingKey: 'ignored-key',
          environment: 'ignored-env',
          searchConfiguration: {
            query: {
              query: 'my.custom.query: true',
            },
          },
        },
      };

      const result = getApmErrorCountRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      const queryString = result.discoverAppLocatorParams?.query?.query;
      expect(queryString).toBe('my.custom.query: true');
      expect(queryString).not.toContain('ignored-service');
      expect(queryString).not.toContain('ignored-key');
      expect(queryString).not.toContain('ignored-env');
    });

    it('uses basic params when searchConfiguration query is empty string', () => {
      const rule: Rule = {
        ...baseRule,
        params: {
          serviceName: 'checkout-service',
          errorGroupingKey: 'abc123',
          searchConfiguration: {
            query: {
              query: '',
            },
          },
        },
      };

      const result = getApmErrorCountRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"checkout-service" AND error.grouping_key:"abc123" AND processor.event:"error")'
      );
    });

    it('uses basic params when searchConfiguration exists but query is undefined', () => {
      const rule: Rule = {
        ...baseRule,
        params: {
          serviceName: 'checkout-service',
          environment: 'production',
          searchConfiguration: {
            query: {},
          },
        },
      };

      const result = getApmErrorCountRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"checkout-service" AND service.environment:"production" AND processor.event:"error")'
      );
    });
  });
});
