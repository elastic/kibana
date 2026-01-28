/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export interface LogDocument {
  '@timestamp'?: string;
  message?: string;
  'log.level'?: string;
  service?: {
    name?: string;
    namespace?: string;
    version?: string;
    environment?: string;
    node?: { name?: string };
  };
  resource?: {
    attributes?: Record<string, unknown>;
  };
  host?: { name?: string };
  container?: { id?: string };
  trace?: { id?: string };
  span?: { id?: string };
  error?: {
    message?: string;
    type?: string;
    stack_trace?: string;
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
  const result = await esClient.search({
    index,
    size: 1,
    _source: false,
    fields: ['*'],
    query: {
      ids: { values: [id] },
    },
  });

  const hit = result.hits.hits[0];

  if (!hit?.fields) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(hit.fields).map(([key, value]) => [
      key,
      Array.isArray(value) && value.length === 1 ? value[0] : value,
    ])
  ) as LogDocument;
};
