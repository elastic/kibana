/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import type { EsClient } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import {
  apiTest,
  archiveMemoryPage,
  deleteMemories,
  deleteMemoryPage,
  getMemoryPage,
  MEMORY_CONFIGURE_ROLE,
  MEMORY_INDEX,
  MEMORY_MANAGER_ROLE,
  MEMORY_READER_ROLE,
  type SeededMemory,
  seedMemory,
  waitForMemoryIndex,
} from '../fixtures';

const suffix = Math.random().toString(36).slice(2, 10);
const slug = (name: string) => `${name}-${suffix}`;

/**
 * The privileges are enforced on the route, not in the browser: a caller holding a
 * session or an API key can issue the write directly, so hiding a button is not
 * the authorization. These cases send the request a reader or a manager could
 * send and require the refusal to come from Kibana.
 *
 * Stateful classic only, like every Memory case: Semantic Memory needs the
 * `nightshift_investigations` config set, which turns its flag on for the stateful
 * flavor only.
 */
apiTest.describe(
  'Semantic Memory write routes are authorized on the server',
  { tag: [...tags.stateful.classic] },
  () => {
    const seeded: SeededMemory[] = [];

    apiTest.beforeAll(async ({ esClient, log }) => {
      // `memoryService.initialize()` runs fire-and-forget on plugin start, so the
      // index can still be being created when the first write lands.
      await waitForMemoryIndex(esClient, log);
    });

    apiTest.afterEach(async ({ esClient }) => {
      await deleteMemories(
        esClient,
        seeded.map(({ documentId }) => documentId)
      );
      seeded.length = 0;
    });

    /** Seeds one memory and remembers it for teardown. */
    const givenMemory = async (esClient: EsClient, name: string) => {
      const memory = await seedMemory(esClient, 'default', { slug: slug(name) });
      seeded.push(memory);
      return memory;
    };

    /** The document as Elasticsearch still holds it: a refused write leaves it. */
    const documentExists = async (esClient: EsClient, documentId: string): Promise<boolean> => {
      const { count } = await esClient.count({
        index: MEMORY_INDEX,
        query: { ids: { values: [documentId] } },
      });
      return count > 0;
    };

    apiTest(
      'archive is refused to a reader and leaves the memory active',
      async ({ apiClient, esClient, samlAuth }) => {
        const memory = await givenMemory(esClient, 'archive-reader');
        // Seeded and read as the configure role, then switched: Scout keeps one
        // custom role per worker, so the privileged session has to be taken before
        // the role under test replaces it.
        const { cookieHeader: configure } = await samlAuth.asInteractiveUser(MEMORY_CONFIGURE_ROLE);
        const current = await getMemoryPage(apiClient, configure, memory.pageId);
        expect(current).toHaveStatusCode(200);

        const { cookieHeader: reader } = await samlAuth.asInteractiveUser(MEMORY_READER_ROLE);
        const response = await archiveMemoryPage(apiClient, reader, memory.pageId, true);

        expect(response).toHaveStatusCode(403);
        // Archiving keeps the document, so existence alone would not show the
        // refusal left it untouched.
        const unchanged = await getMemoryPage(apiClient, reader, memory.pageId);
        expect(unchanged).toHaveStatusCode(200);
        expect(unchanged.body.page.archived).toBe(false);
      }
    );

    apiTest(
      'delete is refused to a reader and leaves the document in place',
      async ({ apiClient, esClient, samlAuth }) => {
        const memory = await givenMemory(esClient, 'delete-reader');
        const { cookieHeader: configure } = await samlAuth.asInteractiveUser(MEMORY_CONFIGURE_ROLE);
        // The revision and title a caller has to echo, read by someone who may.
        const current = await getMemoryPage(apiClient, configure, memory.pageId);

        const { cookieHeader: reader } = await samlAuth.asInteractiveUser(MEMORY_READER_ROLE);
        const response = await deleteMemoryPage(apiClient, reader, memory.pageId, {
          confirm_title: memory.title,
          version: current.body.version,
        });

        expect(response).toHaveStatusCode(403);
        expect(await documentExists(esClient, memory.documentId)).toBe(true);
      }
    );

    apiTest(
      'delete is refused to a manager, who may archive but not configure',
      async ({ apiClient, esClient, samlAuth }) => {
        const memory = await givenMemory(esClient, 'delete-manager');
        const { cookieHeader: configure } = await samlAuth.asInteractiveUser(MEMORY_CONFIGURE_ROLE);
        const current = await getMemoryPage(apiClient, configure, memory.pageId);

        const { cookieHeader: manager } = await samlAuth.asInteractiveUser(MEMORY_MANAGER_ROLE);
        const response = await deleteMemoryPage(apiClient, manager, memory.pageId, {
          confirm_title: memory.title,
          version: current.body.version,
        });

        expect(response).toHaveStatusCode(403);
        expect(await documentExists(esClient, memory.documentId)).toBe(true);
      }
    );

    apiTest(
      'a manager may archive, and a reader may read the memory that survived',
      async ({ apiClient, esClient, samlAuth }) => {
        // The control for both refusals above: the tiers are enforced, not broken.
        const memory = await givenMemory(esClient, 'tiers');
        const { cookieHeader: manager } = await samlAuth.asInteractiveUser(MEMORY_MANAGER_ROLE);

        const archived = await archiveMemoryPage(apiClient, manager, memory.pageId, true);
        expect(archived).toHaveStatusCode(200);

        const { cookieHeader: reader } = await samlAuth.asInteractiveUser(MEMORY_READER_ROLE);
        const listed = await getMemoryPage(apiClient, reader, memory.pageId);
        expect(listed).toHaveStatusCode(200);
        expect(listed.body.page.archived).toBe(true);
      }
    );
  }
);
