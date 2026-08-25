/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_STACK_BY_FIELD1_SIZE, getAlertsRiskQuery, getOptionalSubAggregation } from '.';

describe('query', () => {
  describe('getOptionalSubAggregation', () => {
    it('returns the expected sub aggregation', () => {
      expect(
        getOptionalSubAggregation({
          stackByField1: 'host.name',
          stackByField1Size: DEFAULT_STACK_BY_FIELD1_SIZE,
        })
      ).toEqual({
        stackByField1: {
          terms: {
            field: 'host.name',
            order: {
              _count: 'desc',
            },
            size: 1000,
          },
        },
      });
    });
  });

  describe('getAlertsRiskQuery', () => {
    it('returns the expected query', () => {
      expect(
        getAlertsRiskQuery({
          additionalFilters: [
            {
              bool: {
                must: [],
                filter: [{ term: { 'kibana.alert.workflow_status': 'open' } }],
                should: [],
                must_not: [{ exists: { field: 'kibana.alert.building_block_type' } }],
              },
            },
          ],
          from: '2021-03-10T07:00:00.000Z',
          runtimeMappings: {},
          stackByField0: 'kibana.alert.rule.name',
          stackByField0Size: 1000,
          stackByField1: 'host.name',
          stackByField1Size: 1000,
          riskSubAggregationField: 'signal.rule.risk_score',
          to: '2022-03-11T06:13:10.002Z',
        })
      ).toEqual({
        aggs: {
          stackByField0: {
            aggs: {
              maxRiskSubAggregation: {
                max: {
                  field: 'signal.rule.risk_score',
                },
              },
              stackByField1: {
                terms: {
                  field: 'host.name',
                  order: {
                    _count: 'desc',
                  },
                  size: 1000,
                },
              },
            },
            terms: {
              field: 'kibana.alert.rule.name',
              order: {
                _count: 'desc',
              },
              size: 1000,
            },
          },
        },
        query: {
          bool: {
            filter: [
              {
                bool: {
                  filter: [
                    {
                      term: {
                        'kibana.alert.workflow_status': 'open',
                      },
                    },
                  ],
                  must: [],
                  must_not: [
                    {
                      exists: {
                        field: 'kibana.alert.building_block_type',
                      },
                    },
                  ],
                  should: [],
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: '2021-03-10T07:00:00.000Z',
                    lte: '2022-03-11T06:13:10.002Z',
                  },
                },
              },
            ],
          },
        },
        runtime_mappings: {},
        size: 0,
      });
    });
  });
});
