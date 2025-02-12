/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import {
  getSLOPipelineId,
  SLI_INGEST_PIPELINE_INDEX_NAME_PREFIX,
  SLO_RESOURCES_VERSION,
} from '../../../common/constants';
import { SLODefinition } from '../../domain/models';

export const getSLIPipelineTemplate = (slo: SLODefinition) => ({
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
        field: 'slo.revision',
        value: slo.revision,
      },
    },
    {
      date_index_name: {
        field: '@timestamp',
        index_name_prefix: SLI_INGEST_PIPELINE_INDEX_NAME_PREFIX,
        date_rounding: 'M',
        date_formats: ['UNIX_MS', 'ISO8601', "yyyy-MM-dd'T'HH:mm:ss.SSSXX"],
      },
    },
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
          [slo.groupBy].flat().includes(ALL_VALUE) || [slo.groupBy].flat().length === 0
            ? ALL_VALUE
            : [slo.groupBy]
                .flat()
                .map((field) => `{{{slo.groupings.${field}}}}`)
                .join(','),
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
});
