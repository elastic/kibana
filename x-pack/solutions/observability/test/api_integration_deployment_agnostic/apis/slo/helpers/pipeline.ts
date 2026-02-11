/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export type PipelineHelper = ReturnType<typeof createPipelineHelper>;

export function createPipelineHelper(
  getService: DeploymentAgnosticFtrProviderContext['getService']
) {
  const retry = getService('retry');
  const esClient = getService('es');

  return {
    assertNotFound: async (pipelineId: string) => {
      return await retry.tryWithRetries(
        `Wait for pipeline ${pipelineId} to be deleted`,
        async () => {
          try {
            await esClient.ingest.getPipeline({ id: pipelineId });
            throw new Error(`Pipeline ${pipelineId} should have been deleted`);
          } catch (err: any) {
            expect(err.meta?.statusCode).eql(404);
          }
        },
        { retryCount: 10, retryDelay: 3000 }
      );
    },

    assertExists: async (pipelineId: string) => {
      return await retry.tryWithRetries(
        `Wait for pipeline ${pipelineId} to exist`,
        async () => {
          const response = await esClient.ingest.getPipeline({ id: pipelineId });
          expect(response).property(pipelineId);
          return response;
        },
        { retryCount: 10, retryDelay: 3000 }
      );
    },
  };
}
