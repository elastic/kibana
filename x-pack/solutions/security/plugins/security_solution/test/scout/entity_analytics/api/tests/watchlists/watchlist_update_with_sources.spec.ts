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
import { WATCHLISTS_URL } from '../../../../../../common/entity_analytics/watchlists/constants';

const NAME_PREFIX = 'scout-update-with-sources';

const PUBLIC_HEADERS = {
  'kbn-xsrf': 'scout',
  'Content-Type': 'application/json;charset=UTF-8',
  'elastic-api-version': API_VERSIONS.public.v1,
};
const uniqueName = (label: string) => `${NAME_PREFIX}-${label}-${Date.now()}`;

const storeSource = (name: string) => ({ type: 'store', name, queryRule: 'entity.id: *' });

apiTest.describe(
  'Watchlists - updating a watchlist together with its data sources',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;
    let indexName: string;
    const createdIds: string[] = [];

    apiTest.beforeAll(async ({ samlAuth, esClient }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser('admin'));

      // The index the index-type data sources read from
      indexName = `auditbeat-scout-update-with-sources-${Date.now()}`;
      await esClient.indices.create({
        index: indexName,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            user: { properties: { name: { type: 'keyword' } } },
          },
        },
      });
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      for (const id of createdIds) {
        await apiClient.delete(`${WATCHLISTS_URL.replace(/^\//, '')}/${id}`, {
          headers: { ...cookieHeader, ...PUBLIC_HEADERS },
        });
      }
      await esClient.indices.delete({ index: indexName, ignore_unavailable: true });
    });

    const indexSource = (name: string) => ({
      type: 'index',
      name,
      indexPattern: indexName,
      identifierField: 'user.name',
    });

    const createWatchlist = async (
      apiClient: ApiClientFixture,
      name: string,
      entitySources?: object[]
    ) => {
      const response = await apiClient.post(WATCHLISTS_URL.replace(/^\//, ''), {
        headers: { ...cookieHeader, ...PUBLIC_HEADERS },
        responseType: 'json',
        body: { name, riskModifier: 1, entitySources },
      });
      expect(response).toHaveStatusCode(200);
      createdIds.push(response.body.id);
      return response.body.id as string;
    };

    const update = (apiClient: ApiClientFixture, id: string, body: object) =>
      apiClient.put(`${WATCHLISTS_URL.replace(/^\//, '')}/${id}`, {
        headers: { ...cookieHeader, ...PUBLIC_HEADERS },
        responseType: 'json',
        body,
      });

    const getSources = async (apiClient: ApiClientFixture, id: string) => {
      const response = await apiClient.get(
        `${WATCHLISTS_URL.replace(/^\//, '')}/${id}/entity_source/list`,
        { headers: { ...cookieHeader, ...PUBLIC_HEADERS }, responseType: 'json' }
      );
      expect(response).toHaveStatusCode(200);
      return response.body.sources as Array<{ type: string; name: string }>;
    };

    const getSourceNames = async (apiClient: ApiClientFixture, id: string) =>
      (await getSources(apiClient, id)).map((source) => source.name);

    const getWatchlistName = async (apiClient: ApiClientFixture, id: string) => {
      const response = await apiClient.get(`${WATCHLISTS_URL.replace(/^\//, '')}/${id}`, {
        headers: { ...cookieHeader, ...PUBLIC_HEADERS },
        responseType: 'json',
      });
      return response.body.name as string;
    };

    apiTest(
      'adds a data source and renames the watchlist in one request',
      async ({ apiClient }) => {
        const id = await createWatchlist(apiClient, uniqueName('add'));
        const newName = uniqueName('added');

        const response = await update(apiClient, id, {
          name: newName,
          riskModifier: 1.5,
          entitySources: [storeSource(`${newName}-store`)],
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.name).toBe(newName);
        expect(await getSourceNames(apiClient, id)).toStrictEqual([`${newName}-store`]);
      }
    );

    apiTest(
      'removes the data source when empty entitySources array is provided',
      async ({ apiClient }) => {
        const name = uniqueName('remove');
        const id = await createWatchlist(apiClient, name, [storeSource(`${name}-store`)]);

        const response = await update(apiClient, id, { name, riskModifier: 1, entitySources: [] });

        expect(response).toHaveStatusCode(200);
        expect(await getSourceNames(apiClient, id)).toStrictEqual([]);
      }
    );

    apiTest(
      'leaves the data sources alone when the request does not mention them',
      async ({ apiClient }) => {
        const name = uniqueName('untouched');
        const id = await createWatchlist(apiClient, name, [storeSource(`${name}-store`)]);

        const response = await update(apiClient, id, { name, description: 'new', riskModifier: 1 });

        expect(response).toHaveStatusCode(200);
        expect(await getSourceNames(apiClient, id)).toStrictEqual([`${name}-store`]);
      }
    );

    apiTest(
      'rejects a name another watchlist uses and leaves the data source as it was',
      async ({ apiClient }) => {
        const takenName = uniqueName('taken');
        await createWatchlist(apiClient, takenName);
        const name = uniqueName('rename-conflict');
        const id = await createWatchlist(apiClient, name, [storeSource(`${name}-store`)]);

        const response = await update(apiClient, id, {
          name: takenName,
          riskModifier: 1,
          entitySources: [storeSource(`${takenName}-store`)],
        });

        expect(response).toHaveStatusCode(409);
        expect(await getWatchlistName(apiClient, id)).toBe(name);
        expect(await getSourceNames(apiClient, id)).toStrictEqual([`${name}-store`]);
      }
    );

    apiTest(
      'switches from an entity store source to an index source and renames in one request',
      async ({ apiClient }) => {
        const name = uniqueName('store-to-index');
        const id = await createWatchlist(apiClient, name, [storeSource(`${name}-store`)]);
        const newName = uniqueName('store-to-index-renamed');

        const response = await update(apiClient, id, {
          name: newName,
          riskModifier: 1,
          entitySources: [indexSource(`${newName}-index`)],
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.name).toBe(newName);
        // Only the index source is left
        const sources = await getSources(apiClient, id);
        expect(sources).toStrictEqual([
          expect.objectContaining({
            type: 'index',
            name: `${newName}-index`,
          }),
        ]);
      }
    );

    apiTest(
      'keeps the index source when switching to an entity store source fails on a taken name, and switches once the name is free',
      async ({ apiClient }) => {
        const takenName = uniqueName('taken-by-another');
        await createWatchlist(apiClient, takenName);
        const name = uniqueName('index-to-store');
        const id = await createWatchlist(apiClient, name, [indexSource(`${name}-index`)]);

        const conflict = await update(apiClient, id, {
          name: takenName,
          riskModifier: 1,
          entitySources: [storeSource(`${takenName}-store`)],
        });

        expect(conflict).toHaveStatusCode(409);
        expect(await getWatchlistName(apiClient, id)).toBe(name);
        expect(await getSources(apiClient, id)).toStrictEqual([
          expect.objectContaining({ type: 'index', name: `${name}-index` }),
        ]);

        const newName = uniqueName('index-to-store-renamed');
        const retry = await update(apiClient, id, {
          name: newName,
          riskModifier: 1,
          entitySources: [storeSource(`${newName}-store`)],
        });

        expect(retry).toHaveStatusCode(200);
        expect(await getWatchlistName(apiClient, id)).toBe(newName);
        expect(await getSources(apiClient, id)).toStrictEqual([
          expect.objectContaining({ type: 'store', name: `${newName}-store` }),
        ]);
      }
    );

    apiTest(
      'rejects more than one data source for a watchlist that is not managed',
      async ({ apiClient }) => {
        const name = uniqueName('one-source');
        const id = await createWatchlist(apiClient, name, [storeSource(`${name}-store`)]);

        const response = await update(apiClient, id, {
          name,
          riskModifier: 1,
          entitySources: [
            storeSource(`${name}-store`),
            { type: 'index', name: `${name}-index`, indexPattern: 'logs-*' },
          ],
        });

        expect(response).toHaveStatusCode(400);
        expect(await getSourceNames(apiClient, id)).toStrictEqual([`${name}-store`]);
      }
    );

    apiTest('rejects an entity store source without a query', async ({ apiClient }) => {
      const name = uniqueName('no-query');
      const id = await createWatchlist(apiClient, name);

      const response = await update(apiClient, id, {
        name,
        riskModifier: 1,
        entitySources: [{ type: 'store', name: `${name}-store` }],
      });

      expect(response).toHaveStatusCode(400);
      expect(await getSourceNames(apiClient, id)).toStrictEqual([]);
    });
  }
);
