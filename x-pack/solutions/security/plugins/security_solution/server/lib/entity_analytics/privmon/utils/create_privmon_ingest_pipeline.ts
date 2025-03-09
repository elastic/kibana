/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger, ElasticsearchClient } from '@kbn/core/server';

const PIPELINE_ID = 'privmon_global';

export const createPrivmonIngestPipeline = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<{
  id: string;
}> => {
  try {
    const result = await esClient.ingest.putPipeline({
      id: PIPELINE_ID,
      _meta: {
        managed_by: 'security_solution',
        managed: true,
      },
      description: 'Pipeline for enriching privmon events with ingested timestamp',
      processors: [
        {
          set: {
            field: 'event.ingested',
            value: '{{_ingest.timestamp}}',
          },
        },
      ],
    });

    logger.debug(`Created event_ingested pipeline ${PIPELINE_ID}: ${result}`);

    return { id: PIPELINE_ID };
  } catch (err) {
    logger.error(`Error creating event_ingested pipeline ${PIPELINE_ID}: ${err}`);
    throw err;
  }
};
