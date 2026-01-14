/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { DEFAULT_TRANSFORM_FREQUENCY, DEFAULT_TRANSFORM_DELAY } from '../../../../common/endpoint_assets';
import { getDriftEventsIndexPattern } from './drift_events_index';
import { getDriftEventsPipelineId } from './drift_events_pipeline';

/**
 * Drift Events Transform Configuration
 *
 * This transform:
 * - Reads from logs-osquery_manager.result-{namespace} (osquery results)
 * - Filters for documents with osquery.action field (differential mode results)
 * - Filters for drift queries (query name starts with "Drift –")
 * - Enriches with drift metadata via ingest pipeline
 * - Outputs to endpoint-drift-events-{namespace}
 *
 * Transform is continuous (not batch) to capture drift events as they occur.
 */

export const DRIFT_EVENTS_TRANSFORM_PREFIX = 'endpoint-drift-events';

export const getDriftEventsTransformId = (namespace: string): string =>
  `${DRIFT_EVENTS_TRANSFORM_PREFIX}-${namespace}`;

export const getDriftEventsTransformConfig = (namespace: string): TransformPutTransformRequest => ({
  transform_id: getDriftEventsTransformId(namespace),
  description:
    'Extracts drift events from osquery differential query results for endpoint drift detection',
  source: {
    index: [`logs-osquery_manager.result-${namespace}`],
    query: {
      bool: {
        must: [
          { exists: { field: 'osquery.action' } },
          { exists: { field: 'host.id' } },
        ],
        should: [
          { term: { 'osquery.action': 'added' } },
          { term: { 'osquery.action': 'removed' } },
          { term: { 'osquery.action': 'changed' } },
        ],
        minimum_should_match: 1,
        filter: [
          {
            bool: {
              should: [
                { prefix: { 'action_data.query': 'drift_privileges' } },
                { prefix: { 'action_data.query': 'drift_persistence' } },
                { prefix: { 'action_data.query': 'drift_network' } },
                { prefix: { 'action_data.query': 'drift_software' } },
                { prefix: { 'action_data.query': 'drift_posture' } },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
  },
  dest: {
    index: getDriftEventsIndexPattern(namespace),
    pipeline: getDriftEventsPipelineId(namespace),
  },
  latest: {
    unique_key: ['_id'],
    sort: '@timestamp',
  },
  frequency: DEFAULT_TRANSFORM_FREQUENCY,
  sync: {
    time: {
      field: '@timestamp',
      delay: DEFAULT_TRANSFORM_DELAY,
    },
  },
  settings: {
    max_page_search_size: 1000,
    docs_per_second: null,
  },
  _meta: {
    version: '1.0.0',
    managed: true,
    managed_by: 'endpoint_assets',
    created_at: new Date().toISOString(),
    description: 'Drift events extraction from osquery differential results',
  },
});
