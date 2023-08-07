/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export interface Pipeline {
  name: string;
  description?: string;
  onFailureProcessors?: estypes.IngestProcessorContainer[];
  processors: estypes.IngestProcessorContainer[];
  version?: estypes.VersionNumber;
  metadata?: estypes.Metadata;
}

export function IngestPipelinesFixturesProvider() {
  const defaultProcessors: estypes.IngestProcessorContainer[] = [
    {
      script: {
        source: 'ctx._type = null',
      },
    },
  ];

  const defaultOnFailureProcessors: estypes.IngestProcessorContainer[] = [
    {
      set: {
        field: 'error.message',
        value: '{{ failure_message }}',
      },
    },
  ];

  const defaultMetadata: estypes.Metadata = {
    field_1: 'test',
    field_2: 10,
  };

  const apiBasePath = '/api/ingest_pipelines';

  const createPipelineBodyWithRequiredFields = () => {
    return {
      name: `test-pipeline-required-fields-${Math.random()}`,
      processors: defaultProcessors,
    };
  };

  const createPipelineBody = (pipeline?: Pipeline) => {
    if (pipeline) {
      const { name, description, processors, onFailureProcessors, version, metadata } = pipeline;
      return {
        name,
        description,
        processors,
        on_failure: onFailureProcessors,
        version,
        _meta: metadata,
      };
    }

    // Use default payload if none is provided
    return {
      name: `test-pipeline-${Math.random()}`,
      description: 'test pipeline description',
      processors: defaultProcessors,
      on_failure: defaultOnFailureProcessors,
      version: 1,
      _meta: defaultMetadata,
    };
  };

  return {
    createPipelineBodyWithRequiredFields,
    createPipelineBody,
    apiBasePath,
  };
}
