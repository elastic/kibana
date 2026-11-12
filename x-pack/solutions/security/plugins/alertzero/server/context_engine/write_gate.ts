/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { getAiIndexDest } from '@kbn/context-engine-plugin/common/ai_index_dest';
import type { AlertZeroAiIndex } from './ai_indices';
import { ensureSpaceScopedIndexTemplate } from './ensure_space_scoped_index';

export interface AiIndexWriteGates {
  /**
   * False while a space-scoped index's template install is in flight, and after it fails, so
   * nothing auto-creates the index without the nested mapping. True for any other index.
   */
  isWritable: (aiIndexId: string) => boolean;
}

/** `start` cannot return a promise, so callers read `isWritable` as it changes. */
export const installSpaceScopedIndexTemplates = ({
  aiIndices,
  esClient,
  logger,
}: {
  aiIndices: readonly AlertZeroAiIndex[];
  esClient: ElasticsearchClient;
  logger: Logger;
}): AiIndexWriteGates => {
  const writable = new Map<string, boolean>();
  for (const { id, spaceScopedTemplate } of aiIndices) {
    if (spaceScopedTemplate === undefined) {
      continue;
    }
    writable.set(id, false);
    void ensureSpaceScopedIndexTemplate(esClient, logger, {
      indexName: getAiIndexDest('index', id).value,
      ...spaceScopedTemplate,
    }).then(
      (installed) => {
        writable.set(id, installed);
      },
      () => {
        writable.set(id, false);
      }
    );
  }
  return { isWritable: (aiIndexId) => writable.get(aiIndexId) ?? true };
};
