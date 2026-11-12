/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { dateRangeQuery } from '@kbn/es-query';
import { CORE_WEB_VITAL, type CoreWebVital } from '../../../../common/core_web_vitals';
import { SESSIONS_INDEX_PATTERN } from '../../../../common/sessions';
import { p75Of } from '../../../lib/helpers/aggregations';
import { environmentFilter, environmentNotDefinedFilter } from '../../../lib/helpers/environment';
import { dateHistogram } from '../../../lib/helpers/time_series';
import { MAX_ENVIRONMENTS } from '../../../lib/constants';
import { MAX_APPLICATIONS_PER_SOURCE, MAX_ENVIRONMENTS_PER_APPLICATION } from '../constants';
import type { SearchParams } from './search_requests';

const ENVIRONMENT_FIELD = 'environment';

const sum = (field: string) => ({ sum: { field } });

/**
 * One vital's samples and how many are good or need improvement (the rest are poor), which add up
 * across sessions, and the p75 of the sessions' own p75, as a session keeps no more than one.
 */
const vitalAggs = (vital: CoreWebVital) => ({
  filter: { match_all: {} },
  aggs: {
    samples: sum(`web_vital_samples.${vital}.count`),
    good: sum(`web_vital_samples.${vital}.good`),
    needsImprovement: sum(`web_vital_samples.${vital}.needs_improvement`),
    p75: p75Of(`web_vitals.${vital}`),
  },
});

/**
 * The applications' metrics, the page loads over time and the environments, from the sessions
 * index in one search: the numbers `logsSearch` and `spansSearch` find in the raw events, which the
 * sessions transform adds up per session. A session that overlaps the time range counts in full,
 * and its page loads are charted at its start.
 */
export const sessionsSearch = ({
  start,
  end,
  environment,
}: SearchParams): estypes.SearchRequest => ({
  index: SESSIONS_INDEX_PATTERN,
  size: 0,
  track_total_hits: false,
  // The caller has checked that the sessions are set up; a missing index is empty data.
  ignore_unavailable: true,
  // A shard that fails fails the search, so a failure is never shown as lower or zero metrics.
  allow_partial_search_results: false,
  query: {
    bool: {
      filter: [
        ...dateRangeQuery(undefined, end, 'start_time'),
        ...dateRangeQuery(start, undefined, 'end_time'),
      ],
    },
  },
  aggs: {
    // Every environment for the picker, whatever the selected one.
    environments: { terms: { field: ENVIRONMENT_FIELD, size: MAX_ENVIRONMENTS } },
    environmentNotDefined: { filter: environmentNotDefinedFilter([ENVIRONMENT_FIELD]) },
    inEnvironment: {
      filter: environmentFilter([ENVIRONMENT_FIELD], environment),
      aggs: {
        applications: {
          terms: {
            field: 'service.name',
            size: MAX_APPLICATIONS_PER_SOURCE,
            // The cap keeps the applications with the most page loads.
            order: { pageLoads: 'desc' },
          },
          aggs: {
            environments: {
              terms: { field: ENVIRONMENT_FIELD, size: MAX_ENVIRONMENTS_PER_APPLICATION },
            },
            pageLoads: sum('page_load_count'),
            jsErrors: sum('js_error_count'),
            httpRequests: sum('http_request_count'),
            failedHttpRequests: sum('http_failed_request_count'),
            lcp: vitalAggs(CORE_WEB_VITAL.lcp),
            inp: vitalAggs(CORE_WEB_VITAL.inp),
            cls: vitalAggs(CORE_WEB_VITAL.cls),
            fcp: vitalAggs(CORE_WEB_VITAL.fcp),
            ttfb: vitalAggs(CORE_WEB_VITAL.ttfb),
            lastSeen: { max: { field: 'end_time' } },
          },
        },
        pageLoadsOverTime: {
          date_histogram: {
            ...dateHistogram(start, end, 'start_time').date_histogram,
            // The buckets of the range only, like the raw events', as sessions may start before it.
            hard_bounds: { min: start, max: end },
          },
          aggs: { pageLoads: sum('page_load_count') },
        },
      },
    },
  },
});
