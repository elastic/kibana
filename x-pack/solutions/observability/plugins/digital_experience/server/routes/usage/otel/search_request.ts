/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termsQuery } from '@kbn/es-query';
import { OTEL_EVENT_NAME, URL_FULL } from '@kbn/apm-types';
import { TOP_ROWS } from '../../../../common/top_rows';
import { p75Of } from '../../../lib/helpers/aggregations';
import { environmentFilter } from '../../../lib/helpers/environment';
import {
  BROWSER_CSS_SELECTOR,
  BROWSER_MOBILE,
  BROWSER_NAME,
  BROWSER_PLATFORM,
  BROWSER_TAG_NAME,
  EVENT_NAVIGATION_TIMING,
  EVENT_USER_ACTION_CLICK,
  NAVIGATION_TIMING_LOAD_EVENT_END,
  OTEL_LOGS_INDEX,
} from '../../../../common/otel_data';
import {
  ENVIRONMENT_FIELDS,
  applicationDocuments,
  eventCount,
  otelSearchDefaults,
} from '../../../lib/otel/queries';
import type { ApplicationSearchParams } from '../../application_tab_route';

/** Device types: `browser.mobile` is `true` or `false`. */
const DEVICE_TYPES = 2;

/**
 * What users load and do in one application: top pages and breakdowns (navigation timings) and top
 * clicks, over the selected environment only.
 */
export const usageSearch = ({ environment, ...application }: ApplicationSearchParams) => {
  return {
    ...otelSearchDefaults(OTEL_LOGS_INDEX),
    query: {
      bool: {
        filter: [
          ...applicationDocuments(application),
          ...termsQuery(OTEL_EVENT_NAME, [EVENT_NAVIGATION_TIMING, EVENT_USER_ACTION_CLICK]),
        ],
      },
    },
    aggs: {
      inEnvironment: {
        filter: environmentFilter(ENVIRONMENT_FIELDS, environment),
        aggs: {
          pageLoads: {
            ...eventCount(EVENT_NAVIGATION_TIMING),
            aggs: {
              topPages: {
                terms: { field: URL_FULL, size: TOP_ROWS },
                aggs: { loadTime: p75Of(NAVIGATION_TIMING_LOAD_EVENT_END) },
              },
              browsers: { terms: { field: BROWSER_NAME, size: TOP_ROWS } },
              operatingSystems: { terms: { field: BROWSER_PLATFORM, size: TOP_ROWS } },
              devices: { terms: { field: BROWSER_MOBILE, size: DEVICE_TYPES } },
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
        },
      },
    },
  };
};
