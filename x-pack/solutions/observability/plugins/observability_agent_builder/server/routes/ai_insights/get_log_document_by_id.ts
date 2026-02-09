/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

const LOG_DOCUMENT_FIELDS = [
  '@timestamp',
  'message',
  'log.level',
  'service.name',
  'trace.id',
  'span.id',
  'http.response.status_code',
  'error.exception.message',
] as const;

type FieldKeys = (typeof LOG_DOCUMENT_FIELDS)[number];

export type LogDocument = {
  'log.level'?: string;
  '@timestamp'?: string;
  message?: string;
  'http.response.status_code'?: number;
  'error.exception.message'?: string;
} & {
  [K in FieldKeys]?: unknown;
};

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
    fields: [...LOG_DOCUMENT_FIELDS],
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
