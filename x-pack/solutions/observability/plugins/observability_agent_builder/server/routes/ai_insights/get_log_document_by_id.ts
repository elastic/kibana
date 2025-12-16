/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export interface LogDocument {
  '@timestamp'?: string;
  service?: {
    name?: string;
    environment?: string;
  };
  [key: string]: unknown;
}

export const getLogDocumentById = async ({
  esClient,
  index,
  id,
}: {
  esClient: ElasticsearchClient;
  index: string;
  id: string;
}): Promise<LogDocument | undefined> => {
  const result = await esClient.get<LogDocument>({
    index,
    id,
  });

  return result._source;
};
