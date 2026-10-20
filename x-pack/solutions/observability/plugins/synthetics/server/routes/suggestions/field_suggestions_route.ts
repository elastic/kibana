/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  FINAL_SUMMARY_FILTER,
} from '../../../common/constants/client_defaults';
import type { FieldSuggestionsResult } from '../../../common/runtime_types';
import type { SyntheticsRestApiRouteFactory } from '../types';

// One collapsed doc per monitor keeps the label-key sample representative
// across monitors instead of being dominated by the most active ones.
const MONITOR_SAMPLE_SIZE = 1000;
const SERVICE_NAME_LIMIT = 500;

interface ServiceNameAggs {
  serviceNames?: {
    buckets: Array<{ key: string }>;
  };
}

/**
 * Type-ahead suggestions for bulk edit fields that are not aggregatable on the
 * monitor saved objects. `service.name` and monitor `labels` are added to
 * heartbeat documents, so we source their values from `synthetics-*` pings:
 * - service names via a terms aggregation, and
 * - label keys by sampling one recent document per monitor and unioning the
 *   keys of the `labels` object (label values are intentionally not returned).
 */
export const getSyntheticsFieldSuggestionsRoute: SyntheticsRestApiRouteFactory<
  FieldSuggestionsResult
> = () => ({
  method: 'GET',
  writeAccess: false,
  path: SYNTHETICS_API_URLS.FIELD_SUGGESTIONS,
  validate: {},
  handler: async ({ syntheticsEsClient, spaceId }): Promise<FieldSuggestionsResult> => {
    const { body } = await syntheticsEsClient.search({
      size: MONITOR_SAMPLE_SIZE,
      _source: ['labels'],
      collapse: { field: 'monitor.id' },
      sort: [{ '@timestamp': { order: 'desc' } }],
      query: {
        bool: {
          filter: [
            FINAL_SUMMARY_FILTER,
            EXCLUDE_RUN_ONCE_FILTER,
            { terms: { 'meta.space_id': [spaceId, ALL_SPACES_ID] } },
          ],
        },
      },
      aggs: {
        serviceNames: {
          terms: { field: 'service.name', size: SERVICE_NAME_LIMIT, exclude: [''] },
        },
      },
    });

    const aggs = body.aggregations as ServiceNameAggs | undefined;
    const serviceNames = (aggs?.serviceNames?.buckets ?? []).map(({ key }) => key).sort();

    const labelKeys = new Set<string>();
    for (const hit of body.hits.hits) {
      const labels = (hit._source as { labels?: Record<string, unknown> } | undefined)?.labels;
      if (labels) {
        for (const key of Object.keys(labels)) {
          labelKeys.add(key);
        }
      }
    }

    return {
      serviceNames,
      labelKeys: Array.from(labelKeys).sort(),
    };
  },
});
