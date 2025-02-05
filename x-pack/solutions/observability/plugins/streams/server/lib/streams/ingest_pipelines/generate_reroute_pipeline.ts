/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestStreamDefinition } from '@kbn/streams-schema';
import { ASSET_VERSION } from '../../../../common/constants';
import { conditionToPainless } from '../helpers/condition_to_painless';
import { getReroutePipelineName } from './name';

interface GenerateReroutePipelineParams {
  definition: IngestStreamDefinition;
}

export function generateReroutePipeline({ definition }: GenerateReroutePipelineParams) {
  return {
    id: getReroutePipelineName(definition.name),
    processors: definition.ingest.routing.map((child) => {
      return {
        reroute: {
          destination: child.destination,
          if: conditionToPainless(child.if),
        },
      };
    }),
    _meta: {
      description: `Reoute pipeline for the ${definition.name} stream`,
      managed: true,
    },
    version: ASSET_VERSION,
  };
}
