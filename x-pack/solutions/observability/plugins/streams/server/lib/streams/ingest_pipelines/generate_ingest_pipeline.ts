/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamDefinition, isWiredRoot } from '@kbn/streams-schema';
import { ASSET_VERSION } from '../../../../common/constants';
import { logsDefaultPipelineProcessors } from './logs_default_pipeline';
import { getProcessingPipelineName } from './name';
import { formatToIngestProcessors } from '../helpers/processing';

export function generateIngestPipeline(id: string, definition: StreamDefinition) {
  return {
    id: getProcessingPipelineName(id),
    processors: [
      ...(isWiredRoot(definition.name) ? logsDefaultPipelineProcessors : []),
      ...formatToIngestProcessors(definition.ingest.processing),
      {
        pipeline: {
          name: `${id}@stream.reroutes`,
          ignore_missing_pipeline: true,
        },
      },
    ],
    _meta: {
      description: `Default pipeline for the ${id} stream`,
      managed: true,
    },
    version: ASSET_VERSION,
  };
}
