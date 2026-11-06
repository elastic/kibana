/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_MESSAGE, EXCEPTION_TYPE } from '@kbn/apm-types';
import { ERROR_GROUPS_ROWS } from '../../../../common/top_rows';
import {
  EVENT_EXCEPTION,
  EXCEPTION_STACKTRACE,
  OTEL_LOGS_INDEX,
} from '../../../../common/otel_data';
import { LAST_SEEN_AGGREGATION } from '../../../lib/helpers/aggregations';
import {
  applicationDocuments,
  byEnvironment,
  eventCount,
  otelSearchDefaults,
} from '../../../lib/otel/queries';
import type { ApplicationSearchParams } from '../../application_tab_route';

/** The group key of a missing type, shared with empty ones. */
export const NO_TYPE = '';

/** The group key of a missing stack trace, shared with empty ones. */
export const NO_STACKTRACE = '';

const ERROR_GROUP_AGGS = {
  message: {
    top_hits: {
      size: 1,
      _source: false,
      fields: [EXCEPTION_MESSAGE],
      sort: [{ '@timestamp': { order: 'desc' as const } }],
    },
  },
  lastSeen: LAST_SEEN_AGGREGATION,
};

/**
 * One application's JS errors by type and stack trace, and its environments with browser data.
 *
 * The message is never a group: it often holds ids or values that would split one error into many.
 * A stack trace over the index's `ignore_above` is not indexed, so it counts as missing.
 */
export const errorsSearch = ({ environment, ...application }: ApplicationSearchParams) => {
  return {
    ...otelSearchDefaults(OTEL_LOGS_INDEX),
    query: {
      bool: {
        filter: applicationDocuments(application),
      },
    },
    aggs: byEnvironment(environment, {
      exceptions: {
        ...eventCount(EVENT_EXCEPTION),
        aggs: {
          groups: {
            multi_terms: {
              terms: [
                // OTel allows an exception with only a message.
                { field: EXCEPTION_TYPE, missing: NO_TYPE },
                { field: EXCEPTION_STACKTRACE, missing: NO_STACKTRACE },
              ],
              size: ERROR_GROUPS_ROWS,
            },
            aggs: ERROR_GROUP_AGGS,
          },
        },
      },
    }),
  };
};
