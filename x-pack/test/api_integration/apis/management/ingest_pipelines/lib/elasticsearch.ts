/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  let pipelinesCreated: string[] = [];

  const es = getService('es');

  const createPipeline = (pipeline: Pipeline, cachePipeline?: boolean) => {
    if (cachePipeline) {
      pipelinesCreated.push(pipeline.id);
    }

    return es.ingest.putPipeline(pipeline);
  };

  const deletePipeline = (pipelineId: string) => es.ingest.deletePipeline({ id: pipelineId });

  const cleanupPipelines = () =>
    Promise.all(pipelinesCreated.map(deletePipeline))
      .then(() => {
        pipelinesCreated = [];
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.log(`[Cleanup error] Error deleting ES resources: ${err.message}`);
      });

  const createIndex = (index: { index: string; id: string; body: object }) => {
    return es.index(index);
  };

  const deleteIndex = (indexName: string) => {
    return es.indices.delete({ index: indexName });
  };

  return {
    createPipeline,
    deletePipeline,
    cleanupPipelines,
    createIndex,
    deleteIndex,
  };
};
