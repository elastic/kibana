/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  createWikiPageStore as createSharedWikiPageStore,
  type WikiPageStore as SharedWikiPageStore,
} from '@kbn/agent-knowledge-wiki';
import { WIKI_AI_INDEX_DEST, WIKI_ENTITY_TYPES, type WikiEntityType } from '../../common/wiki';

export {
  canonicalWikiId,
  canonicalizeSlug,
  isVersionConflict,
  slugFromWikiId,
  statusAfterCorroboration,
  toWikiKiId,
  toWikiPageId,
} from '@kbn/agent-knowledge-wiki';

export type WikiPageStore = SharedWikiPageStore<WikiEntityType>;

export const createWikiPageStore = ({
  esClient,
  logger,
  spaceId,
  signal,
  destValue = WIKI_AI_INDEX_DEST,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  spaceId: string;
  /** Aborts in-flight Elasticsearch requests when the calling step times out. */
  signal?: AbortSignal;
  destValue?: string;
}): WikiPageStore =>
  createSharedWikiPageStore({
    esClient,
    logger,
    spaceId,
    signal,
    index: destValue,
    entityTypes: WIKI_ENTITY_TYPES,
  });
