/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, getOr } from 'lodash/fp';
import type { IEsSearchResponse } from '@kbn/search-types';
import { buildAlertFieldsRequest as buildFieldsRequest } from '@kbn/alerts-as-data-utils';
import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { TimelineEventsQueries } from '../../../../../../common/api/search_strategy';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import {
  EventHit,
  TimelineEventsAllStrategyResponse,
} from '../../../../../../common/search_strategy';
import { TimelineFactory } from '../../types';
import { buildTimelineEventsAllQuery } from './query.events_all.dsl';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import { formatTimelineData } from '../../helpers/format_timeline_data';

export const timelineEventsAll: TimelineFactory<TimelineEventsQueries.all> = {
  buildDsl: ({ authFilter, ...options }) => {
    if (options.pagination && options.pagination.querySize > DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    const { fieldRequested, ...queryOptions } = cloneDeep(options);
    queryOptions.fields = buildFieldsRequest(fieldRequested, queryOptions.excludeEcsData);
    return buildTimelineEventsAllQuery({ ...queryOptions, authFilter });
  },
  parse: async (
    options,
    response: IEsSearchResponse<unknown>
  ): Promise<TimelineEventsAllStrategyResponse> => {
    // eslint-disable-next-line prefer-const
    let { fieldRequested, ...queryOptions } = cloneDeep(options);
    queryOptions.fields = buildFieldsRequest(fieldRequested, queryOptions.excludeEcsData);

    const {
      pagination: { activePage, querySize } = {
        activePage: undefined,
        querySize: DEFAULT_MAX_TABLE_QUERY_SIZE,
      },
    } = options;
    const producerBuckets = getOr([], 'aggregations.producers.buckets', response.rawResponse);
    const totalCount = response.rawResponse.hits.total || 0;
    const hits: SearchHit[] = getOr([], 'rawResponse.hits.hits', response);

    if (fieldRequested.includes('*') && hits.length > 0) {
      const fieldsReturned = hits.flatMap((hit) => Object.keys(hit.fields ?? {}));
      fieldRequested = [...new Set(fieldsReturned)];
    }

    const edges = await formatTimelineData(
      hits as EventHit[],
      fieldRequested,
      options.excludeEcsData ?? false
    );

    const consumers = producerBuckets.reduce(
      (acc: Record<string, number>, b: { key: string; doc_count: number }) => {
        acc[b.key] = b.doc_count;
        return acc;
      },
      {}
    );

    const inspect = {
      dsl: [inspectStringifyObject(buildTimelineEventsAllQuery(queryOptions))],
    };

    return {
      ...response,
      consumers,
      inspect,
      edges,
      // @ts-expect-error code doesn't handle TotalHits
      totalCount,
      pageInfo: {
        activePage: activePage ?? 0,
        querySize,
      },
    };
  },
};
