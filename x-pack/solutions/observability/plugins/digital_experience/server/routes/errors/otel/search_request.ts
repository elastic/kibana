/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { EXCEPTION_MESSAGE, EXCEPTION_TYPE } from '@kbn/apm-types';
import { TOP_ROWS } from '../../../../common/top_rows';
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

/** A missing stack trace's key, the same as an empty one, so both form one group per type. */
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
 * A stack trace over the field's `ignore_above` is not indexed and falls in no group.
 */
export const errorsSearch = ({
  environment,
  ...application
}: ApplicationSearchParams): estypes.SearchRequest => {
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
                { field: EXCEPTION_TYPE },
                { field: EXCEPTION_STACKTRACE, missing: NO_STACKTRACE },
              ],
              size: TOP_ROWS,
            },
            aggs: ERROR_GROUP_AGGS,
          },
        },
      },
    }),
  };
};
