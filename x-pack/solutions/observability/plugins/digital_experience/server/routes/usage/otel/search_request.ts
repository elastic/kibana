/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery, termsQuery } from '@kbn/es-query';
import { OTEL_EVENT_NAME, SESSION_ID, URL_FULL } from '@kbn/apm-types';
import { CORE_WEB_VITAL, type CoreWebVital } from '../../../../common/core_web_vitals';
import { SOURCE_URL_TEMPLATE_FIELD } from '../../../../common/otel_source_fields';
import { TOP_ROWS } from '../../../../common/top_rows';
import { p75Of } from '../../../lib/helpers/aggregations';
import {
  BROWSER_CSS_SELECTOR,
  BROWSER_TAG_NAME,
  EVENT_EXCEPTION,
  EVENT_NAVIGATION_TIMING,
  EVENT_USER_ACTION_CLICK,
  EVENT_WEB_VITAL,
  FRUSTRATION_EVENTS,
  NAVIGATION_TIMING_LOAD_EVENT_END,
  OTEL_LOGS_INDEX,
  WEB_VITAL_NAME,
  WEB_VITAL_VALUE,
} from '../../../../common/otel_data';
import {
  documentFilters,
  filterFieldOf,
  filterRuntimeMappings,
  pageLoadFilters,
} from '../../../lib/otel/overview_filters';
import {
  applicationDocuments,
  byEnvironment,
  eventCount,
  otelSearchDefaults,
} from '../../../lib/otel/queries';
import type { ApplicationSearchParams } from '../../application_tab_route';

/**
 * Candidates per row: folding URLs into paths leaves fewer rows, and the pages with the most web
 * vitals and errors need not be those loaded the most.
 */
const PAGE_CANDIDATES_PER_ROW = 3;

/** The 75th percentile of one web vital among the events of a page. */
const pageVital = (vital: CoreWebVital) => ({
  filter: { term: { [WEB_VITAL_NAME]: { value: vital, case_insensitive: true } } },
  aggs: { value: p75Of(WEB_VITAL_VALUE) },
});

const frustrationAggs = {
  byType: { terms: { field: OTEL_EVENT_NAME, size: FRUSTRATION_EVENTS.length } },
  sessions: { cardinality: { field: SESSION_ID } },
};

/**
 * What users load and do in one application: top pages and breakdowns (navigation timings), top
 * clicks, frustration signals and the web vitals and JS errors of the pages, over the selected
 * environment and the Overview's filters. The
 * filter on the URL text narrows the page loads and the frustration, which carry a URL, but not
 * the clicks. The breakdowns read the fields the filters and the Sessions read,
 * so a row is a value the filter takes. The environments for the picker ignore the selected one and
 * the filters, not the KQL query.
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
            EVENT_WEB_VITAL,
            EVENT_EXCEPTION,
          ]),
        ],
      },
    },
    aggs: byEnvironment(
      environment,
      {
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
              terms: { field: filterFieldOf('pageUrl'), size: TOP_ROWS },
              aggs: { loadTime: p75Of(NAVIGATION_TIMING_LOAD_EVENT_END) },
            },
            browsers: { terms: { field: filterFieldOf('browser'), size: TOP_ROWS } },
            operatingSystems: { terms: { field: filterFieldOf('os'), size: TOP_ROWS } },
            devices: { terms: { field: filterFieldOf('device'), size: TOP_ROWS } },
          },
        },
        // The web vitals and JS errors of the top pages, joined to them by the route: they carry
        // the route of their page but no URL, so the pages of an app that reports no route have
        // none. The indexed route, not the page's runtime field: its URL fallback adds nothing here.
        pageSignals: {
          filter: {
            bool: { filter: termsQuery(OTEL_EVENT_NAME, [EVENT_WEB_VITAL, EVENT_EXCEPTION]) },
          },
          aggs: {
            pages: {
              terms: { field: SOURCE_URL_TEMPLATE_FIELD, size: TOP_ROWS * PAGE_CANDIDATES_PER_ROW },
              aggs: {
                lcp: pageVital(CORE_WEB_VITAL.lcp),
                inp: pageVital(CORE_WEB_VITAL.inp),
                cls: pageVital(CORE_WEB_VITAL.cls),
                jsErrors: { filter: { term: { [OTEL_EVENT_NAME]: EVENT_EXCEPTION } } },
              },
            },
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
      documentFilters(filters)
    ),
  };
};
