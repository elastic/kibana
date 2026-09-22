/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { MEMORY_INDEX } from '../../common/memory';

export const MEMORY_INDEX_TEMPLATE_NAME = 'nightshift-semantic-memory';

/**
 * Own mapping — not the Context Engine `ai-index-idx-*` KI template.
 * `context.semantic` is the task-recall lane (ELSER). `title` / `content` stay
 * lexical; they are the lesson, not the retrieve key.
 */
export const MEMORY_INDEX_MAPPINGS = {
  dynamic: 'false' as const,
  properties: {
    '@timestamp': { type: 'date' as const },
    type: { type: 'keyword' as const },
    title: { type: 'text' as const },
    description: { type: 'text' as const },
    content: { type: 'text' as const },
    context: {
      type: 'text' as const,
      fields: {
        semantic: { type: 'semantic_text' as const },
      },
    },
    tags: { type: 'keyword' as const },
    attributes: { type: 'flattened' as const },
  },
};

const MEMORY_INDEX_SETTINGS = {
  number_of_shards: 1,
  auto_expand_replicas: '0-1',
};

const isAlreadyExistsError = (err: unknown): boolean => {
  const statusCode = (err as { statusCode?: number }).statusCode;
  if (statusCode === 400) {
    const message = err instanceof Error ? err.message : String(err);
    return message.includes('resource_already_exists_exception');
  }
  return false;
};

export const ensureMemoryIndex = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  // Install our template before creating the index so a racing first write
  // still gets `context.semantic` instead of the AI-index KI mapping.
  await esClient.indices.putIndexTemplate({
    name: MEMORY_INDEX_TEMPLATE_NAME,
    index_patterns: [MEMORY_INDEX],
    priority: 500,
    create: false,
    _meta: {
      managed: true,
      description: 'Nightshift Semantic Memory — plugin-owned, not a Context Engine AI index.',
    },
    template: {
      settings: MEMORY_INDEX_SETTINGS,
      mappings: MEMORY_INDEX_MAPPINGS,
    },
  });

  const exists = await esClient.indices.exists({ index: MEMORY_INDEX });
  if (!exists) {
    try {
      await esClient.indices.create({
        index: MEMORY_INDEX,
        settings: MEMORY_INDEX_SETTINGS,
        mappings: MEMORY_INDEX_MAPPINGS,
      });
      logger.info(`Created Semantic Memory index ${MEMORY_INDEX}`);
      return;
    } catch (err) {
      if (!isAlreadyExistsError(err)) {
        throw err;
      }
    }
  }

  await esClient.indices.putMapping({
    index: MEMORY_INDEX,
    dynamic: MEMORY_INDEX_MAPPINGS.dynamic,
    properties: MEMORY_INDEX_MAPPINGS.properties,
  });
};
