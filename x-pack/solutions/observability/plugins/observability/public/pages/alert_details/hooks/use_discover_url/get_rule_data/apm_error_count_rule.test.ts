/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_INDEX_PATTERN, ApmRuleType } from '@kbn/rule-data-utils';
import type { Rule } from '@kbn/alerts-ui-shared';
import {
  ERROR_GROUP_ID,
  ERROR_GROUP_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
} from '@kbn/apm-types';
import type { TopAlert } from '../../../../../typings/alerts';
import { getApmErrorCountRuleData } from './apm_error_count_rule';

describe('getApmErrorCountRuleData', () => {
  const mockAlert: TopAlert = {
    fields: {
      [ALERT_INDEX_PATTERN]: 'logs-apm.error-*',
      [SERVICE_NAME]: 'my-service',
      [SERVICE_ENVIRONMENT]: 'production',
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
        fields: {
          [SERVICE_NAME]: 'my-service',
          [SERVICE_ENVIRONMENT]: 'production',
        },
      } as unknown as TopAlert;

      const result = getApmErrorCountRuleData({ alert: alertWithoutIndex, rule: baseRule });

      expect(result).toBeNull();
    });
  });

  describe('when alert has index pattern and default group by fields', () => {
    it('builds query from default group by fields', () => {
      const result = getApmErrorCountRuleData({ alert: mockAlert, rule: baseRule });

      expect(result).toEqual({
        discoverAppLocatorParams: {
          dataViewSpec: {
            title: 'logs-apm.error-*',
            timeFieldName: '@timestamp',
          },
          query: {
            language: 'kuery',
            query:
              '(service.name:"my-service" AND service.environment:"production" AND processor.event:"error")',
          },
        },
      });
    });

    it('includes error.grouping_key filter when present in alert fields', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          ...mockAlert.fields,
          [ERROR_GROUP_ID]: 'abc123',
        },
      } as unknown as TopAlert;

      const result = getApmErrorCountRuleData({ alert, rule: baseRule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"my-service" AND error.grouping_key:"abc123" AND service.environment:"production" AND processor.event:"error")'
      );
    });

    it('includes error.grouping_name filter when present in alert fields', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          ...mockAlert.fields,
          [ERROR_GROUP_NAME]: 'NullPointerException',
        },
      } as unknown as TopAlert;

      const result = getApmErrorCountRuleData({ alert, rule: baseRule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"my-service" AND error.grouping_name:"NullPointerException" AND service.environment:"production" AND processor.event:"error")'
      );
    });

    it('includes transaction.name filter when present in alert fields', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          ...mockAlert.fields,
          [TRANSACTION_NAME]: 'GET /api/users',
        },
      } as unknown as TopAlert;

      const result = getApmErrorCountRuleData({ alert, rule: baseRule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"my-service" AND transaction.name:"GET /api/users" AND service.environment:"production" AND processor.event:"error")'
      );
    });

    it('includes all additional group by fields when present in alert fields', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          ...mockAlert.fields,
          [ERROR_GROUP_ID]: 'abc123',
          [ERROR_GROUP_NAME]: 'NullPointerException',
          [TRANSACTION_NAME]: 'GET /api/users',
        },
      } as unknown as TopAlert;

      const result = getApmErrorCountRuleData({ alert, rule: baseRule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"my-service" AND error.grouping_key:"abc123" AND error.grouping_name:"NullPointerException" AND transaction.name:"GET /api/users" AND service.environment:"production" AND processor.event:"error")'
      );
    });

    it('excludes service.environment filter when ENVIRONMENT_ALL', () => {
      const alert: TopAlert = {
        ...mockAlert,
        fields: {
          ...mockAlert.fields,
          [SERVICE_ENVIRONMENT]: 'ENVIRONMENT_ALL',
        },
      } as unknown as TopAlert;

      const result = getApmErrorCountRuleData({ alert, rule: baseRule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"my-service" AND processor.event:"error")'
      );
    });

    it('uses kuery as query language', () => {
      const result = getApmErrorCountRuleData({ alert: mockAlert, rule: baseRule })!;

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
          ...mockAlert.fields,
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
          ...mockAlert.fields,
          [ERROR_GROUP_ID]: 'abc123',
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
        '(custom.field: "custom-value" AND another.field: 123) AND ((service.name:"my-service" AND error.grouping_key:"abc123" AND service.environment:"production" AND processor.event:"error"))'
      );
    });

    it('combines searchConfiguration query with default group by filters', () => {
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
        '(my.custom.query: true) AND ((service.name:"my-service" AND service.environment:"production" AND processor.event:"error"))'
      );
    });

    it('uses only alert field filters when searchConfiguration query is empty string', () => {
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

      const result = getApmErrorCountRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"my-service" AND service.environment:"production" AND processor.event:"error")'
      );
    });

    it('uses only alert field filters when searchConfiguration exists but query is undefined', () => {
      const rule: Rule = {
        ...baseRule,
        params: {
          searchConfiguration: {
            query: {},
          },
        },
      };

      const result = getApmErrorCountRuleData({ alert: mockAlert, rule })!;

      expect(result).toBeDefined();
      expect(result.discoverAppLocatorParams?.query?.query).toBe(
        '(service.name:"my-service" AND service.environment:"production" AND processor.event:"error")'
      );
    });
  });
});
