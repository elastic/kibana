/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { partitionFilterValues } from '../../../../common/filter_values';
import type { OverviewFilterName, OverviewFilters } from '../../../../common/overview_filters';
import { SESSIONS_INDEX_PATTERN } from '../../../../common/sessions';
import type { ApplicationEntryPagesResponse } from '../../../../common/types/overview';
import type { CountedTermsAggregation } from '../../../lib/helpers/aggregations';
import { totalHitsOf } from '../../../lib/helpers/values';
import { sessionScopeFilters } from '../../sessions/list_sessions';

/** How many entry pages the Overview lists. */
export const ENTRY_PAGES_SIZE = 10;

/**
 * The summary field of each Overview filter the session summaries have too, which they fill from
 * the same event attributes as the filter (`SESSION_ATTRIBUTE_FIELDS`). The page filters and the
 * KQL query read single events, which a summary doesn't keep.
 */
const SUMMARY_FILTER_FIELDS: ReadonlyArray<readonly [OverviewFilterName, string]> = [
  ['browser', 'user_agent.browser'],
  ['os', 'user_agent.os'],
  ['device', 'user_agent.device'],
  ['country', 'geo.country_iso'],
  ['appVersion', 'service.version'],
];

/** Sessions with any included value of each filter and none of the excluded ones. */
const filterClauses = (filters: OverviewFilters): QueryDslQueryContainer[] =>
  SUMMARY_FILTER_FIELDS.flatMap(([name, field]) => {
    const { include, exclude } = partitionFilterValues(filters[name] ?? []);
    return [
      ...(include.length > 0 ? [{ terms: { [field]: include } }] : []),
      ...(exclude.length > 0 ? [{ bool: { must_not: [{ terms: { [field]: exclude } }] } }] : []),
    ];
  });

interface EntryPageBucket {
  key: string | number;
  doc_count: number;
  bounced: { doc_count: number };
}

interface EntryPagesAggs {
  entry_pages: Omit<CountedTermsAggregation, 'buckets'> & { buckets: EntryPageBucket[] };
}

export const buildEntryPagesRequest = ({
  serviceName,
  start,
  end,
  environment,
  filters = {},
}: {
  serviceName: string;
  start: number;
  end: number;
  environment?: string;
  filters?: OverviewFilters;
}) => ({
  index: SESSIONS_INDEX_PATTERN,
  ignore_unavailable: true,
  allow_no_indices: true,
  size: 0,
  track_total_hits: true,
  query: {
    bool: {
      filter: [
        ...sessionScopeFilters({
          serviceName,
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
          environment,
        }),
        { exists: { field: 'entry_page' } },
        ...filterClauses(filters),
      ],
    },
  },
  aggs: {
    entry_pages: {
      terms: { field: 'entry_page', size: ENTRY_PAGES_SIZE },
      aggs: { bounced: { filter: { term: { bounced: true } } } },
    },
  },
});

/** The pages the application's sessions started on, from the session summaries. */
export const getEntryPages = async (
  client: ElasticsearchClient,
  params: Parameters<typeof buildEntryPagesRequest>[0]
): Promise<ApplicationEntryPagesResponse> => {
  const response: SearchResponse<unknown, EntryPagesAggs> = await client.search(
    buildEntryPagesRequest(params)
  );
  const aggs = response.aggregations;
  return {
    entryPages: (aggs?.entry_pages.buckets ?? []).map((bucket) => ({
      page: String(bucket.key),
      sessions: bucket.doc_count,
      bounceRate: bucket.doc_count > 0 ? bucket.bounced.doc_count / bucket.doc_count : 0,
    })),
    totalSessions: totalHitsOf(response.hits.total),
  };
};
