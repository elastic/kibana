/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  CORE_WEB_VITAL,
  CORE_WEB_VITALS,
  type CoreWebVital,
} from '../../../../common/core_web_vitals';
import { SESSIONS_INDEX_PATTERN } from '../../../../common/sessions';
import { p75Of, sumOf } from '../../../lib/helpers/aggregations';
import { environmentFilter, environmentNotDefinedFilter } from '../../../lib/helpers/environment';
import { dateHistogram, type HistogramParams } from '../../../lib/helpers/time_series';
import { MAX_ENVIRONMENTS } from '../../../lib/constants';
import { sessionOverlapFilters } from '../../sessions/list_sessions';
import { MAX_APPLICATIONS_PER_SOURCE, MAX_ENVIRONMENTS_PER_APPLICATION } from '../constants';

export interface SearchParams {
  start: number;
  end: number;
  /** Only this environment's data when set. */
  environment?: string;
  histogram: HistogramParams;
}

const ENVIRONMENT_FIELD = 'environment';

type SessionsSearchRequest = estypes.SearchRequest & {
  index: string;
  size: number;
  track_total_hits: boolean;
};

const PAGE_LOADS = sumOf('page_load_count');

/** Both searches read the same applications: the cap keeps those with the most page loads. */
const applicationsTerms = {
  field: 'service.name',
  size: MAX_APPLICATIONS_PER_SOURCE,
  order: { pageLoads: 'desc' as const },
};

/** The sessions that overlap the time range, without hits. */
const overlappingSessions = ({
  start,
  end,
  filters = [],
}: Pick<SearchParams, 'start' | 'end'> & {
  filters?: estypes.QueryDslQueryContainer[];
}): SessionsSearchRequest => ({
  index: SESSIONS_INDEX_PATTERN,
  size: 0,
  track_total_hits: false,
  // Before sessions are set up there is no index: no applications, which the app explains.
  ignore_unavailable: true,
  // A shard that fails fails the search, so a failure is never shown as lower or zero metrics.
  allow_partial_search_results: false,
  query: {
    bool: {
      filter: [
        ...sessionOverlapFilters({
          start: new Date(start).toISOString(),
          end: new Date(end).toISOString(),
        }),
        ...filters,
      ],
    },
  },
});

/**
 * One vital's samples and how many are good or need improvement (the rest are poor), which add up
 * across sessions. Its p75 is in `sessionsVitalsSearch`.
 */
const vitalAggs = (vital: CoreWebVital) => ({
  filter: { match_all: {} },
  aggs: {
    samples: sumOf(`web_vital_samples.${vital}.count`),
    good: sumOf(`web_vital_samples.${vital}.good`),
    needsImprovement: sumOf(`web_vital_samples.${vital}.needs_improvement`),
  },
});

/**
 * The applications' metrics, the page loads and sessions over time and the environments, from the
 * sessions index: the session summaries add up the raw events per session, so the list never
 * aggregates the raw events itself. A session that overlaps the time range counts in full in the
 * metrics, as its events can't be told apart, but the sessions themselves, and the page loads
 * charted at their start, are those that started in it, so the summary and the chart agree.
 */
export const sessionsSearch = ({
  start,
  end,
  environment,
  histogram,
}: SearchParams): SessionsSearchRequest => {
  const startedInRange: estypes.QueryDslQueryContainer = {
    range: { start_time: { gte: new Date(start).toISOString() } },
  };

  return {
    ...overlappingSessions({ start, end }),
    aggs: {
      // Every environment for the picker, whatever the selected one.
      environments: { terms: { field: ENVIRONMENT_FIELD, size: MAX_ENVIRONMENTS } },
      environmentNotDefined: { filter: environmentNotDefinedFilter([ENVIRONMENT_FIELD]) },
      inEnvironment: {
        filter: environmentFilter([ENVIRONMENT_FIELD], environment),
        aggs: {
          applications: {
            terms: applicationsTerms,
            aggs: {
              environments: {
                terms: { field: ENVIRONMENT_FIELD, size: MAX_ENVIRONMENTS_PER_APPLICATION },
              },
              startedSessions: { filter: startedInRange },
              pageLoads: PAGE_LOADS,
              jsErrors: sumOf('js_error_count'),
              httpRequests: sumOf('http_request_count'),
              failedHttpRequests: sumOf('http_failed_request_count'),
              lcp: vitalAggs(CORE_WEB_VITAL.lcp),
              inp: vitalAggs(CORE_WEB_VITAL.inp),
              cls: vitalAggs(CORE_WEB_VITAL.cls),
              fcp: vitalAggs(CORE_WEB_VITAL.fcp),
              ttfb: vitalAggs(CORE_WEB_VITAL.ttfb),
              lastSeen: { max: { field: 'end_time' } },
            },
          },
          // Only the sessions that started in the range are bucketed: a bucket holds them from its
          // start, so an overlapping session that started in the first bucket but before the
          // range would count as having started in it.
          startedInRange: {
            filter: startedInRange,
            aggs: {
              pageLoadsOverTime: {
                date_histogram: dateHistogram({ start, end, histogram, field: 'start_time' })
                  .date_histogram,
                aggs: { pageLoads: PAGE_LOADS },
              },
            },
          },
        },
      },
    },
  };
};

/**
 * The p75 of each vital per application: the p75 of the sessions' own p75, as a session keeps no
 * more than one. A search of its own, sent alongside `sessionsSearch`: the percentiles are half the
 * cost of the applications' metrics, and Elasticsearch runs each search on a shard in one thread,
 * so the two finish in about half the time of one.
 */
export const sessionsVitalsSearch = ({
  start,
  end,
  environment,
}: Omit<SearchParams, 'histogram'>): SessionsSearchRequest => ({
  ...overlappingSessions({
    start,
    end,
    filters: [environmentFilter([ENVIRONMENT_FIELD], environment)],
  }),
  aggs: {
    applications: {
      terms: applicationsTerms,
      aggs: {
        pageLoads: PAGE_LOADS,
        ...Object.fromEntries(
          CORE_WEB_VITALS.map((vital) => [vital, p75Of(`web_vitals.${vital}`)])
        ),
      },
    },
  },
});
