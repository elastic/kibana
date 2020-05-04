/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../../../ftr_provider_context';

interface Processor {
  [key: string]: {
    [key: string]: unknown;
  };
}

interface Pipeline {
  id: string;
  body: {
    description: string;
    processors: Processor[];
    version?: number;
  };
}

/**
 * Helpers to create and delete pipelines on the Elasticsearch instance
 * during our tests.
 * @param {ElasticsearchClient} es The Elasticsearch client instance
 */
export const registerEsHelpers = (getService: FtrProviderContext['getService']) => {
  const es = getService('legacyEs');

  const createPipeline = (pipeline: Pipeline) => es.ingest.putPipeline(pipeline);

  const deletePipeline = (pipelineId: string) => es.ingest.deletePipeline({ id: pipelineId });

  return {
    createPipeline,
    deletePipeline,
  };
};
