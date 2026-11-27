/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { KNOWLEDGE_INDEX } from './constants';
import { knowledgeMappings } from './mappings';

const isAlreadyExists = (error: unknown): boolean =>
  (error as { body?: { error?: { type?: string } } })?.body?.error?.type ===
  'resource_already_exists_exception';

/** Creates the lookup-mode index, or brings an existing one's mapping up to date. */
export const ensureKnowledgeIndex = async (es: ElasticsearchClient): Promise<void> => {
  try {
    await es.indices.create({
      index: KNOWLEDGE_INDEX,
      settings: { index: { mode: 'lookup' } },
      mappings: knowledgeMappings,
    });
    return;
  } catch (error) {
    if (!isAlreadyExists(error)) throw error;
  }
  await es.indices.putMapping({ index: KNOWLEDGE_INDEX, ...knowledgeMappings });
};
