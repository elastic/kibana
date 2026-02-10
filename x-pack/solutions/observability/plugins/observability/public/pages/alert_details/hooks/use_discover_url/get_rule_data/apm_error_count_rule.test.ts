/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_INDEX_PATTERN, ApmRuleType } from '@kbn/rule-data-utils';
import type { Rule } from '@kbn/alerts-ui-shared';
import { ERROR_GROUP_ID, SERVICE_ENVIRONMENT, SERVICE_NAME } from '@kbn/apm-types';
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
    it('returns null', () => {
      const alertWithoutIndex = {
        fields: {},
      } as unknown as TopAlert;

      const result = getApmErrorCountRuleData({ alert: alertWithoutIndex, rule: baseRule });

      expect(result).toBeNull();
    });
  });

  describe('when alert has index pattern and fields', () => {
    it('returns discover params with all filters when all alert fields are present', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          [ALERT_INDEX_PATTERN]: 'logs-apm.error-*',
          [SERVICE_NAME]: 'checkout-service',
          [ERROR_GROUP_ID]: 'abc123',
          [SERVICE_ENVIRONMENT]: 'production',
        },
      } as unknown as TopAlert;

      const result = getApmErrorCountRuleData({ alert, rule: baseRule });

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

    it('excludes service.name filter when not present in alert fields', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          [ALERT_INDEX_PATTERN]: 'logs-apm.error-*',
          [ERROR_GROUP_ID]: 'abc123',
          [SERVICE_ENVIRONMENT]: 'production',
        },
      } as unknown as TopAlert;

      const result = getApmErrorCountRuleData({ alert, rule: baseRule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(error.grouping_key:"abc123" AND service.environment:"production" AND processor.event:"error")'
      );
    });

    it('excludes error.grouping_key filter when not present in alert fields', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          [ALERT_INDEX_PATTERN]: 'logs-apm.error-*',
          [SERVICE_NAME]: 'checkout-service',
          [SERVICE_ENVIRONMENT]: 'production',
        },
      } as unknown as TopAlert;

      const result = getApmErrorCountRuleData({ alert, rule: baseRule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"checkout-service" AND service.environment:"production" AND processor.event:"error")'
      );
    });

    it('excludes service.environment filter when ENVIRONMENT_ALL', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          [ALERT_INDEX_PATTERN]: 'logs-apm.error-*',
          [SERVICE_NAME]: 'checkout-service',
          [ERROR_GROUP_ID]: 'abc123',
          [SERVICE_ENVIRONMENT]: 'ENVIRONMENT_ALL',
        },
      } as unknown as TopAlert;

      const result = getApmErrorCountRuleData({ alert, rule: baseRule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"checkout-service" AND error.grouping_key:"abc123" AND processor.event:"error")'
      );
    });

    it('includes only processor.event filter when no other alert fields are present', () => {
      const result = getApmErrorCountRuleData({ alert: mockAlert, rule: baseRule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe('processor.event:"error"');
    });

    it('handles various combinations of alert fields', () => {
      const testCases = [
        {
          fields: { [SERVICE_NAME]: 'service-a' },
          expectedQuery: '(service.name:"service-a" AND processor.event:"error")',
        },
        {
          fields: { [ERROR_GROUP_ID]: 'xyz789' },
          expectedQuery: '(error.grouping_key:"xyz789" AND processor.event:"error")',
        },
        {
          fields: { [SERVICE_ENVIRONMENT]: 'staging' },
          expectedQuery: '(service.environment:"staging" AND processor.event:"error")',
        },
        {
          fields: { [SERVICE_NAME]: 'service-b', [SERVICE_ENVIRONMENT]: 'development' },
          expectedQuery:
            '(service.name:"service-b" AND service.environment:"development" AND processor.event:"error")',
        },
        {
          fields: { [ERROR_GROUP_ID]: 'def456', [SERVICE_ENVIRONMENT]: 'qa' },
          expectedQuery:
            '(error.grouping_key:"def456" AND service.environment:"qa" AND processor.event:"error")',
        },
      ];

      testCases.forEach(({ fields, expectedQuery }) => {
        const alert = {
          ...mockAlert,
          fields: { ...mockAlert.fields, ...fields },
        } as unknown as TopAlert;
        const result = getApmErrorCountRuleData({ alert, rule: baseRule })!;
        expect(result).toBeDefined();
        expect(result.discoverAppLocatorParams?.query?.query).toBe(expectedQuery);
      });
    });

    it('uses kuery as query language', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          ...mockAlert.fields,
          [SERVICE_NAME]: 'test-service',
        },
      } as unknown as TopAlert;

      const result = getApmErrorCountRuleData({ alert, rule: baseRule })!;

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

  describe('when searchConfiguration is provided in rule params', () => {
    it('combines searchConfiguration query with alert field filters', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          [ALERT_INDEX_PATTERN]: 'logs-apm.error-*',
          [SERVICE_NAME]: 'checkout-service',
          [ERROR_GROUP_ID]: 'abc123',
          [SERVICE_ENVIRONMENT]: 'production',
        },
      } as unknown as TopAlert;

      const rule: Rule = {
        ...baseRule,
        params: {
          searchConfiguration: {
            query: {
              query: 'custom.field: "custom-value" AND another.field: 123',
            },
          },
        },
      };

      const result = getApmErrorCountRuleData({ alert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(custom.field: "custom-value" AND another.field: 123) AND ((service.name:"checkout-service" AND error.grouping_key:"abc123" AND service.environment:"production" AND processor.event:"error"))'
      );
    });

    it('uses only searchConfiguration query when no alert fields are present', () => {
      const rule: Rule = {
        ...baseRule,
        params: {
          searchConfiguration: {
            query: {
              query: 'my.custom.query: true',
            },
          },
        },
      };

      const result = getApmErrorCountRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(my.custom.query: true) AND (processor.event:"error")'
      );
    });

    it('uses only alert field filters when searchConfiguration query is empty string', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          ...mockAlert.fields,
          [SERVICE_NAME]: 'checkout-service',
          [ERROR_GROUP_ID]: 'abc123',
        },
      } as unknown as TopAlert;

      const rule: Rule = {
        ...baseRule,
        params: {
          searchConfiguration: {
            query: {
              query: '',
            },
          },
        },
      };

      const result = getApmErrorCountRuleData({ alert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"checkout-service" AND error.grouping_key:"abc123" AND processor.event:"error")'
      );
    });

    it('uses only alert field filters when searchConfiguration exists but query is undefined', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          ...mockAlert.fields,
          [SERVICE_NAME]: 'checkout-service',
          [SERVICE_ENVIRONMENT]: 'production',
        },
      } as unknown as TopAlert;

      const rule: Rule = {
        ...baseRule,
        params: {
          searchConfiguration: {
            query: {},
          },
        },
      };

      const result = getApmErrorCountRuleData({ alert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"checkout-service" AND service.environment:"production" AND processor.event:"error")'
      );
    });
  });
});
