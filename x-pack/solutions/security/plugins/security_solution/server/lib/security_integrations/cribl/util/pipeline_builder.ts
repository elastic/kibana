/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IngestPipelineRequest,
  ProcessorContainer,
  RouteEntry,
} from '../../../../../common/security_integrations/cribl/types';
import { getRerouteDataset } from './get_reroute_dataset';

export type IndexPatternsByTemplate = ReadonlyMap<string, readonly string[]>;

export const buildPipelineRequest = (
  mappings: RouteEntry[],
  indexPatternsByTemplate: IndexPatternsByTemplate = new Map()
): IngestPipelineRequest => {
  return {
    _meta: {
      managed: true,
    },
    description: 'Pipeline for routing events from Cribl',
    processors: buildCriblRoutingProcessors(mappings, indexPatternsByTemplate),
    on_failure: [
      {
        set: {
          field: 'error.message',
          value: '{{ _ingest.on_failure_message }}',
        },
      },
    ],
  };
};

const buildCriblRoutingProcessors = (
  mappings: RouteEntry[],
  indexPatternsByTemplate: IndexPatternsByTemplate
): ProcessorContainer[] => {
  const processors: ProcessorContainer[] = [];

  mappings.forEach(function (mapping) {
    const { dataset } = getRerouteDataset(
      mapping.datastream,
      indexPatternsByTemplate.get(mapping.datastream)
    );
    processors.push({
      reroute: {
        dataset: `${dataset}`,
        if: `ctx['_dataId'] == '${mapping.dataId}'`,
        namespace: [mapping.namespace || 'default'],
      },
    });
  });

  return processors;
};
