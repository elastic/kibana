/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */
import type { DataViewBase } from '@kbn/es-query';
import { Aggregators } from '../../../../../common/custom_threshold_rule/types';
import { createCustomMetricsAggregations } from './create_custom_metrics_aggregations';

describe('createCustomMetricsAggregations', () => {
  const dataView: DataViewBase = {
    title: 'logs-*',
    fields: [
      {
        name: 'machine.os.keyword',
        type: 'string',
        esTypes: ['keyword'],
      },
    ],
  };

  it('uses wildcard query for keyword wildcard metric filter when data view is provided', () => {
    const aggregations = createCustomMetricsAggregations(
      'aggregatedValue',
      [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
          filter: 'machine.os.keyword: *win 7*',
        },
      ],
      { start: 0, end: 1 },
      '@timestamp',
      undefined,
      dataView
    );

    expect(aggregations).toMatchObject({
      aggregatedValue_A: {
        filter: {
          bool: {
            should: [
              {
                wildcard: {
                  'machine.os.keyword': {
                    value: '*win 7*',
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      },
    });
  });

  it('does not fallback to query_string for keyword wildcard metric filter', () => {
    const aggregations = createCustomMetricsAggregations(
      'aggregatedValue',
      [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
          filter: 'machine.os.keyword: *win 7*',
        },
      ],
      { start: 0, end: 1 },
      '@timestamp',
      undefined,
      dataView
    );

    expect(aggregations).toEqual(
      expect.not.objectContaining({
        aggregatedValue_A: expect.objectContaining({
          filter: expect.objectContaining({
            query_string: expect.anything(),
          }),
        }),
      })
    );
  });
});
