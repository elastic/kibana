/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IngestPipeline,
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

// Picks the index rounding of a document: the rounding of the last segment starting at or before its @timestamp.
// Reads the timestamp normalized by the date processor, so every format of TIMESTAMP_FORMATS is supported.
export const ROUTING_SCRIPT =
  'long ms = ZonedDateTime.parse(ctx.slo_routing.timestamp).toInstant().toEpochMilli(); ' +
  'String rounding = null; ' +
  'for (def segment : params.segments) { ' +
  'if (segment.from == null || ms >= segment.from) { rounding = segment.rounding; } ' +
  '} ' +
  'ctx.slo_routing.rounding = rounding;';

/** Returns the processor calling the shared routing pipeline of a resources version. */
export const getSLIRoutingProcessor = (version: number): IngestProcessorContainer => ({
  pipeline: {
    description: 'Route to the time-based SLI index',
    name: getSLIRoutingPipelineName(version),
  },
});

/** Tells whether an installed routing pipeline matches the current template of its resources version. */
export const isSLIRoutingPipelineCurrent = (
  { _meta: meta }: IngestPipeline,
  version: number
): boolean => meta?.version === version && meta?.template_version === SLO_RESOURCES_VERSION;

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
        description: 'Normalize the timestamp for the rounding segments',
        field: '@timestamp',
        target_field: 'slo_routing.timestamp',
        formats: TIMESTAMP_FORMATS,
        output_format: "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
      },
    },
    {
      script: {
        description: 'Pick the index rounding of the timestamp segment',
        lang: 'painless',
        params: { segments: routing.segments },
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
