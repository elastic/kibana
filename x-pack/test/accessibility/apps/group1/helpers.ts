/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import { asyncForEach } from '@kbn/std';

// This function clears all pipelines to ensure that there in an empty state before starting each test.
export async function deleteAllPipelines(client: Client, logger: any) {
  const pipelines = await client.ingest.getPipeline();
  const pipeLineIds = Object.keys(pipelines);
  await logger.debug(pipelines);
  if (pipeLineIds.length > 0) {
    await asyncForEach(pipeLineIds, async (newId) => {
      try {
        await client.ingest.deletePipeline({ id: newId });
      } catch (error) {
        // Some pipelines are default for specific indices. Removing them without updating or deleting the indices causes an expected error.
        await logger.debug(`Error deleting pipeline: ${newId}`);
      }
    });
  }
}

export async function putSamplePipeline(client: Client) {
  return await client.ingest.putPipeline(
    {
      id: 'testPipeline',
      body: {
        description: 'describe pipeline',
        version: 123,
        processors: [
          {
            set: {
              field: 'foo',
              value: 'bar',
            },
          },
        ],
      },
    },
    { meta: true }
  );
}
