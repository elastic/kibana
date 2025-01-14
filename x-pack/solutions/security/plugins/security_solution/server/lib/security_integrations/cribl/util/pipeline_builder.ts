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

export const buildPipelineRequest = (mappings: RouteEntry[]): IngestPipelineRequest => {
  return {
    _meta: {
      managed: true,
    },
    description: 'Pipeline for routing events from Cribl',
    processors: buildCriblRoutingProcessors(mappings),
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

const buildCriblRoutingProcessors = (mappings: RouteEntry[]): ProcessorContainer[] => {
  const processors: ProcessorContainer[] = [];

  mappings.forEach(function (mapping) {
    const [, datasetName] = mapping.datastream.split('-');
    processors.push({
      reroute: {
        dataset: `${datasetName}`,
        if: `ctx['_dataId'] == '${mapping.dataId}'`,
        namespace: ['default'],
      },
    });
  });

  return processors;
};
