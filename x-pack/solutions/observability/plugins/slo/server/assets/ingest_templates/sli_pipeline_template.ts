/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import { ALL_VALUE } from '@kbn/slo-schema';
import { getSLOPipelineId, SLO_RESOURCES_VERSION } from '../../../common/constants';
import type { SLODefinition } from '../../domain/models';
import { getSLIRoutingProcessor } from './sli_routing_pipeline_template';

export const getSLIPipelineTemplate = (
  slo: SLODefinition,
  spaceId: string
): IngestPutPipelineRequest => {
  // remove empty string
  const groupByFields = [slo.groupBy].flat().filter((field) => !!field);

  return {
    id: getSLOPipelineId(slo.id, slo.revision),
    description: `Ingest pipeline for SLO rollup data [id: ${slo.id}, revision: ${slo.revision}]`,
    processors: [
      {
        set: {
          field: '_id',
          value: `{{{_id}}}-${slo.id}-${slo.revision}`,
        },
      },
      {
        set: {
          field: 'event.ingested',
          value: '{{{_ingest.timestamp}}}',
        },
      },
      {
        set: {
          field: 'slo.id',
          value: slo.id,
        },
      },
      {
        set: {
          field: 'slo.name',
          value: slo.name,
        },
      },
      {
        set: {
          field: 'slo.tags',
          value: slo.tags,
        },
      },
      {
        set: {
          field: 'slo.revision',
          value: slo.revision,
        },
      },
      {
        set: {
          field: 'spaceId',
          value: spaceId,
        },
      },
      getSLIRoutingProcessor(SLO_RESOURCES_VERSION),
      {
        dot_expander: {
          path: 'slo.groupings',
          field: '*',
          ignore_failure: true,
          if: 'ctx.slo.groupings != null',
        },
      },
      {
        set: {
          description: 'Generated the instanceId field based on the groupings field',
          field: 'slo.instanceId',
          value:
            groupByFields.includes(ALL_VALUE) || groupByFields.length === 0
              ? ALL_VALUE
              : groupByFields.map((field) => `{{{slo.groupings.${field}}}}`).join(','),
        },
      },
      {
        pipeline: {
          description: 'Global custom pipeline for all SLO rollup data',
          ignore_missing_pipeline: true,
          ignore_failure: true,
          name: 'slo-rollup-global@custom',
        },
      },
      {
        pipeline: {
          ignore_missing_pipeline: true,
          ignore_failure: true,
          name: `slo-${slo.id}@custom`,
        },
      },
    ],
    _meta: {
      description: 'Ingest pipeline for SLO rollup data',
      version: SLO_RESOURCES_VERSION,
      managed: true,
      managed_by: 'observability',
    },
  };
};
