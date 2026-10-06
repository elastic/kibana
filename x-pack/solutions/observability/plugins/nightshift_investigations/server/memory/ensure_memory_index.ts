/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

/**
 * The managed `ai-index-idx` template composes this component, so a mapping put
 * here reaches every undotted AI index. The managed template already maps
 * title/description/content as semantic but has no `context` field, which is a
 * memory's task-recall key.
 */
export const MEMORY_INDEX_COMPONENT_TEMPLATE_NAME = 'ai-index@custom';

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
 * Installs the component template that adds the task-recall lane. The backing
 * index is auto-created from the AI-index template on first write.
 */
export const ensureMemoryIndex = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  await esClient.cluster.putComponentTemplate({
    name: MEMORY_INDEX_COMPONENT_TEMPLATE_NAME,
    template: { mappings: MEMORY_CONTEXT_MAPPING },
    _meta: {
      managed: true,
      description:
        'Nightshift Semantic Memory — adds the task-recall lane to the AI-index template.',
    },
  });
  logger.debug(
    `Ensured Semantic Memory component template ${MEMORY_INDEX_COMPONENT_TEMPLATE_NAME}`
  );
};
