/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewBase } from '@kbn/es-query';
import { buildEsQuery } from './build_es_query';

describe('buildEsQuery', () => {
  const from = '2022-08-30T15:23:23.721Z';
  const to = '2022-08-30T15:38:28.171Z';
  const defaultTimeRange = {
    from,
    to,
  };
  const testData = [
    {
      timeRange: defaultTimeRange,
      kuery: '',
    },
    {
      timeRange: defaultTimeRange,
    },
    {
      timeRange: defaultTimeRange,
      kuery: 'nestedField: { child: "something" }',
    },
    {
      timeRange: defaultTimeRange,
      kuery: 'kibana.alert.status: "active"',
    },
    {
      timeRange: defaultTimeRange,
      kuery: 'kibana.alert.status: "recovered" and kibana.alert.duration.us >= 120',
    },
    {
      timeRange: defaultTimeRange,
      kuery: 'kibana.alert.status: "recovered" and kibana.alert.duration.us >= 120',
      filters: [
        {
          meta: {},
          query: {
            'service.name': {
              value: 'synth-node-0',
            },
          },
        },
      ],
    },
  ];

  test.each(testData)(
    'should generate correct es query for %j',
    ({ kuery, timeRange, filters }) => {
      expect(buildEsQuery({ timeRange, kuery, filters })).toMatchSnapshot();
    }
  );

  test('should use wildcard query instead of query_string for keyword fields when indexPattern is provided', () => {
    const indexPattern: DataViewBase = {
      title: '.alerts-*',
      fields: [
        {
          name: 'kibana.alert.rule.name',
          type: 'string',
          esTypes: ['keyword'],
        },
      ],
    };

    const result = buildEsQuery({
      timeRange: defaultTimeRange,
      kuery: 'kibana.alert.rule.name: *threshold rule',
      indexPattern,
      config: { allowLeadingWildcards: true },
    });

    const filterClauses = result.bool.filter;
    const kueryClause = filterClauses.find((clause) => clause && !('range' in clause));

    expect(kueryClause).toEqual({
      bool: {
        should: [
          {
            wildcard: {
              'kibana.alert.rule.name': {
                value: '*threshold rule',
              },
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  });

  test('should use query_string for wildcard values when no indexPattern is provided', () => {
    const result = buildEsQuery({
      timeRange: defaultTimeRange,
      kuery: 'kibana.alert.rule.name: *threshold rule',
      config: { allowLeadingWildcards: true },
    });

    const filterClauses = result.bool.filter;
    const kueryClause = filterClauses.find((clause) => clause && !('range' in clause));

    expect(kueryClause).toEqual({
      bool: {
        should: [
          {
            query_string: {
              fields: ['kibana.alert.rule.name'],
              query: '*threshold rule',
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  });
});
