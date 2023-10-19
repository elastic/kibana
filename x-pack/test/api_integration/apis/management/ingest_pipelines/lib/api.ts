/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../ftr_provider_context';

export function IngestPipelinesAPIProvider({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const log = getService('log');

  return {
    async createPipeline(pipeline: IngestPutPipelineRequest) {
      log.debug(`Creating pipeline: '${pipeline.id}'`);

      const createResponse = await es.ingest.putPipeline(pipeline);
      expect(createResponse)
        .to.have.property('acknowledged')
        .eql(true, 'Response for create pipelines should be acknowledged.');

      await this.waitForPipelinesToExist(pipeline.id, `expected ${pipeline.id} to be created`);
    },

    async waitForPipelinesToExist(pipelineId: string, errorMsg?: string) {
      await retry.tryForTime(30 * 1000, async () => {
        const pipeline = await es.ingest.getPipeline({ id: pipelineId });
        const pipelineNames = Object.keys(pipeline);

        if (pipelineNames.length === 1 && pipelineNames[0] === pipelineId) {
          return true;
        } else {
          throw new Error(errorMsg || `pipeline '${pipelineId}' should exist`);
        }
      });
    },

    async deletePipelines() {
      const pipelines = await es.ingest.getPipeline();
      // Assumes all test pipelines will be prefixed with `test-pipeline*`
      const pipelineIds = Object.keys(pipelines).filter((pipeline) =>
        pipeline.includes('test-pipeline')
      );

      const deletePipeline = (pipelineId: string) => es.ingest.deletePipeline({ id: pipelineId });

      return Promise.all(pipelineIds.map(deletePipeline)).catch((err) => {
        log.debug(`[Cleanup error] Error deleting ES resources: ${err.message}`);
      });
    },

    async createIndex(index: { index: string; id: string; body: object }) {
      const indexExists = await es.indices.exists({ index: index.index });

      // Index should not exist, but in the case that it already does, we bypass the create request
      if (indexExists) {
        return;
      }

      log.debug(`Creating index: '${index.index}'`);
      return await es.index(index);
    },

    async deleteIndex(indexName: string) {
      log.debug(`Deleting index: '${indexName}'`);

      return await es.indices.delete({ index: indexName });
    },
  };
}
