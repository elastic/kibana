/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export const LOG_DOCUMENT_FIELDS = [
  '@timestamp',
  'message',
  'log.level',
  'service.name',
  'service.namespace',
  'service.version',
  'service.environment',
  'service.node.name',
  'host.name',
  'container.id',
  'trace.id',
  'span.id',
  'error.message',
  'error.type',
  'error.stack_trace',
] as const;

export interface LogDocument {
  '@timestamp'?: string;
  message?: string;
  'http.response.status_code'?: string;
  'exception.message'?: string;
  'log.level'?: string;
  'service.name'?: string;
  'service.namespace'?: string;
  'service.version'?: string;
  'service.environment'?: string;
  'service.node.name'?: string;
  'host.name'?: string;
  'container.id'?: string;
  'trace.id'?: string;
  'span.id'?: string;
  'error.message'?: string;
  'error.type'?: string;
  'error.stack_trace'?: string;
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
    fields: [...LOG_DOCUMENT_FIELDS],
    query: {
      ids: { values: [id] },
    },
  });

  const hit = result.hits.hits[0];

  if (!hit?.fields) {
    return undefined;
  }

  // Transform fields format (arrays) to flat object with unwrapped single values
  return Object.fromEntries(
    Object.entries(hit.fields).map(([key, value]) => [
      key,
      Array.isArray(value) && value.length === 1 ? value[0] : value,
    ])
  ) as LogDocument;
};
