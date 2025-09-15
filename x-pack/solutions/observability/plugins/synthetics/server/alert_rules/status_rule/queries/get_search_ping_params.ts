/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsTopHitsAggregation,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { createEsParams } from '../../../lib';
import {
  FINAL_SUMMARY_FILTER,
  SUMMARY_FILTER,
  getRangeFilter,
} from '../../../../common/constants/client_defaults';

export const getSearchPingsParams = ({
  idsToQuery,
  idSize,
  monitorLocationIds,
  range,
  numberOfChecks,
  includeRetests,
}: {
  idsToQuery: string[];
  idSize: number;
  monitorLocationIds: string[];
  range: { from: string; to: string };
  numberOfChecks: number;
  includeRetests: boolean;
}) => {
  // Filters for pings
  const queryFilters: QueryDslQueryContainer[] = [
    ...(includeRetests ? [SUMMARY_FILTER] : [FINAL_SUMMARY_FILTER]),
    getRangeFilter({ from: range.from, to: range.to }),
    {
      terms: {
        'monitor.id': idsToQuery,
      },
    },
  ];

  // For each ping we want to get the monitor id as an aggregation and the location as a sub-aggregation
  // The location aggregation will have a filter for down checks and a top hits aggregation to get the latest ping

  // Total checks per location per monitor
  const totalChecks: AggregationsTopHitsAggregation = {
    size: numberOfChecks,
    sort: [
      {
        '@timestamp': {
          order: 'desc',
        },
      },
    ],
    _source: {
      includes: [
        '@timestamp',
        'summary',
        'monitor',
        'observer',
        'config_id',
        'error',
        'agent',
        'url',
        'state',
        'tags',
        'service',
        'labels',
      ],
    },
  };

  // Down checks per location per monitor
  const downChecks: QueryDslQueryContainer = {
    range: {
      'summary.down': {
        gte: '1',
      },
    },
  };

  const locationAggs = {
    downChecks: {
      filter: downChecks,
    },
    totalChecks: {
      top_hits: totalChecks,
    },
  };

  const idAggs = {
    location: {
      terms: {
        field: 'observer.name',
        size: monitorLocationIds.length || 100,
      },
      aggs: locationAggs,
    },
  };

  const pingAggs = {
    id: {
      terms: {
        field: 'monitor.id',
        size: idSize,
      },
      aggs: idAggs,
    },
  };

  const params = createEsParams({
    body: {
      size: 0,
      query: {
        bool: {
          filter: queryFilters,
        },
      },
      aggs: pingAggs,
    },
  });

  if (monitorLocationIds.length > 0) {
    params.body.query.bool.filter.push({
      terms: {
        'observer.name': monitorLocationIds,
      },
    });
  }

  return params;
};
