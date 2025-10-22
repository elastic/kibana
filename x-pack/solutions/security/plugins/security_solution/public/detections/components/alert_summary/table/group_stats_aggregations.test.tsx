/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupStatsAggregations } from './group_stats_aggregations';

describe('groupStatsAggregations', () => {
  it('should return values depending for relatedIntegration input field', () => {
    const aggregations = groupStatsAggregations('relatedIntegration');
    expect(aggregations).toEqual([
      {
        unitsCount: {
          cardinality: {
            field: 'kibana.alert.uuid',
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
        rulesCountAggregation: {
          cardinality: {
            field: 'kibana.alert.rule.rule_id',
          },
        },
      },
    ]);
  });

  it('should return values depending for kibana.alert.severity input field', () => {
    const aggregations = groupStatsAggregations('kibana.alert.severity');
    expect(aggregations).toEqual([
      {
        unitsCount: {
          cardinality: {
            field: 'kibana.alert.uuid',
          },
        },
      },
      {
        relatedIntegrationSubAggregation: {
          terms: {
            field: 'relatedIntegration',
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
    const aggregations = groupStatsAggregations('kibana.alert.rule.name');
    expect(aggregations).toEqual([
      {
        unitsCount: {
          cardinality: {
            field: 'kibana.alert.uuid',
          },
        },
      },
      {
        relatedIntegrationSubAggregation: {
          terms: {
            field: 'relatedIntegration',
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
    ]);
  });

  it('should return the default values if the field is not supported', () => {
    const aggregations = groupStatsAggregations('unknown');
    expect(aggregations).toEqual([
      {
        unitsCount: {
          cardinality: {
            field: 'kibana.alert.uuid',
          },
        },
      },
      {
        relatedIntegrationSubAggregation: {
          terms: {
            field: 'relatedIntegration',
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
        rulesCountAggregation: {
          cardinality: {
            field: 'kibana.alert.rule.rule_id',
          },
        },
      },
    ]);
  });
});
