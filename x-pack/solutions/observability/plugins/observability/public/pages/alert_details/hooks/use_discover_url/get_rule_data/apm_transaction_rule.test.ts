/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_INDEX_PATTERN, ApmRuleType } from '@kbn/rule-data-utils';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '@kbn/apm-types';
import type { Rule } from '@kbn/alerts-ui-shared';
import type { TopAlert } from '../../../../../typings/alerts';
import { getApmTransactionRuleData } from './apm_transaction_rule';

describe('getApmTransactionRuleData', () => {
  const mockAlert: TopAlert = {
    fields: {
      [ALERT_INDEX_PATTERN]: 'metrics-apm*,apm-*',
    },
    start: Date.now(),
  } as unknown as TopAlert;

  const baseRule: Rule = {
    ruleTypeId: ApmRuleType.TransactionErrorRate,
    params: {},
  } as unknown as Rule;

  describe('when alert has no index pattern', () => {
    it('returns null', () => {
      const alertWithoutIndex = {
        fields: {},
      } as unknown as TopAlert;

      const result = getApmTransactionRuleData({
        alert: alertWithoutIndex,
        rule: baseRule,
      });

      expect(result).toBeNull();
    });
  });

  describe('when alert has index pattern and fields', () => {
    it('returns discover params with all filters when all alert fields are present', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          [ALERT_INDEX_PATTERN]: 'metrics-apm*,apm-*',
          [SERVICE_NAME]: 'checkout-service',
          [TRANSACTION_TYPE]: 'request',
          [TRANSACTION_NAME]: 'POST /api/checkout',
          [SERVICE_ENVIRONMENT]: 'production',
        },
      } as unknown as TopAlert;

      const result = getApmTransactionRuleData({ alert, rule: baseRule });

      expect(result).toEqual({
        discoverAppLocatorParams: {
          dataViewSpec: {
            title: 'metrics-apm*,apm-*',
            timeFieldName: '@timestamp',
          },
          query: {
            language: 'kuery',
            query:
              '(service.name:"checkout-service" AND transaction.type:"request" AND transaction.name:"POST /api/checkout" AND service.environment:"production")',
          },
        },
      });
    });

    it('excludes service.name filter when not present in alert fields', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          ...mockAlert.fields,
          [TRANSACTION_TYPE]: 'request',
          [SERVICE_ENVIRONMENT]: 'production',
        },
      } as unknown as TopAlert;

      const result = getApmTransactionRuleData({ alert, rule: baseRule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(transaction.type:"request" AND service.environment:"production")'
      );
    });

    it('excludes transaction.type filter when not present in alert fields', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          ...mockAlert.fields,
          [SERVICE_NAME]: 'checkout-service',
          [TRANSACTION_NAME]: 'GET /api/products',
          [SERVICE_ENVIRONMENT]: 'production',
        },
      } as unknown as TopAlert;

      const result = getApmTransactionRuleData({ alert, rule: baseRule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"checkout-service" AND transaction.name:"GET /api/products" AND service.environment:"production")'
      );
    });

    it('excludes transaction.name filter when not present in alert fields', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          ...mockAlert.fields,
          [SERVICE_NAME]: 'checkout-service',
          [TRANSACTION_TYPE]: 'request',
          [SERVICE_ENVIRONMENT]: 'production',
        },
      } as unknown as TopAlert;

      const result = getApmTransactionRuleData({ alert, rule: baseRule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"checkout-service" AND transaction.type:"request" AND service.environment:"production")'
      );
    });

    it('excludes service environment filter when ENVIRONMENT_ALL', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          ...mockAlert.fields,
          [SERVICE_NAME]: 'checkout-service',
          [TRANSACTION_TYPE]: 'request',
          [SERVICE_ENVIRONMENT]: 'ENVIRONMENT_ALL',
        },
      } as unknown as TopAlert;

      const result = getApmTransactionRuleData({ alert, rule: baseRule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"checkout-service" AND transaction.type:"request")'
      );
    });

    it('returns empty query when no alert fields are present', () => {
      const result = getApmTransactionRuleData({ alert: mockAlert, rule: baseRule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe('');
    });

    it('handles various combinations of alert fields', () => {
      const testCases = [
        {
          fields: { [SERVICE_NAME]: 'service-a' },
          expectedQuery: 'service.name:"service-a"',
        },
        {
          fields: { [TRANSACTION_TYPE]: 'page-load' },
          expectedQuery: 'transaction.type:"page-load"',
        },
        {
          fields: { [TRANSACTION_NAME]: 'GET /' },
          expectedQuery: 'transaction.name:"GET /"',
        },
        {
          fields: { [SERVICE_ENVIRONMENT]: 'staging' },
          expectedQuery: 'service.environment:"staging"',
        },
        {
          fields: { [SERVICE_NAME]: 'service-b', [TRANSACTION_TYPE]: 'request' },
          expectedQuery: '(service.name:"service-b" AND transaction.type:"request")',
        },
        {
          fields: { [TRANSACTION_TYPE]: 'request', [TRANSACTION_NAME]: 'POST /api/users' },
          expectedQuery: '(transaction.type:"request" AND transaction.name:"POST /api/users")',
        },
      ];

      testCases.forEach(({ fields, expectedQuery }) => {
        const alert = {
          ...mockAlert,
          fields: { ...mockAlert.fields, ...fields },
        } as unknown as TopAlert;
        const result = getApmTransactionRuleData({ alert, rule: baseRule })!;
        expect(result).toBeDefined();
        expect(result.discoverAppLocatorParams?.query?.query).toBe(expectedQuery);
      });
    });

    it('uses index pattern from alert fields', () => {
      const customIndexAlert = {
        ...mockAlert,
        fields: {
          [ALERT_INDEX_PATTERN]: 'custom-apm-index-*',
        },
      } as unknown as TopAlert;

      const result = getApmTransactionRuleData({
        alert: customIndexAlert,
        rule: baseRule,
      })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.dataViewSpec?.title).toBe('custom-apm-index-*');
    });
  });

  describe('when searchConfiguration is provided in rule params', () => {
    it('combines searchConfiguration query with alert field filters', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          [ALERT_INDEX_PATTERN]: 'metrics-apm*,apm-*',
          [SERVICE_NAME]: 'checkout-service',
          [TRANSACTION_TYPE]: 'request',
          [TRANSACTION_NAME]: 'POST /api/checkout',
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

      const result = getApmTransactionRuleData({ alert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(custom.field: "custom-value" AND another.field: 123) AND ((service.name:"checkout-service" AND transaction.type:"request" AND transaction.name:"POST /api/checkout" AND service.environment:"production"))'
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

      const result = getApmTransactionRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe('my.custom.query: true');
    });

    it('uses only alert field filters when searchConfiguration query is empty string', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          ...mockAlert.fields,
          [SERVICE_NAME]: 'checkout-service',
          [TRANSACTION_TYPE]: 'request',
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

      const result = getApmTransactionRuleData({ alert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"checkout-service" AND transaction.type:"request")'
      );
    });

    it('uses only alert field filters when searchConfiguration exists but query is undefined', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          ...mockAlert.fields,
          [SERVICE_NAME]: 'checkout-service',
          [TRANSACTION_TYPE]: 'request',
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

      const result = getApmTransactionRuleData({ alert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"checkout-service" AND transaction.type:"request" AND service.environment:"production")'
      );
    });
  });
});
