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

  describe('when alert has index pattern', () => {
    it('returns discover params with all filters when all rule params provided', () => {
      const rule: Rule = {
        ...baseRule,
        params: {
          serviceName: 'checkout-service',
          transactionType: 'request',
          transactionName: 'POST /api/checkout',
          environment: 'production',
        },
      };

      const result = getApmTransactionRuleData({ alert: mockAlert, rule });

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

    it('excludes service.name filter when not provided', () => {
      const rule: Rule = {
        ...baseRule,
        params: {
          transactionType: 'request',
          environment: 'production',
        },
      };

      const result = getApmTransactionRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(transaction.type:"request" AND service.environment:"production")'
      );
    });

    it('excludes transaction.type filter when not provided', () => {
      const rule: Rule = {
        ...baseRule,
        params: {
          serviceName: 'checkout-service',
          transactionName: 'GET /api/products',
          environment: 'production',
        },
      };

      const result = getApmTransactionRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"checkout-service" AND transaction.name:"GET /api/products" AND service.environment:"production")'
      );
    });

    it('excludes transaction.name filter when not provided', () => {
      const rule: Rule = {
        ...baseRule,
        params: {
          serviceName: 'checkout-service',
          transactionType: 'request',
          environment: 'production',
        },
      };

      const result = getApmTransactionRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"checkout-service" AND transaction.type:"request" AND service.environment:"production")'
      );
    });

    it('excludes service environment filter when ENVIRONMENT_ALL', () => {
      const rule: Rule = {
        ...baseRule,
        params: {
          serviceName: 'checkout-service',
          transactionType: 'request',
          environment: 'ENVIRONMENT_ALL',
        },
      };

      const result = getApmTransactionRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"checkout-service" AND transaction.type:"request")'
      );
    });

    it('returns empty query when no params provided', () => {
      const rule: Rule = {
        ...baseRule,
        params: {},
      };

      const result = getApmTransactionRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe('');
    });

    it('handles all combinations of optional params', () => {
      const testCases = [
        {
          params: { serviceName: 'service-a' },
          expectedQuery: 'service.name:"service-a"',
        },
        {
          params: { transactionType: 'page-load' },
          expectedQuery: 'transaction.type:"page-load"',
        },
        {
          params: { transactionName: 'GET /' },
          expectedQuery: 'transaction.name:"GET /"',
        },
        {
          params: { environment: 'staging' },
          expectedQuery: 'service.environment:"staging"',
        },
        {
          params: { serviceName: 'service-b', transactionType: 'request' },
          expectedQuery: '(service.name:"service-b" AND transaction.type:"request")',
        },
        {
          params: { transactionType: 'request', transactionName: 'POST /api/users' },
          expectedQuery: '(transaction.type:"request" AND transaction.name:"POST /api/users")',
        },
      ];

      testCases.forEach(({ params, expectedQuery }) => {
        const rule: Rule = { ...baseRule, params };
        const result = getApmTransactionRuleData({ alert: mockAlert, rule })!;
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

  describe('when searchConfiguration is provided', () => {
    it('combines searchConfiguration query with generated filters', () => {
      const rule: Rule = {
        ...baseRule,
        params: {
          serviceName: 'checkout-service',
          transactionType: 'request',
          transactionName: 'POST /api/checkout',
          environment: 'production',
          searchConfiguration: {
            query: {
              query: 'custom.field: "custom-value" AND another.field: 123',
            },
          },
        },
      };

      const result = getApmTransactionRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(custom.field: "custom-value" AND another.field: 123) AND ((service.name:"checkout-service" AND transaction.type:"request" AND transaction.name:"POST /api/checkout" AND service.environment:"production"))'
      );
    });

    it('uses only searchConfiguration query when no rule params provided', () => {
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

    it('uses basic params when searchConfiguration query is empty string', () => {
      const rule: Rule = {
        ...baseRule,
        params: {
          serviceName: 'checkout-service',
          transactionType: 'request',
          searchConfiguration: {
            query: {
              query: '',
            },
          },
        },
      };

      const result = getApmTransactionRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"checkout-service" AND transaction.type:"request")'
      );
    });

    it('uses basic params when searchConfiguration exists but query is undefined', () => {
      const rule: Rule = {
        ...baseRule,
        params: {
          serviceName: 'checkout-service',
          transactionType: 'request',
          environment: 'production',
          searchConfiguration: {
            query: {},
          },
        },
      };

      const result = getApmTransactionRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"checkout-service" AND transaction.type:"request" AND service.environment:"production")'
      );
    });
  });

  describe('when alert fields are available', () => {
    it('uses alert fields over rule params for all fields', () => {
      const alertWithFields: TopAlert = {
        ...mockAlert,
        fields: {
          ...mockAlert.fields,
          [SERVICE_NAME]: 'alert-service',
          [TRANSACTION_TYPE]: 'alert-type',
          [TRANSACTION_NAME]: 'alert-transaction',
          [SERVICE_ENVIRONMENT]: 'alert-env',
        },
      } as unknown as TopAlert;

      const rule: Rule = {
        ...baseRule,
        params: {
          serviceName: 'rule-service',
          transactionType: 'rule-type',
          transactionName: 'rule-transaction',
          environment: 'rule-env',
        },
      };

      const result = getApmTransactionRuleData({ alert: alertWithFields, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"alert-service" AND transaction.type:"alert-type" AND transaction.name:"alert-transaction" AND service.environment:"alert-env")'
      );
    });

    it('uses rule params when alert fields are not available', () => {
      const alertWithoutFields: TopAlert = {
        ...mockAlert,
        fields: {
          [ALERT_INDEX_PATTERN]: 'metrics-apm*,apm-*',
        },
      } as unknown as TopAlert;

      const rule: Rule = {
        ...baseRule,
        params: {
          serviceName: 'rule-service',
          transactionType: 'rule-type',
          transactionName: 'rule-transaction',
          environment: 'rule-env',
        },
      };

      const result = getApmTransactionRuleData({ alert: alertWithoutFields, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"rule-service" AND transaction.type:"rule-type" AND transaction.name:"rule-transaction" AND service.environment:"rule-env")'
      );
    });

    it('mixes alert fields and rule params when some alert fields are missing', () => {
      const alertWithPartialFields: TopAlert = {
        ...mockAlert,
        fields: {
          ...mockAlert.fields,
          [SERVICE_NAME]: 'alert-service',
          [TRANSACTION_TYPE]: 'alert-type',
        },
      } as unknown as TopAlert;

      const rule: Rule = {
        ...baseRule,
        params: {
          serviceName: 'rule-service',
          transactionType: 'rule-type',
          transactionName: 'rule-transaction',
          environment: 'rule-env',
        },
      };

      const result = getApmTransactionRuleData({ alert: alertWithPartialFields, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"alert-service" AND transaction.type:"alert-type" AND transaction.name:"rule-transaction" AND service.environment:"rule-env")'
      );
    });

    it('respects ENVIRONMENT_ALL from alert fields', () => {
      const alertWithEnvAll: TopAlert = {
        ...mockAlert,
        fields: {
          ...mockAlert.fields,
          [SERVICE_NAME]: 'alert-service',
          [SERVICE_ENVIRONMENT]: 'ENVIRONMENT_ALL',
        },
      } as unknown as TopAlert;

      const rule: Rule = {
        ...baseRule,
        params: {
          serviceName: 'rule-service',
          environment: 'production',
        },
      };

      const result = getApmTransactionRuleData({ alert: alertWithEnvAll, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe('service.name:"alert-service"');
    });

    it('uses alert fields even when searchConfiguration is provided', () => {
      const alertWithFields: TopAlert = {
        ...mockAlert,
        fields: {
          ...mockAlert.fields,
          [SERVICE_NAME]: 'alert-service',
          [TRANSACTION_TYPE]: 'alert-type',
        },
      } as unknown as TopAlert;

      const rule: Rule = {
        ...baseRule,
        params: {
          serviceName: 'rule-service',
          transactionType: 'rule-type',
          searchConfiguration: {
            query: {
              query: 'custom.field: true',
            },
          },
        },
      };

      const result = getApmTransactionRuleData({ alert: alertWithFields, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(custom.field: true) AND ((service.name:"alert-service" AND transaction.type:"alert-type"))'
      );
    });
  });
});
