/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Nightshift wraps the shared Wiki page store. Semantic memory stays in
 * `server/memory/**` and is intentionally not extracted.
 */
export {
  canonicalizeSlug,
  canonicalWikiId,
  createWikiPageStore,
  isVersionConflict,
  slugFromWikiId,
  statusAfterCorroboration,
  toWikiKiId,
  toWikiPageId,
} from '@kbn/agent-knowledge-plugin/server';
export type { WikiPageStore, WikiPageWrite } from '@kbn/agent-knowledge-plugin/server';
