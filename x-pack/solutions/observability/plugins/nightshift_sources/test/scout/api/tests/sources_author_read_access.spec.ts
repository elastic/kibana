/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import type { RoleSessionCredentials } from '@kbn/scout-oblt';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { getNightshiftSourceViewName } from '@kbn/nightshift-shared';
import {
  NIGHTSHIFT_PARTIAL_READ_MANAGER_ROLE,
  apiTest,
  cleanupSources,
  createSource,
  createTestIndex,
  deleteSourceChecked,
  deleteTestIndex,
  getSource,
  listSources,
  readView,
  uniqueSuffix,
  updateSource,
  validateSourceQuery,
} from '../fixtures';
import { TEST_INDEX_PREFIX } from '../fixtures/constants';

const TITLE_PREFIX = 'scout-sources-author-read';

apiTest.describe(
  'Nightshift sources author read access',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const suffix = uniqueSuffix();
    const readableIndex = `${TEST_INDEX_PREFIX}readable-${suffix}`;
    const hiddenIndex = `${TEST_INDEX_PREFIX}hidden-${suffix}`;
    const wildcardEsql = `FROM ${TEST_INDEX_PREFIX}*`;
    let author: RoleSessionCredentials;

    apiTest.beforeAll(async ({ esClient, samlAuth }) => {
      author = await samlAuth.asInteractiveUser(NIGHTSHIFT_PARTIAL_READ_MANAGER_ROLE);
      await Promise.all([
        createTestIndex(esClient, readableIndex),
        createTestIndex(esClient, hiddenIndex),
      ]);
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      try {
        await cleanupSources(apiClient, author.cookieHeader, `${TITLE_PREFIX}-${suffix}`);
      } finally {
        await Promise.all([
          deleteTestIndex(esClient, readableIndex),
          deleteTestIndex(esClient, hiddenIndex),
        ]);
      }
    });

    apiTest(
      'refuses a wildcard that reaches indices the author cannot read, and leaves no source or view behind',
      async ({ apiClient, esClient }) => {
        const title = `${TITLE_PREFIX}-${suffix}-wildcard`;
        const viewName = getNightshiftSourceViewName(DEFAULT_SPACE_ID, title);

        const validated = await validateSourceQuery(apiClient, author.cookieHeader, {
          esql: wildcardEsql,
        });
        expect(validated).toHaveStatusCode(403);

        const created = await createSource(apiClient, author.cookieHeader, {
          title,
          esql: wildcardEsql,
        });
        expect(created).toHaveStatusCode(403);

        const listed = await listSources(
          apiClient,
          author.cookieHeader,
          `search=${encodeURIComponent(title)}`
        );
        expect(listed).toHaveStatusCode(200);
        expect(listed.body.sources).toHaveLength(0);
        expect(await readView(esClient, viewName)).toBeUndefined();
      }
    );

    apiTest(
      'refuses a query change to a wildcard the author cannot fully read, and keeps the stored query',
      async ({ apiClient, esClient }) => {
        const title = `${TITLE_PREFIX}-${suffix}-update`;
        const storedEsql = `FROM ${readableIndex}`;

        const created = await createSource(apiClient, author.cookieHeader, {
          title,
          esql: storedEsql,
        });
        expect(created).toHaveStatusCode(200);
        const { id, view_name: viewName } = created.body.source as NightshiftSource;

        try {
          const updated = await updateSource(apiClient, author.cookieHeader, id, {
            title,
            tags: [],
            esql: wildcardEsql,
          });
          expect(updated).toHaveStatusCode(403);

          const stored = await getSource(apiClient, author.cookieHeader, id);
          expect(stored).toHaveStatusCode(200);
          expect((stored.body.source as NightshiftSource).esql).toBe(storedEsql);
          expect(await readView(esClient, viewName)).toStrictEqual({
            name: viewName,
            query: storedEsql,
          });
        } finally {
          await deleteSourceChecked(apiClient, author.cookieHeader, id);
        }
      }
    );
  }
);
