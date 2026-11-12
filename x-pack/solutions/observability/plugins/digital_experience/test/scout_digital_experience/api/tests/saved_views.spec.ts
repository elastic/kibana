/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { ApiClientFixture } from '@kbn/scout-oblt';
import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { SavedView, SavedViewsResponse } from '../../../../common/saved_views';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const { COMMON_HEADERS, createRole } = testData;

const VIEWS_PATH = 'internal/digital_experience/views';
const NAME_PREFIX = 'scout views api';

/** Reads the views, and nothing else, as it is the `read` privilege that is checked here. */
const READ_ROLE = createRole({ digital_experience: ['read'] });
/** Saves them as well. Not the superuser, whose requests no privilege of the feature gates. */
const ALL_ROLE = createRole({ digital_experience: ['all'] });

const uniqueName = (label: string) => `${NAME_PREFIX} ${label} ${randomUUID()}`;

const viewPath = (id: string, spaceId?: string) =>
  `${spaceId ? `s/${spaceId}/` : ''}${VIEWS_PATH}/${id}`;

const listPath = (spaceId?: string) => `${spaceId ? `s/${spaceId}/` : ''}${VIEWS_PATH}`;

type ApiKeyHeader = Record<string, string>;

const listViews = async (
  apiClient: ApiClientFixture,
  apiKeyHeader: ApiKeyHeader,
  spaceId?: string
): Promise<SavedView[]> => {
  const response = await apiClient.get(listPath(spaceId), {
    headers: { ...COMMON_HEADERS, ...apiKeyHeader },
    responseType: 'json',
  });
  expect(response).toHaveStatusCode(200);
  return (response.body as SavedViewsResponse).views;
};

apiTest.describe('Digital Experience saved views', { tag: DIGITAL_EXPERIENCE_TAGS }, () => {
  apiTest.afterAll(async ({ apiClient, requestAuth }) => {
    // Whatever a failed test left behind, by the name its views were given.
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const left = (await listViews(apiClient, apiKeyHeader)).filter(({ name }) =>
      name.startsWith(NAME_PREFIX)
    );
    await Promise.all(
      left.map(({ id }) =>
        apiClient.delete(viewPath(id), { headers: { ...COMMON_HEADERS, ...apiKeyHeader } })
      )
    );
  });

  apiTest(
    'lets the read privilege list the views, and refuses it saving, changing and deleting them',
    async ({ apiClient, requestAuth }) => {
      const admin = await requestAuth.getApiKeyForAdmin();
      const reader = await requestAuth.getApiKeyForCustomRole(READ_ROLE);
      const readerHeaders = { ...COMMON_HEADERS, ...reader.apiKeyHeader };
      const name = uniqueName('read');
      const created = await apiClient.post(VIEWS_PATH, {
        headers: { ...COMMON_HEADERS, ...admin.apiKeyHeader },
        body: { name },
        responseType: 'json',
      });
      expect(created).toHaveStatusCode(200);
      const { id } = created.body as SavedView;

      const views = await listViews(apiClient, reader.apiKeyHeader);
      expect(views.map((view) => view.id)).toContain(id);

      const refusedCreate = await apiClient.post(VIEWS_PATH, {
        headers: readerHeaders,
        body: { name: uniqueName('refused') },
        responseType: 'json',
      });
      const refusedUpdate = await apiClient.put(viewPath(id), {
        headers: readerHeaders,
        body: { name, kuery: 'user_agent.name : "Chrome"' },
        responseType: 'json',
      });
      const refusedDelete = await apiClient.delete(viewPath(id), {
        headers: readerHeaders,
        responseType: 'json',
      });
      expect(refusedCreate).toHaveStatusCode(403);
      expect(refusedUpdate).toHaveStatusCode(403);
      expect(refusedDelete).toHaveStatusCode(403);

      // Refused, not just answered with an error: the view is as it was saved.
      const after = (await listViews(apiClient, admin.apiKeyHeader)).filter(
        (view) => view.name === name
      );
      expect(after).toHaveLength(1);
      expect(after[0].kuery).toBeUndefined();
    }
  );

  apiTest(
    'lets the all privilege save, replace and delete a view, and refuses a name that is taken',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(ALL_ROLE);
      const headers = { ...COMMON_HEADERS, ...apiKeyHeader };
      const name = uniqueName('all');

      const created = await apiClient.post(VIEWS_PATH, {
        headers,
        body: { name, percentile: '95' },
        responseType: 'json',
      });
      expect(created).toHaveStatusCode(200);
      const { id } = created.body as SavedView;

      // Replaced, not merged: what the new save leaves out is gone from the view.
      const replaced = await apiClient.put(viewPath(id), {
        headers,
        body: { name, kuery: 'user_agent.name : "Chrome"' },
        responseType: 'json',
      });
      expect(replaced).toHaveStatusCode(200);
      expect(replaced.body).toMatchObject({ id, name, kuery: 'user_agent.name : "Chrome"' });
      expect((replaced.body as SavedView).percentile).toBeUndefined();

      const taken = await apiClient.post(VIEWS_PATH, {
        headers,
        body: { name: name.toUpperCase() },
        responseType: 'json',
      });
      expect(taken).toHaveStatusCode(409);

      const deleted = await apiClient.delete(viewPath(id), { headers, responseType: 'json' });
      expect(deleted).toHaveStatusCode(200);

      // Gone, and not brought back by saving it again.
      const deletedAgain = await apiClient.delete(viewPath(id), { headers, responseType: 'json' });
      const replacedGone = await apiClient.put(viewPath(id), {
        headers,
        body: { name },
        responseType: 'json',
      });
      expect(deletedAgain).toHaveStatusCode(404);
      expect(replacedGone).toHaveStatusCode(404);
      expect((await listViews(apiClient, apiKeyHeader)).map((view) => view.id)).not.toContain(id);
    }
  );

  apiTest(
    'lists the views that are valid when one holds what no route would save',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const headers = { ...COMMON_HEADERS, ...apiKeyHeader };
      const goodName = uniqueName('valid');
      const good = await apiClient.post(VIEWS_PATH, {
        headers,
        body: { name: goodName },
        responseType: 'json',
      });
      const other = await apiClient.post(VIEWS_PATH, {
        headers,
        body: { name: uniqueName('to corrupt') },
        responseType: 'json',
      });
      expect(good).toHaveStatusCode(200);
      expect(other).toHaveStatusCode(200);
      const { id: goodId } = good.body as SavedView;
      const { id: corruptedId } = other.body as SavedView;

      try {
        // The generic saved objects API checks an update against nothing, so it takes this.
        const corrupted = await apiClient.put(
          `api/saved_objects/digital-experience-view/${corruptedId}`,
          { headers, body: { attributes: { name: { nested: true } } }, responseType: 'json' }
        );
        expect(corrupted).toHaveStatusCode(200);

        // One view that cannot be read must not fail the list of everyone's views.
        const views = await listViews(apiClient, apiKeyHeader);
        expect(views.map((view) => view.id)).toContain(goodId);
        expect(views.map((view) => view.id)).not.toContain(corruptedId);
      } finally {
        // The list leaves it out, so the cleanup of the suite cannot find it.
        await apiClient.delete(`api/saved_objects/digital-experience-view/${corruptedId}`, {
          headers,
        });
      }
    }
  );

  apiTest(
    'keeps the views of one space from the others',
    async ({ apiClient, requestAuth, kbnClient }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const headers = { ...COMMON_HEADERS, ...apiKeyHeader };
      const spaceId = `dx-views-${randomUUID().slice(0, 8)}`;
      const name = uniqueName('space');
      await kbnClient.spaces.create({ id: spaceId, name: spaceId });

      try {
        const created = await apiClient.post(VIEWS_PATH, {
          headers,
          body: { name },
          responseType: 'json',
        });
        expect(created).toHaveStatusCode(200);
        const { id } = created.body as SavedView;

        const inOtherSpace = await listViews(apiClient, apiKeyHeader, spaceId);
        expect(inOtherSpace.map((view) => view.id)).not.toContain(id);

        // Another space cannot change it, or delete it, by its id.
        const updated = await apiClient.put(viewPath(id, spaceId), {
          headers,
          body: { name },
          responseType: 'json',
        });
        const deleted = await apiClient.delete(viewPath(id, spaceId), {
          headers,
          responseType: 'json',
        });
        expect(updated).toHaveStatusCode(404);
        expect(deleted).toHaveStatusCode(404);

        // Names are told apart per space: the other one can have a view of the same name.
        const sameName = await apiClient.post(listPath(spaceId), {
          headers,
          body: { name },
          responseType: 'json',
        });
        expect(sameName).toHaveStatusCode(200);
        expect((await listViews(apiClient, apiKeyHeader)).map((view) => view.id)).toContain(id);
      } finally {
        // Deleting the space deletes its views.
        await kbnClient.spaces.delete(spaceId).catch(() => {});
      }
    }
  );
});
