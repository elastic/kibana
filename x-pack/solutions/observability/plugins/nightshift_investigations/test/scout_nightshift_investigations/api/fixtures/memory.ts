/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { ApiClientFixture, ApiClientResponse, EsClient, KibanaRole } from '@kbn/scout-oblt';
import { COMMON_HEADERS } from './constants';

/** The plugin's own index. Not the `ai-index-idx-*` prefix, and hidden. */
export const MEMORY_INDEX = 'nightshift-semantic-memory';

const MEMORY_PAGES_PATH = 'internal/nightshift/memory/pages';

const role = (nightshift: string[]): KibanaRole => ({
  elasticsearch: { cluster: [], indices: [] },
  kibana: [
    {
      base: [],
      // The routes are gated on `agentBuilder:read`; the Nightshift feature is
      // what grants the `configure` privilege the delete route additionally
      // requires.
      feature: { agentBuilder: ['read'], nightshift },
      spaces: ['*'],
    },
  ],
});

/** Reads memory, cannot archive or delete. */
export const MEMORY_READER_ROLE = role(['read']);

/** Reads and archives/restores; still cannot delete. */
export const MEMORY_MANAGER_ROLE = role(['all']);

/** Reads, archives, and deletes. */
export const MEMORY_CONFIGURE_ROLE = role(['all', 'manage-engines']);

export interface SeededMemory {
  pageId: string;
  documentId: string;
  title: string;
}

/** `${spaceId}:${pageId}` is the stored id; the page id is `memory_<slug>`. */
export const storedMemoryId = (spaceId: string, slug: string): string =>
  `${spaceId}:memory_${slug}`;

const INFERENCE_READY_ATTEMPTS = 60;

/**
 * The index's `semantic_text` fields run ELSER on write, and on a fresh cluster
 * the model may still be downloading when the first document lands.
 */
const indexWhenInferenceReady = async (
  esClient: EsClient,
  request: Parameters<EsClient['index']>[0]
) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await esClient.index(request);
    } catch (error) {
      const { message, meta } = error as { message?: string; meta?: { body?: unknown } };
      const downloading = /download task is currently running/.test(
        `${message} ${JSON.stringify(meta?.body ?? '')}`
      );
      if (!downloading || attempt >= INFERENCE_READY_ATTEMPTS) throw error;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

/**
 * Writes one memory straight into the index, the way the investigator would.
 *
 * Seeded rather than written through a route, because a test about who is
 * refused a destructive write needs a document that already exists and that no
 * privileged request in the test ever touches.
 */
export const seedMemory = async (
  esClient: EsClient,
  spaceId: string,
  { slug = `api-${randomUUID().slice(0, 8)}`, title }: { slug?: string; title?: string }
): Promise<SeededMemory> => {
  const documentId = storedMemoryId(spaceId, slug);
  const resolvedTitle = title ?? `API memory ${slug}`;
  await indexWhenInferenceReady(esClient, {
    index: MEMORY_INDEX,
    id: documentId,
    refresh: 'wait_for',
    document: {
      '@timestamp': new Date().toISOString(),
      type: 'memory',
      title: resolvedTitle,
      content: `Notes about ${resolvedTitle}.`,
      context: `Investigate ${resolvedTitle}`,
      tags: ['memory'],
      attributes: {
        slug,
        space_id: spaceId,
        categories: [],
        references: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'nightshift-scout-seed',
        updated_by: 'nightshift-scout-seed',
        impressions: 1,
        conversions: 0,
        last_impression_time: new Date().toISOString(),
      },
    },
  });
  return { pageId: `memory_${slug}`, documentId, title: resolvedTitle };
};

/** Removes exactly the documents this test seeded, by id. */
export const deleteMemories = async (esClient: EsClient, ids: readonly string[]) => {
  for (const id of ids) {
    try {
      await esClient.delete({ index: MEMORY_INDEX, id, refresh: true });
    } catch (error) {
      // A refused delete leaves the document in place; a missing one needs no
      // cleanup either.
      if ((error as { statusCode?: number }).statusCode !== 404) throw error;
    }
  }
};

const headers = (cookieHeader: Record<string, string>) => ({
  headers: { ...COMMON_HEADERS, ...cookieHeader },
});

export const getMemoryPage = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  id: string
): Promise<ApiClientResponse> =>
  apiClient.get(`${MEMORY_PAGES_PATH}/${id}`, {
    ...headers(cookieHeader),
    responseType: 'json',
  });

export const archiveMemoryPage = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  id: string,
  archived: boolean
): Promise<ApiClientResponse> =>
  apiClient.post(`${MEMORY_PAGES_PATH}/${id}/archive`, {
    ...headers(cookieHeader),
    body: { archived },
    responseType: 'json',
  });

export const deleteMemoryPage = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  id: string,
  body: { confirm_title: string; version: { seq_no: number; primary_term: number } }
): Promise<ApiClientResponse> =>
  apiClient.delete(`${MEMORY_PAGES_PATH}/${id}`, {
    ...headers(cookieHeader),
    body,
    responseType: 'json',
  });

/**
 * `memoryService.initialize()` runs fire-and-forget on plugin start, so the index
 * can still be being created when a test's first write lands. Wait for it.
 */
export const waitForMemoryIndex = async (
  esClient: EsClient,
  log: { info: (message: string) => void }
) => {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await esClient.indices.exists({ index: MEMORY_INDEX })) return;
    log.info(`Memory index not created yet, waiting (attempt ${attempt + 1}/60)`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Index ${MEMORY_INDEX} was not created within 60s`);
};
