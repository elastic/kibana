/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTS_QUERY_NAMES } from '../../../detections/containers/detection_engine/alerts/constants';
import { buildRuleAlertsByEntityQuery } from './use_alert_count_by_rule_by_status';

export const mockAlertCountByRuleResult = {
  aggregations: {
    alertsByRuleAggregation: {
      buckets: [
        {
          key: 'Critical',
          doc_count: 1,
          ruleUuid: {
            hits: {
              hits: [
                {
                  fields: {
                    'kibana.alert.rule.uuid': ['100'],
                  },
                },
              ],
            },
          },
        },
        {
          key: 'High',
          doc_count: 1,
          ruleUuid: {
            hits: {
              hits: [
                {
                  fields: {
                    'kibana.alert.rule.uuid': ['200'],
                  },
                },
              ],
            },
          },
        },
        {
          key: 'Medium',
          doc_count: 1,
          ruleUuid: {
            hits: {
              hits: [
                {
                  fields: {
                    'kibana.alert.rule.uuid': ['300'],
                  },
                },
              ],
            },
          },
        },
        {
          key: 'another rule',
          doc_count: 1,
          ruleUuid: {
            hits: {
              hits: [
                {
                  fields: {
                    'kibana.alert.rule.uuid': ['400'],
                  },
                },
              ],
            },
          },
        },
        {
          key: 'bad users!!',
          doc_count: 1,
          ruleUuid: {
            hits: {
              hits: [
                {
                  fields: {
                    'kibana.alert.rule.uuid': ['500'],
                  },
                },
              ],
            },
          },
        },
        {
          key: 'endpoint',
          doc_count: 1,
          ruleUuid: {
            hits: {
              hits: [
                {
                  fields: {
                    'kibana.alert.rule.uuid': ['600'],
                  },
                },
              ],
            },
          },
        },
        {
          key: 'low',
          doc_count: 1,
          ruleUuid: {
            hits: {
              hits: [
                {
                  fields: {
                    'kibana.alert.rule.uuid': ['700'],
                  },
                },
              ],
            },
          },
        },
      ],
    },
  },
};

export const parsedAlertCountByRuleResult = [
  {
    ruleName: 'Critical',
    count: 1,
    uuid: '100',
  },
  {
    ruleName: 'High',
    count: 1,
    uuid: '200',
  },
  {
    ruleName: 'Medium',
    count: 1,
    uuid: '300',
  },
  {
    ruleName: 'another rule',
    count: 1,
    uuid: '400',
  },
  {
    ruleName: 'bad users!!',
    count: 1,
    uuid: '500',
  },
  {
    ruleName: 'endpoint',
    count: 1,
    uuid: '600',
  },
  {
    ruleName: 'low',
    count: 1,
    uuid: '700',
  },
];

export const mockQuery = () => ({
  query: buildRuleAlertsByEntityQuery({
    from: '2020-07-07T08:20:18.966Z',
    to: '2020-07-08T08:20:18.966Z',
    statuses: ['open'],
    field: 'test_field',
    value: 'test_value',
  }),
  indexName: 'signalIndexName',
  skip: false,
  queryName: ALERTS_QUERY_NAMES.ALERTS_COUNT_BY_STATUS,
});
