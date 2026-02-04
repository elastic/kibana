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

  it('should return values depending for kibana.alert.rule.name input field', () => {
    const aggregations = defaultGroupStatsAggregations('kibana.alert.rule.name');
    expect(aggregations).toEqual([
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
  });

  it('should return values depending for host.name input field', () => {
    const aggregations = defaultGroupStatsAggregations('host.name');
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
  });

  it('should return values depending for user.name input field', () => {
    const aggregations = defaultGroupStatsAggregations('user.name');
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

  it('should return values depending for source.ip input field', () => {
    const aggregations = defaultGroupStatsAggregations('source.ip');
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
