/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IngestProcessorContainer,
  IngestPutPipelineRequest,
} from '@elastic/elasticsearch/lib/api/types';
import {
  getSLIIndexNamePrefix,
  getSLIRoutingPipelineName,
  SLO_RESOURCES_VERSION,
} from '../../../common/constants';
import type { SliRoutingState } from '../../services/sli_routing_state';

const TIMESTAMP_FORMATS = ['UNIX_MS', 'ISO8601', "yyyy-MM-dd'T'HH:mm:ss.SSSXX"];

// Picks the index rounding of a document: `before` when its @timestamp is older than the cutover, `after` otherwise.
// Reads the timestamp normalized by the date processor, so every format of TIMESTAMP_FORMATS is supported.
export const ROUTING_SCRIPT =
  'long ms = ZonedDateTime.parse(ctx.slo_routing.timestamp).toInstant().toEpochMilli(); ' +
  'ctx.slo_routing.rounding = (params.cutover != null && ms < params.cutover) ? params.before : params.after;';

/** Returns the processor calling the shared routing pipeline of a resources version. */
export const getSLIRoutingProcessor = (version: number): IngestProcessorContainer => ({
  pipeline: {
    description: 'Route to the time-based SLI index',
    name: getSLIRoutingPipelineName(version),
  },
});

/** Returns the shared routing pipeline of a resources version, routing SLI documents to time-based indices. */
export const getSLIRoutingPipelineTemplate = (
  version: number,
  routing: SliRoutingState
): IngestPutPipelineRequest => ({
  id: getSLIRoutingPipelineName(version),
  description: 'Routes SLO rollup documents to time-based SLI indices',
  processors: [
    {
      date: {
        description: 'Normalize the timestamp for the cutover guard',
        field: '@timestamp',
        target_field: 'slo_routing.timestamp',
        formats: TIMESTAMP_FORMATS,
        output_format: "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
      },
    },
    {
      script: {
        description: 'Pick the index rounding, honoring the cutover guard',
        lang: 'painless',
        params: { before: routing.before, after: routing.after, cutover: routing.cutover },
        source: ROUTING_SCRIPT,
      },
    },
    {
      date_index_name: {
        field: '@timestamp',
        index_name_prefix: getSLIIndexNamePrefix(version),
        date_rounding: '{{{slo_routing.rounding}}}',
        date_formats: TIMESTAMP_FORMATS,
      },
    },
    {
      remove: {
        field: 'slo_routing',
        ignore_missing: true,
      },
    },
  ],
  _meta: {
    description: 'SLO SLI index routing',
    version,
    template_version: SLO_RESOURCES_VERSION,
    routing,
    managed: true,
    managed_by: 'observability',
  },
});
