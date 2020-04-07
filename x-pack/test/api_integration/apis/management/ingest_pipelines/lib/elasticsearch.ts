/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../../../ftr_provider_context';

interface Pipeline {
  id: string;
  body: {
    description: string;
    processors: any[];
    version?: number;
  };
}

/**
 * Helpers to create and delete indices on the Elasticsearch instance
 * during our tests.
 * @param {ElasticsearchClient} es The Elasticsearch client instance
 */
export const registerEsHelpers = (getService: FtrProviderContext['getService']) => {
  const es = getService('legacyEs');

  let pipelinesCreated: Pipeline[] = [];

  const createPipeline = (pipeline: Pipeline) => {
    pipelinesCreated.push(pipeline);
    return es.ingest.putPipeline(pipeline).then(() => pipeline);
  };

  const deletePipeline = (pipelineId: string) => {
    pipelinesCreated = pipelinesCreated.filter(({ id }) => id !== pipelineId);
    return es.ingest.deletePipeline({ id: pipelineId });
  };

  return {
    createPipeline,
    deletePipeline,
  };
};
