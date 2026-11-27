/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-security';
import { apiTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { API_VERSIONS } from '../../../../../../common/constants';
import {
  PRIVILEGED_USER_WATCHLIST_NAME,
  WATCHLISTS_URL,
} from '../../../../../../common/entity_analytics/watchlists/constants';

const OTHER_SPACE_ID = `watchlist-name-uniqueness-${Date.now()}`;
const NAME_PREFIX = 'scout-name-uniqueness';

const HEADERS = {
  'kbn-xsrf': 'scout',
  'Content-Type': 'application/json;charset=UTF-8',
  'elastic-api-version': API_VERSIONS.public.v1,
};

/** The route of the watchlists API in a space; the default space has no prefix. */
const urlIn = (spaceId: string | undefined, path = '') =>
  `${spaceId ? `s/${spaceId}/` : ''}${WATCHLISTS_URL.replace(/^\//, '')}${path}`;

const uniqueName = (label: string) => `${NAME_PREFIX}-${label}-${Date.now()}`;

apiTest.describe(
  'Watchlists - unique names within a space',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    const created: Array<{ id: string; spaceId?: string }> = [];

    apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));
      await apiServices.spaces.create({ id: OTHER_SPACE_ID, name: OTHER_SPACE_ID });
    });

    apiTest.afterAll(async ({ apiClient, apiServices, esClient }) => {
      for (const { id, spaceId } of created) {
        await apiClient.delete(urlIn(spaceId, `/${id}`), {
          headers: { ...cookieHeader, ...HEADERS },
        });
      }
      // The index of the space's watchlists is not removed with the watchlists or the space
      await esClient.indices.delete({
        index: `.entity_analytics.watchlists.${OTHER_SPACE_ID}`,
        ignore_unavailable: true,
      });
      await apiServices.spaces.delete(OTHER_SPACE_ID);
    });

    const createWatchlist = async (apiClient: ApiClientFixture, name: string, spaceId?: string) => {
      const response = await apiClient.post(urlIn(spaceId), {
        headers: { ...cookieHeader, ...HEADERS },
        responseType: 'json',
        body: { name, riskModifier: 1 },
      });
      if (response.statusCode === 200) {
        created.push({ id: response.body.id, spaceId });
      }
      return response;
    };

    apiTest('rejects a second watchlist with the same name in the space', async ({ apiClient }) => {
      const name = uniqueName('duplicate');
      expect(await createWatchlist(apiClient, name)).toHaveStatusCode(200);

      const duplicate = await createWatchlist(apiClient, name);

      expect(duplicate).toHaveStatusCode(409);
      expect(duplicate.body.message).toContain(name);

      const list = await apiClient.get(urlIn(undefined, '/list'), {
        headers: { ...cookieHeader, ...HEADERS },
        responseType: 'json',
      });
      const matching = list.body.filter((w: { name: string }) => w.name === name);
      expect(matching).toHaveLength(1);
    });

    apiTest(
      'treats names that differ only by surrounding spaces as the same',
      async ({ apiClient }) => {
        const name = uniqueName('trimmed');
        expect(await createWatchlist(apiClient, `  ${name} `)).toHaveStatusCode(200);

        expect(await createWatchlist(apiClient, name)).toHaveStatusCode(409);
      }
    );

    apiTest('allows the same name in another space', async ({ apiClient }) => {
      const name = uniqueName('other-space');
      expect(await createWatchlist(apiClient, name)).toHaveStatusCode(200);

      expect(await createWatchlist(apiClient, name, OTHER_SPACE_ID)).toHaveStatusCode(200);
    });

    apiTest('rejects renaming a watchlist onto an existing name', async ({ apiClient }) => {
      const takenName = uniqueName('taken');
      const otherName = uniqueName('to-rename');
      expect(await createWatchlist(apiClient, takenName)).toHaveStatusCode(200);
      const other = await createWatchlist(apiClient, otherName);
      expect(other).toHaveStatusCode(200);

      const rename = await apiClient.put(urlIn(undefined, `/${other.body.id}`), {
        headers: { ...cookieHeader, ...HEADERS },
        responseType: 'json',
        body: { name: takenName, riskModifier: 1 },
      });

      expect(rename).toHaveStatusCode(409);
      const unchanged = await apiClient.get(urlIn(undefined, `/${other.body.id}`), {
        headers: { ...cookieHeader, ...HEADERS },
        responseType: 'json',
      });
      expect(unchanged.body.name).toBe(otherName);
    });

    apiTest('lets a watchlist keep its name when other fields change', async ({ apiClient }) => {
      const name = uniqueName('keep-name');
      const watchlist = await createWatchlist(apiClient, name);
      expect(watchlist).toHaveStatusCode(200);

      const update = await apiClient.put(urlIn(undefined, `/${watchlist.body.id}`), {
        headers: { ...cookieHeader, ...HEADERS },
        responseType: 'json',
        body: { name, description: 'updated', riskModifier: 1.5 },
      });

      expect(update).toHaveStatusCode(200);
      expect(update.body.riskModifier).toBe(1.5);
    });

    apiTest(
      'does not let a user create a watchlist with a system watchlist name',
      async ({ apiClient }) => {
        const response = await createWatchlist(apiClient, PRIVILEGED_USER_WATCHLIST_NAME);

        // The system watchlist can already exist, which is also a 409, so check the reason
        expect(response).toHaveStatusCode(409);
        expect(response.body.message).toContain('is reserved for a system watchlist');
      }
    );

    apiTest('treats special characters in names as plain text', async ({ apiClient }) => {
      const base = uniqueName('special');
      const name = `${base} (EU): "quoted" \\ back`;
      expect(await createWatchlist(apiClient, name)).toHaveStatusCode(200);
      expect(await createWatchlist(apiClient, name)).toHaveStatusCode(409);

      // A `*` is not a wildcard: it does not match a longer name that already exists
      expect(await createWatchlist(apiClient, `${base}-wildcard-longer`)).toHaveStatusCode(200);
      expect(await createWatchlist(apiClient, `${base}-wildcard*`)).toHaveStatusCode(200);
    });
  }
);
