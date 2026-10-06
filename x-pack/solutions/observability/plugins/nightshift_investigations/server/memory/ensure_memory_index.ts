/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { MEMORY_INDEX } from '../../common/memory';

export const MEMORY_INDEX_TEMPLATE_NAME = 'nightshift-semantic-memory';

/** Above the managed `ai-index-idx` template's 500, so this field wins the merge. */
export const MEMORY_INDEX_TEMPLATE_PRIORITY = 600;

/**
 * The managed `ai-index-idx` template maps title/description/content as
 * semantic, but has no `context` field. A memory's recall key is the task that
 * produced it, so this index-scoped template adds that one field on top.
 */
export const MEMORY_CONTEXT_MAPPING = {
  properties: {
    context: {
      type: 'text' as const,
      fields: {
        semantic: { type: 'semantic_text' as const },
      },
    },
  },
};

/**
 * Installs the plugin's one-field template. The backing index is auto-created from
 * the managed `ai-index-idx` template on first write; no index is created here.
 */
export const ensureMemoryIndex = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  await esClient.indices.putIndexTemplate({
    name: MEMORY_INDEX_TEMPLATE_NAME,
    index_patterns: [MEMORY_INDEX],
    priority: MEMORY_INDEX_TEMPLATE_PRIORITY,
    create: false,
    _meta: {
      managed: true,
      description:
        'Nightshift Semantic Memory — adds the task-recall lane to the AI-index template.',
    },
    template: {
      mappings: MEMORY_CONTEXT_MAPPING,
    },
  });
  logger.debug(`Ensured Semantic Memory index template ${MEMORY_INDEX_TEMPLATE_NAME}`);
};
