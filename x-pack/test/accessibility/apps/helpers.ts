/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncForEach } from '@kbn/std';

// This function clears all pipelines to ensure that there in an empty state before starting each test.
export async function deleteAllPipelines(client: any, logger: any) {
  const pipelines = await client.ingest.getPipeline();
  const pipeLineIds = Object.keys(pipelines.body);
  await logger.debug(pipelines);
  if (pipeLineIds.length > 0) {
    await asyncForEach(pipeLineIds, async (newId: any) => {
      await client.ingest.deletePipeline({ id: newId });
    });
  }
}

export async function putSamplePipeline(client: any) {
  return await client.ingest.putPipeline({
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
  });
}
