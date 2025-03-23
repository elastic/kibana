/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export const getIngestPipelineName = (namespace: string): string => {
  return `entity_analytics_create_eventIngest_from_timestamp-pipeline-${namespace}`;
};

export const createEventIngestedFromTimestamp = async (
  esClient: ElasticsearchClient,
  namespace: string
) => {
  const ingestTimestampPipeline = getIngestPipelineName(namespace);

  try {
    const pipeline = {
      id: ingestTimestampPipeline,
      _meta: {
        managed_by: 'entity_analytics',
        managed: true,
      },
      description: 'Pipeline for adding timestamp value to event.ingested',
      processors: [
        {
          set: {
            field: 'event.ingested',
            value: '{{_ingest.timestamp}}',
          },
        },
      ],
    };

    await esClient.ingest.putPipeline(pipeline);
  } catch (e) {
    throw new Error(`Error creating ingest pipeline: ${e}`);
  }
};
