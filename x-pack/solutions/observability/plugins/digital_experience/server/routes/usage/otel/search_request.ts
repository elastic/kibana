/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery, termsQuery } from '@kbn/es-query';
import { OTEL_EVENT_NAME, SESSION_ID, URL_FULL } from '@kbn/apm-types';
import { TOP_ROWS } from '../../../../common/top_rows';
import { p75Of } from '../../../lib/helpers/aggregations';
import {
  BROWSER_CSS_SELECTOR,
  BROWSER_TAG_NAME,
  EVENT_NAVIGATION_TIMING,
  EVENT_USER_ACTION_CLICK,
  FRUSTRATION_EVENTS,
  NAVIGATION_TIMING_LOAD_EVENT_END,
  OTEL_LOGS_INDEX,
} from '../../../../common/otel_data';
import {
  documentFilters,
  filterFieldOf,
  filterRuntimeMappings,
  pageLoadFilters,
} from '../../../lib/otel/overview_filters';
import {
  applicationDocuments,
  eventCount,
  inEnvironmentFilter,
  otelSearchDefaults,
} from '../../../lib/otel/queries';
import type { ApplicationSearchParams } from '../../application_tab_route';

/** URL candidates per row, as folding URLs into paths leaves fewer rows. */
const PAGE_CANDIDATES_PER_ROW = 3;

const frustrationAggs = {
  byType: { terms: { field: OTEL_EVENT_NAME, size: FRUSTRATION_EVENTS.length } },
  sessions: { cardinality: { field: SESSION_ID } },
};

/**
 * What users load and do in one application: top pages and breakdowns (navigation timings), top
 * clicks and frustration signals, over the selected environment and the Overview's filters. The
 * page filter narrows the page loads and the frustration, which carry a page URL, but not the
 * clicks, which carry none yet. The breakdowns read the fields the filters and the Sessions read,
 * so a row is a value the filter takes.
 */
export const usageSearch = ({
  environment,
  filters = {},
  ...application
}: ApplicationSearchParams) => {
  return {
    ...otelSearchDefaults(OTEL_LOGS_INDEX),
    runtime_mappings: filterRuntimeMappings(),
    query: {
      bool: {
        filter: [
          ...applicationDocuments(application),
          ...termsQuery(OTEL_EVENT_NAME, [
            EVENT_NAVIGATION_TIMING,
            EVENT_USER_ACTION_CLICK,
            ...FRUSTRATION_EVENTS,
          ]),
        ],
      },
    },
    aggs: {
      inEnvironment: {
        filter: inEnvironmentFilter(environment, documentFilters(filters)),
        aggs: {
          pageLoads: {
            filter: {
              bool: {
                filter: [
                  ...termQuery(OTEL_EVENT_NAME, EVENT_NAVIGATION_TIMING),
                  ...pageLoadFilters(filters),
                ],
              },
            },
            aggs: {
              topPages: {
                terms: { field: URL_FULL, size: TOP_ROWS },
                aggs: { loadTime: p75Of(NAVIGATION_TIMING_LOAD_EVENT_END) },
              },
              browsers: { terms: { field: filterFieldOf('browser'), size: TOP_ROWS } },
              operatingSystems: { terms: { field: filterFieldOf('os'), size: TOP_ROWS } },
              devices: { terms: { field: filterFieldOf('device'), size: TOP_ROWS } },
            },
          },
          clicks: {
            ...eventCount(EVENT_USER_ACTION_CLICK),
            aggs: {
              selectors: {
                terms: { field: BROWSER_CSS_SELECTOR, size: TOP_ROWS },
                aggs: { tagName: { terms: { field: BROWSER_TAG_NAME, size: 1 } } },
              },
            },
          },
          frustration: {
            filter: {
              bool: {
                filter: [
                  ...termsQuery(OTEL_EVENT_NAME, [...FRUSTRATION_EVENTS]),
                  ...pageLoadFilters(filters),
                ],
              },
            },
            aggs: {
              ...frustrationAggs,
              elements: {
                terms: { field: BROWSER_CSS_SELECTOR, size: TOP_ROWS },
                aggs: {
                  ...frustrationAggs,
                  tagName: { terms: { field: BROWSER_TAG_NAME, size: 1 } },
                  topPage: { terms: { field: URL_FULL, size: 1 } },
                },
              },
              pages: {
                terms: { field: URL_FULL, size: TOP_ROWS * PAGE_CANDIDATES_PER_ROW },
                aggs: frustrationAggs,
              },
            },
          },
        },
      },
    },
  };
};
