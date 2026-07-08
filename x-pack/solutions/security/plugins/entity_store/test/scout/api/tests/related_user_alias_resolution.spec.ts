/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  LATEST_ALIAS,
  LATEST_INDEX,
  UPDATES_INDEX,
  ENTRA_SOURCE_INDEX,
} from '../fixtures/constants';
import { RESOLUTION_RULE_IDS, FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import {
  assertNotResolved,
  clearEntityStoreIndices,
  seedEntityAnalyticsSource,
  seedUserEntity,
  triggerMaintainerRun,
  waitForResolution,
} from '../fixtures/helpers';

apiTest.describe(
  'Related user alias resolution integration tests',
  { tag: ENTITY_STORE_TAGS },
  () => {
    let defaultHeaders: Record<string, string>;
    let internalHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ apiClient, esClient, kbnClient, samlAuth }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = {
        ...credentials.cookieHeader,
        ...PUBLIC_HEADERS,
      };
      internalHeaders = {
        ...credentials.cookieHeader,
        ...INTERNAL_HEADERS,
      };

      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

      await esClient.indices.delete({
        index: [LATEST_INDEX, UPDATES_INDEX, ENTRA_SOURCE_INDEX],
        ignore_unavailable: true,
      });

      const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect([200, 201]).toContain(installResponse.statusCode);

      const initResponse = await apiClient.post(
        ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_INIT,
        {
          headers: internalHeaders,
          responseType: 'json',
          body: {},
        }
      );
      expect([200, 201]).toContain(initResponse.statusCode);
    });

    apiTest.beforeEach(async ({ apiClient, esClient }) => {
      await esClient.deleteByQuery({
        index: LATEST_ALIAS,
        refresh: true,
        query: { match_all: {} },
        ignore_unavailable: true,
      });
      await esClient.indices.delete({ index: ENTRA_SOURCE_INDEX, ignore_unavailable: true });

      const enable = await apiClient.put(
        ENTITY_STORE_ROUTES.public.RESOLUTION_RULES_ENABLE(
          RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION
        ),
        {
          headers: defaultHeaders,
          responseType: 'json',
        }
      );
      expect(enable.statusCode).toBe(200);
    });

    apiTest.afterAll(async ({ apiClient, esClient }) => {
      const response = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect(response.statusCode).toBe(200);
      await clearEntityStoreIndices(esClient);
      await esClient.indices.delete({ index: ENTRA_SOURCE_INDEX, ignore_unavailable: true });
    });

    apiTest(
      'enables alias resolution, links related user candidate by priority target, then preserves link when disabled',
      async ({ apiClient, esClient }) => {
        const seedId = 'user:seed@example.com@entra_id';
        const adId = 'user:T03KX1Z@active_directory';
        const disabledSeedId = 'user:disabled@example.com@entra_id';
        const disabledAdId = 'user:T04KX2Z@active_directory';

        await expectAliasResolutionEnabled(apiClient, defaultHeaders, true);

        await seedUserEntity(esClient, {
          entityId: seedId,
          namespace: 'entra_id',
          email: 'seed@example.com',
          userName: 'seed@example.com',
        });
        await seedUserEntity(esClient, {
          entityId: adId,
          namespace: 'active_directory',
          email: 'ad@example.com',
          userName: 'T03KX1Z',
        });
        await seedEntityAnalyticsSource(esClient, {
          email: 'seed@example.com',
          relatedUsers: ['T03KX1Z'],
        });

        await triggerMaintainerRun(apiClient, internalHeaders, 'automated-resolution', {
          sync: true,
        });
        await waitForResolution(esClient, seedId, adId);

        const disable = await apiClient.put(
          ENTITY_STORE_ROUTES.public.RESOLUTION_RULES_DISABLE(
            RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION
          ),
          {
            headers: defaultHeaders,
            responseType: 'json',
          }
        );
        expect(disable.statusCode).toBe(200);
        await expectAliasResolutionEnabled(apiClient, defaultHeaders, false);

        const group = await apiClient.get(
          `${ENTITY_STORE_ROUTES.public.RESOLUTION_GROUP}?entity_id=${seedId}&apiVersion=2`,
          {
            headers: defaultHeaders,
            responseType: 'json',
          }
        );
        expect(group.statusCode).toBe(200);
        expect(group.body.target.entity.id).toBe(adId);
        expect(group.body.group_size).toBe(2);

        await seedUserEntity(esClient, {
          entityId: disabledSeedId,
          namespace: 'entra_id',
          email: 'disabled@example.com',
          userName: 'disabled@example.com',
        });
        await seedUserEntity(esClient, {
          entityId: disabledAdId,
          namespace: 'active_directory',
          email: 'disabled-ad@example.com',
          userName: 'T04KX2Z',
        });
        await seedEntityAnalyticsSource(esClient, {
          email: 'disabled@example.com',
          relatedUsers: ['T04KX2Z'],
        });

        await triggerMaintainerRun(apiClient, internalHeaders, 'automated-resolution', {
          sync: true,
        });
        await assertNotResolved(esClient, disabledSeedId);
      }
    );

    apiTest(
      'does not link when related user value has no candidate',
      async ({ apiClient, esClient }) => {
        const seedId = 'user:no-link@example.com@entra_id';

        await seedUserEntity(esClient, {
          entityId: seedId,
          namespace: 'entra_id',
          email: 'no-link@example.com',
          userName: 'no-link@example.com',
        });
        await seedEntityAnalyticsSource(esClient, {
          email: 'no-link@example.com',
          relatedUsers: ['missing-candidate'],
        });

        await triggerMaintainerRun(apiClient, internalHeaders, 'automated-resolution', {
          sync: true,
        });

        await assertNotResolved(esClient, seedId);
        const group = await apiClient.get(
          `${ENTITY_STORE_ROUTES.public.RESOLUTION_GROUP}?entity_id=${seedId}&apiVersion=2`,
          {
            headers: defaultHeaders,
            responseType: 'json',
          }
        );
        expect(group.statusCode).toBe(200);
        expect(group.body.group_size).toBe(1);
      }
    );

    apiTest(
      'cascades candidate aliases to the priority target',
      async ({ apiClient, esClient }) => {
        const seedId = 'user:cascade@example.com@entra_id';
        const adId = 'user:CASCADE_AD@active_directory';
        const oktaId = 'user:cascade-okta@okta';
        const oktaAliasId = 'user:cascade-okta-alias@okta';

        await seedUserEntity(esClient, {
          entityId: seedId,
          namespace: 'entra_id',
          email: 'cascade@example.com',
          userName: 'cascade@example.com',
        });
        await seedUserEntity(esClient, {
          entityId: adId,
          namespace: 'active_directory',
          email: 'cascade-ad@example.com',
          userName: 'CASCADE_AD',
        });
        await seedUserEntity(esClient, {
          entityId: oktaId,
          namespace: 'okta',
          email: 'cascade-okta@example.com',
          userName: 'cascade-okta-login',
        });
        await seedUserEntity(esClient, {
          entityId: oktaAliasId,
          namespace: 'okta',
          email: 'cascade-okta-alias@example.com',
          userName: 'cascade-okta-alias',
        });

        const preLink = await apiClient.post(ENTITY_STORE_ROUTES.public.RESOLUTION_LINK, {
          headers: defaultHeaders,
          responseType: 'json',
          body: { target_id: oktaId, entity_ids: [oktaAliasId] },
        });
        expect(preLink.statusCode).toBe(200);

        await seedEntityAnalyticsSource(esClient, {
          email: 'cascade@example.com',
          relatedUsers: ['CASCADE_AD', 'cascade-okta-login'],
        });

        await triggerMaintainerRun(apiClient, internalHeaders, 'automated-resolution', {
          sync: true,
        });

        await waitForResolution(esClient, seedId, adId);
        await waitForResolution(esClient, oktaId, adId);
        await waitForResolution(esClient, oktaAliasId, adId);
      }
    );
  }
);

const expectAliasResolutionEnabled = async (
  apiClient: {
    get: Function;
  },
  headers: Record<string, string>,
  enabled: boolean
) => {
  const list = await apiClient.get(ENTITY_STORE_ROUTES.public.RESOLUTION_RULES_LIST, {
    headers,
    responseType: 'json',
  });

  expect(list.statusCode).toBe(200);
  expect(list.body.rules).toStrictEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION,
        enabled,
      }),
    ])
  );
};
