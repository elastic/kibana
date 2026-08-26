/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  LEAD_GENERATION_ROUTES,
  INTERNAL_HEADERS,
  LEAD_GENERATION_TAGS,
} from '../../fixtures/lead_generation_constants';
import {
  seedLead,
  cleanupLeadsIndex,
  DEFAULT_SPACE_ID,
} from '../../fixtures/lead_generation_helpers';
import { decodeCursor } from '../../../../../../server/lib/entity_analytics/lead_generation/change_cursor';

const expectCursorMatchesLastLead = (
  cursor: string,
  leads: Array<{ id: string; changedAt: string }>
): void => {
  const lastLead = leads[leads.length - 1];
  if (lastLead == null) {
    throw new Error('Expected at least one lead to compare against the cursor');
  }
  expect(decodeCursor(cursor)).toMatchObject({
    version: 1,
    changedAt: new Date(lastLead.changedAt).getTime(),
    docId: lastLead.id,
  });
};

apiTest.describe(
  'Lead Generation - GET /internal/entity_analytics/leads/changes',
  { tag: LEAD_GENERATION_TAGS },
  () => {
    let defaultHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };

      await apiClient.post(LEAD_GENERATION_ROUTES.ENABLE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { connectorId: 'test-connector' },
      });
    });

    apiTest.beforeEach(async ({ esClient }) => {
      await cleanupLeadsIndex(esClient, DEFAULT_SPACE_ID);
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      await cleanupLeadsIndex(esClient, DEFAULT_SPACE_ID);
      await apiClient.post(LEAD_GENERATION_ROUTES.DISABLE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    });

    apiTest('returns empty result and null cursor when no leads exist', async ({ apiClient }) => {
      const response = await apiClient.get(LEAD_GENERATION_ROUTES.GET_CHANGES, {
        headers: defaultHeaders,
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({ changed: [], cursor: null, hasMore: false });
    });

    apiTest(
      'returns leads updated within the last 7 days and excludes older ones',
      async ({ apiClient, esClient }) => {
        const withinWindow = new Date().toISOString();
        const outsideWindow = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

        await seedLead(esClient, { entityName: 'alice', changedAt: withinWindow });
        await seedLead(esClient, { entityName: 'bob', changedAt: outsideWindow });

        const response = await apiClient.get(LEAD_GENERATION_ROUTES.GET_CHANGES, {
          headers: defaultHeaders,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.changed).toHaveLength(1);
        expect(response.body.changed[0].entity.name).toBe('alice');
      }
    );

    apiTest(
      'returns hasMore false and a checkpoint cursor when all results fit within perPage',
      async ({ apiClient, esClient }) => {
        await seedLead(esClient, { entityName: 'alice' });
        await seedLead(esClient, { entityName: 'bob' });

        const response = await apiClient.get(`${LEAD_GENERATION_ROUTES.GET_CHANGES}?perPage=100`, {
          headers: defaultHeaders,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.changed).toHaveLength(2);
        expect(response.body.hasMore).toBe(false);
        expectCursorMatchesLastLead(response.body.cursor, response.body.changed);
      }
    );

    apiTest(
      'returns hasMore true when there are more results than perPage',
      async ({ apiClient, esClient }) => {
        await seedLead(esClient, { entityName: 'alice' });
        await seedLead(esClient, { entityName: 'bob' });
        await seedLead(esClient, { entityName: 'carol' });

        const response = await apiClient.get(`${LEAD_GENERATION_ROUTES.GET_CHANGES}?perPage=2`, {
          headers: defaultHeaders,
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body.changed).toHaveLength(2);
        expect(response.body.hasMore).toBe(true);
        expectCursorMatchesLastLead(response.body.cursor, response.body.changed);
      }
    );

    apiTest(
      'paginates through all leads using cursor across multiple pages',
      async ({ apiClient, esClient }) => {
        const t1 = new Date(Date.now() - 3000).toISOString();
        const t2 = new Date(Date.now() - 2000).toISOString();
        const t3 = new Date(Date.now() - 1000).toISOString();

        await seedLead(esClient, { entityName: 'alice', changedAt: t1 });
        await seedLead(esClient, { entityName: 'bob', changedAt: t2 });
        await seedLead(esClient, { entityName: 'carol', changedAt: t3 });

        const page1 = await apiClient.get(`${LEAD_GENERATION_ROUTES.GET_CHANGES}?perPage=2`, {
          headers: defaultHeaders,
          responseType: 'json',
        });

        expect(page1).toHaveStatusCode(200);
        expect(page1.body.changed).toHaveLength(2);
        expect(page1.body.hasMore).toBe(true);
        expectCursorMatchesLastLead(page1.body.cursor, page1.body.changed);

        const page2 = await apiClient.get(
          `${LEAD_GENERATION_ROUTES.GET_CHANGES}?perPage=2&cursor=${page1.body.cursor}`,
          { headers: defaultHeaders, responseType: 'json' }
        );

        expect(page2).toHaveStatusCode(200);
        expect(page2.body.changed).toHaveLength(1);
        expect(page2.body.hasMore).toBe(false);
        expectCursorMatchesLastLead(page2.body.cursor, page2.body.changed);
        expect(page2.body.cursor).not.toBe(page1.body.cursor);

        const allNames = [...page1.body.changed, ...page2.body.changed].map(
          (l: { entity: { name: string } }) => l.entity.name
        );
        expect(allNames.sort()).toStrictEqual(['alice', 'bob', 'carol']);
      }
    );

    apiTest(
      'returns only leads updated after the cursor position on incremental polls',
      async ({ apiClient, esClient }) => {
        const earlier = new Date(Date.now() - 2000).toISOString();

        await seedLead(esClient, { entityName: 'alice', changedAt: earlier });
        await seedLead(esClient, { entityName: 'bob', changedAt: earlier });

        // First poll — establishes the cursor position.
        const firstPoll = await apiClient.get(LEAD_GENERATION_ROUTES.GET_CHANGES, {
          headers: defaultHeaders,
          responseType: 'json',
        });

        expect(firstPoll.body.changed).toHaveLength(2);
        expect(firstPoll.body.hasMore).toBe(false);
        const cursor: string = firstPoll.body.cursor;

        // Seed a new lead after the cursor.
        await seedLead(esClient, { entityName: 'carol' });

        // Second poll — should return only the new lead.
        const secondPoll = await apiClient.get(
          `${LEAD_GENERATION_ROUTES.GET_CHANGES}?cursor=${cursor}`,
          { headers: defaultHeaders, responseType: 'json' }
        );

        expect(secondPoll).toHaveStatusCode(200);
        expect(secondPoll.body.changed).toHaveLength(1);
        expect(secondPoll.body.changed[0].entity.name).toBe('carol');
      }
    );

    apiTest(
      'returns a lead that was changed after the cursor, not leads that were only created before it',
      async ({ apiClient, esClient }) => {
        const earlier = new Date(Date.now() - 2000).toISOString();

        await seedLead(esClient, { entityName: 'alice', changedAt: earlier });
        await seedLead(esClient, { entityName: 'bob', changedAt: earlier });

        const firstPoll = await apiClient.get(LEAD_GENERATION_ROUTES.GET_CHANGES, {
          headers: defaultHeaders,
          responseType: 'json',
        });

        expect(firstPoll).toHaveStatusCode(200);
        expect(firstPoll.body.changed).toHaveLength(2);
        const cursor: string = firstPoll.body.cursor;

        await seedLead(esClient, {
          entityName: 'alice',
          changedAt: new Date().toISOString(),
        });

        const secondPoll = await apiClient.get(
          `${LEAD_GENERATION_ROUTES.GET_CHANGES}?cursor=${cursor}`,
          { headers: defaultHeaders, responseType: 'json' }
        );

        expect(secondPoll).toHaveStatusCode(200);
        expect(secondPoll.body.changed).toHaveLength(1);
        expect(secondPoll.body.changed[0].entity.name).toBe('alice');
      }
    );

    apiTest(
      'does not return a lead when only timestamp was refreshed after the cursor',
      async ({ apiClient, esClient }) => {
        const earlier = new Date(Date.now() - 2000).toISOString();

        await seedLead(esClient, {
          entityName: 'alice',
          timestamp: earlier,
          changedAt: earlier,
        });

        const firstPoll = await apiClient.get(LEAD_GENERATION_ROUTES.GET_CHANGES, {
          headers: defaultHeaders,
          responseType: 'json',
        });

        expect(firstPoll).toHaveStatusCode(200);
        expect(firstPoll.body.changed).toHaveLength(1);
        const cursor: string = firstPoll.body.cursor;

        // last-seen timestamp moves, change-feed clock does not.
        await seedLead(esClient, {
          entityName: 'alice',
          timestamp: new Date().toISOString(),
          changedAt: earlier,
        });

        const secondPoll = await apiClient.get(
          `${LEAD_GENERATION_ROUTES.GET_CHANGES}?cursor=${cursor}`,
          { headers: defaultHeaders, responseType: 'json' }
        );

        expect(secondPoll).toHaveStatusCode(200);
        expect(secondPoll.body.changed).toHaveLength(0);
        expect(secondPoll.body.cursor).toBe(cursor);
      }
    );

    apiTest(
      'returns a lead dismissed after the cursor with status dismissed',
      async ({ apiClient, esClient }) => {
        const earlier = new Date(Date.now() - 2000).toISOString();

        const { id: aliceId } = await seedLead(esClient, {
          entityName: 'alice',
          changedAt: earlier,
        });
        await seedLead(esClient, { entityName: 'bob', changedAt: earlier });

        const firstPoll = await apiClient.get(LEAD_GENERATION_ROUTES.GET_CHANGES, {
          headers: defaultHeaders,
          responseType: 'json',
        });

        expect(firstPoll).toHaveStatusCode(200);
        expect(firstPoll.body.changed).toHaveLength(2);
        const cursor: string = firstPoll.body.cursor;

        const dismissResponse = await apiClient.post(LEAD_GENERATION_ROUTES.DISMISS(aliceId), {
          headers: defaultHeaders,
          responseType: 'json',
          body: {},
        });
        expect(dismissResponse).toHaveStatusCode(200);

        const secondPoll = await apiClient.get(
          `${LEAD_GENERATION_ROUTES.GET_CHANGES}?cursor=${cursor}`,
          { headers: defaultHeaders, responseType: 'json' }
        );

        expect(secondPoll).toHaveStatusCode(200);
        expect(secondPoll.body.changed).toHaveLength(1);
        expect(secondPoll.body.changed[0].id).toBe(aliceId);
        expect(secondPoll.body.changed[0].status).toBe('dismissed');
      }
    );

    apiTest(
      'echoes the incoming cursor when polling and nothing has changed',
      async ({ apiClient, esClient }) => {
        await seedLead(esClient, { entityName: 'alice' });

        const firstPoll = await apiClient.get(LEAD_GENERATION_ROUTES.GET_CHANGES, {
          headers: defaultHeaders,
          responseType: 'json',
        });

        expect(firstPoll).toHaveStatusCode(200);
        expect(firstPoll.body.changed).toHaveLength(1);
        const cursor: string = firstPoll.body.cursor;
        expect(typeof cursor).toBe('string');

        const secondPoll = await apiClient.get(
          `${LEAD_GENERATION_ROUTES.GET_CHANGES}?cursor=${cursor}`,
          { headers: defaultHeaders, responseType: 'json' }
        );

        expect(secondPoll).toHaveStatusCode(200);
        expect(secondPoll.body.changed).toHaveLength(0);
        expect(secondPoll.body.hasMore).toBe(false);
        expect(secondPoll.body.cursor).toBe(cursor);
      }
    );

    apiTest('returns 400 for a malformed cursor', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${LEAD_GENERATION_ROUTES.GET_CHANGES}?cursor=not-a-valid-cursor`,
        { headers: defaultHeaders, responseType: 'json' }
      );

      expect(response).toHaveStatusCode(400);
    });
  }
);
