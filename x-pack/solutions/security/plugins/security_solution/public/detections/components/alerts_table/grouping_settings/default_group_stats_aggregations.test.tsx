/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultGroupStatsAggregations } from '.';

describe('defaultGroupStatsAggregations', () => {
  it('should return the default values if the field is not supported', () => {
    const aggregations = defaultGroupStatsAggregations('unknown');

    expect(aggregations).toEqual([
      {
        unitsCount: {
          cardinality: {
            field: 'kibana.alert.uuid',
          },
        },
      },
      {
        rulesCountAggregation: {
          cardinality: {
            field: 'kibana.alert.rule.rule_id',
          },
        },
      },
    ]);
  });

  it('should return values depending on the input field', () => {
    const ruleAggregations = defaultGroupStatsAggregations('kibana.alert.rule.name');
    expect(ruleAggregations).toEqual([
      {
        unitsCount: {
          cardinality: {
            field: 'kibana.alert.uuid',
          },
        },
      },
      {
        description: {
          terms: {
            field: 'kibana.alert.rule.description',
            size: 1,
          },
        },
      },
      {
        countSeveritySubAggregation: {
          cardinality: {
            field: 'kibana.alert.severity',
          },
        },
      },
      {
        severitiesSubAggregation: {
          terms: {
            field: 'kibana.alert.severity',
          },
        },
      },
      {
        usersCountAggregation: {
          cardinality: {
            field: 'user.name',
          },
        },
      },
      {
        hostsCountAggregation: {
          cardinality: {
            field: 'host.name',
          },
        },
      },
      {
        ruleTags: {
          terms: {
            field: 'kibana.alert.rule.tags',
          },
        },
      },
    ]);

    const hostAggregations = defaultGroupStatsAggregations('host.name');
    expect(hostAggregations).toEqual([
      {
        unitsCount: {
          cardinality: {
            field: 'kibana.alert.uuid',
          },
        },
      },
      {
        rulesCountAggregation: {
          cardinality: {
            field: 'kibana.alert.rule.rule_id',
          },
        },
      },
      {
        countSeveritySubAggregation: {
          cardinality: {
            field: 'kibana.alert.severity',
          },
        },
      },
      {
        severitiesSubAggregation: {
          terms: {
            field: 'kibana.alert.severity',
          },
        },
      },
      {
        usersCountAggregation: {
          cardinality: {
            field: 'user.name',
          },
        },
      },
    ]);

    const userAggregations = defaultGroupStatsAggregations('user.name');
    expect(userAggregations).toEqual([
      {
        unitsCount: {
          cardinality: {
            field: 'kibana.alert.uuid',
          },
        },
      },
      {
        rulesCountAggregation: {
          cardinality: {
            field: 'kibana.alert.rule.rule_id',
          },
        },
      },
      {
        countSeveritySubAggregation: {
          cardinality: {
            field: 'kibana.alert.severity',
          },
        },
      },
      {
        severitiesSubAggregation: {
          terms: {
            field: 'kibana.alert.severity',
          },
        },
      },
      {
        hostsCountAggregation: {
          cardinality: {
            field: 'host.name',
          },
        },
      },
    ]);

    const sourceAggregations = defaultGroupStatsAggregations('source.ip');
    expect(sourceAggregations).toEqual([
      {
        unitsCount: {
          cardinality: {
            field: 'kibana.alert.uuid',
          },
        },
      },
      {
        rulesCountAggregation: {
          cardinality: {
            field: 'kibana.alert.rule.rule_id',
          },
        },
      },
      {
        countSeveritySubAggregation: {
          cardinality: {
            field: 'kibana.alert.severity',
          },
        },
      },
      {
        severitiesSubAggregation: {
          terms: {
            field: 'kibana.alert.severity',
          },
        },
      },
      {
        hostsCountAggregation: {
          cardinality: {
            field: 'host.name',
          },
        },
      },
    ]);
  });
});
