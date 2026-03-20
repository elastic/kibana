/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  COMMON_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  LATEST_INDEX,
  UPDATES_INDEX,
} from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import {
  seedUserEntity,
  waitForResolution,
  assertNotResolved,
  triggerMaintainerRun,
} from '../fixtures/helpers';

apiTest.describe('Automated email resolution integration tests', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ apiClient, esClient, kbnClient, samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...COMMON_HEADERS,
    };

    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });

    await esClient.indices.delete({
      index: [LATEST_INDEX, UPDATES_INDEX],
      ignore_unavailable: true,
    });

    const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect([200, 201]).toContain(installResponse.statusCode);

    const initResponse = await apiClient.post(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_INIT, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect([200, 201]).toContain(initResponse.statusCode);
  });

  apiTest.beforeEach(async ({ esClient }) => {
    // Clean up all entities from the LATEST index so tests are independent
    await esClient.deleteByQuery({
      index: LATEST_INDEX,
      refresh: true,
      query: { match_all: {} },
      ignore_unavailable: true,
    });
  });

  apiTest.afterAll(async ({ apiClient }) => {
    const response = await apiClient.post(ENTITY_STORE_ROUTES.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(200);
  });

  apiTest(
    'Basic email matching — two entities with same email',
    async ({ apiClient, esClient }) => {
      const email = 'test1-basic@co.com';
      const oktaEntity = 'test1-okta-user';
      const entraEntity = 'test1-entra-user';

      await seedUserEntity(esClient, { entityId: oktaEntity, namespace: 'okta', email });
      await seedUserEntity(esClient, { entityId: entraEntity, namespace: 'entra_id', email });

      await triggerMaintainerRun(apiClient, defaultHeaders);
      await waitForResolution(esClient, entraEntity, oktaEntity);

      const groupResponse = await apiClient.get(
        `${ENTITY_STORE_ROUTES.RESOLUTION_GROUP}?entity_id=${oktaEntity}&apiVersion=2`,
        { headers: defaultHeaders, responseType: 'json' }
      );

      expect(groupResponse.statusCode).toBe(200);
      expect(groupResponse.body.group_size).toBe(2);
      expect(groupResponse.body.target.entity.id).toBe(oktaEntity);
      expect(groupResponse.body.aliases).toHaveLength(1);
      expect(groupResponse.body.aliases[0].entity.id).toBe(entraEntity);
    }
  );

  apiTest(
    'Namespace priority — AD entity selected as target over Okta and Entra',
    async ({ apiClient, esClient }) => {
      const email = 'test2-ns-priority@co.com';
      const adEntity = 'test2-ad-user';
      const oktaEntity = 'test2-okta-user';
      const entraEntity = 'test2-entra-user';

      await seedUserEntity(esClient, {
        entityId: adEntity,
        namespace: 'active_directory',
        email,
      });
      await seedUserEntity(esClient, { entityId: oktaEntity, namespace: 'okta', email });
      await seedUserEntity(esClient, { entityId: entraEntity, namespace: 'entra_id', email });

      await triggerMaintainerRun(apiClient, defaultHeaders);
      await waitForResolution(esClient, oktaEntity, adEntity);
      await waitForResolution(esClient, entraEntity, adEntity);

      const groupResponse = await apiClient.get(
        `${ENTITY_STORE_ROUTES.RESOLUTION_GROUP}?entity_id=${adEntity}&apiVersion=2`,
        { headers: defaultHeaders, responseType: 'json' }
      );

      expect(groupResponse.statusCode).toBe(200);
      expect(groupResponse.body.group_size).toBe(3);
      expect(groupResponse.body.target.entity.id).toBe(adEntity);

      const aliasIds = groupResponse.body.aliases.map((a: any) => a.entity.id);
      expect(aliasIds).toStrictEqual(expect.arrayContaining([oktaEntity, entraEntity]));
    }
  );

  apiTest(
    'Alphabetical fallback — unknown namespaces use entity ID tiebreaker',
    async ({ apiClient, esClient }) => {
      const email = 'test3-alpha@co.com';
      const entityA = 'test3-a-user';
      const entityB = 'test3-b-user';

      await seedUserEntity(esClient, { entityId: entityB, namespace: 'github', email });
      await seedUserEntity(esClient, { entityId: entityA, namespace: 'slack', email });

      await triggerMaintainerRun(apiClient, defaultHeaders);
      await waitForResolution(esClient, entityB, entityA);

      const groupResponse = await apiClient.get(
        `${ENTITY_STORE_ROUTES.RESOLUTION_GROUP}?entity_id=${entityA}&apiVersion=2`,
        { headers: defaultHeaders, responseType: 'json' }
      );

      expect(groupResponse.statusCode).toBe(200);
      expect(groupResponse.body.group_size).toBe(2);
      expect(groupResponse.body.target.entity.id).toBe(entityA);
    }
  );

  apiTest(
    'Extend existing group — new entity with matching email joins pre-existing resolution group',
    async ({ apiClient, esClient }) => {
      const email = 'test4-extend@co.com';
      const targetEntity = 'test4-target';
      const aliasEntity = 'test4-alias';
      const newEntity = 'test4-new';

      await seedUserEntity(esClient, { entityId: targetEntity, namespace: 'okta', email });
      await seedUserEntity(esClient, { entityId: aliasEntity, namespace: 'entra_id', email });

      // Manually link first
      const linkResponse = await apiClient.post(ENTITY_STORE_ROUTES.RESOLUTION_LINK, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { target_id: targetEntity, entity_ids: [aliasEntity] },
      });
      expect(linkResponse.statusCode).toBe(200);

      // Seed 3rd entity with the same email
      await seedUserEntity(esClient, { entityId: newEntity, namespace: 'entra_id', email });

      await triggerMaintainerRun(apiClient, defaultHeaders);
      await waitForResolution(esClient, newEntity, targetEntity);

      const groupResponse = await apiClient.get(
        `${ENTITY_STORE_ROUTES.RESOLUTION_GROUP}?entity_id=${targetEntity}&apiVersion=2`,
        { headers: defaultHeaders, responseType: 'json' }
      );

      expect(groupResponse.statusCode).toBe(200);
      expect(groupResponse.body.group_size).toBe(3);
      expect(groupResponse.body.target.entity.id).toBe(targetEntity);

      const aliasIds = groupResponse.body.aliases.map((a: any) => a.entity.id);
      expect(aliasIds).toStrictEqual(expect.arrayContaining([aliasEntity, newEntity]));
    }
  );

  apiTest(
    'Incremental pickup — watermark advances; second run processes only new entities',
    async ({ apiClient, esClient }) => {
      const emailA = 'test5-batch-a@co.com';
      const emailB = 'test5-batch-b@co.com';

      const entityA1 = 'test5-a1';
      const entityA2 = 'test5-a2';
      const entityB1 = 'test5-b1';
      const entityB2 = 'test5-b2';

      // First batch — email A (uses current timestamp by default)
      await seedUserEntity(esClient, { entityId: entityA1, namespace: 'okta', email: emailA });
      await seedUserEntity(esClient, { entityId: entityA2, namespace: 'entra_id', email: emailA });

      await triggerMaintainerRun(apiClient, defaultHeaders);
      await waitForResolution(esClient, entityA2, entityA1);

      // Second batch — email B (naturally gets a later timestamp since time has passed)
      await seedUserEntity(esClient, { entityId: entityB1, namespace: 'okta', email: emailB });
      await seedUserEntity(esClient, { entityId: entityB2, namespace: 'entra_id', email: emailB });

      await triggerMaintainerRun(apiClient, defaultHeaders);
      await waitForResolution(esClient, entityB2, entityB1);

      // Verify both groups exist independently
      const groupA = await apiClient.get(
        `${ENTITY_STORE_ROUTES.RESOLUTION_GROUP}?entity_id=${entityA1}&apiVersion=2`,
        { headers: defaultHeaders, responseType: 'json' }
      );
      expect(groupA.statusCode).toBe(200);
      expect(groupA.body.group_size).toBe(2);
      expect(groupA.body.target.entity.id).toBe(entityA1);

      const groupB = await apiClient.get(
        `${ENTITY_STORE_ROUTES.RESOLUTION_GROUP}?entity_id=${entityB1}&apiVersion=2`,
        { headers: defaultHeaders, responseType: 'json' }
      );
      expect(groupB.statusCode).toBe(200);
      expect(groupB.body.group_size).toBe(2);
      expect(groupB.body.target.entity.id).toBe(entityB1);
    }
  );

  apiTest(
    'Multi-value email excluded — entity with array user.email is not matched',
    async ({ apiClient, esClient }) => {
      const sharedEmail = 'test6-multi@co.com';
      const multiValueEntity = 'test6-multi-value';
      const singleA = 'test6-single-a';
      const singleB = 'test6-single-b';

      // Entity with multi-value email — should be excluded by painless size() == 1 filter
      await seedUserEntity(esClient, {
        entityId: multiValueEntity,
        namespace: 'okta',
        email: [sharedEmail, 'test6-other@co.com'],
      });

      await seedUserEntity(esClient, {
        entityId: singleA,
        namespace: 'entra_id',
        email: sharedEmail,
      });
      await seedUserEntity(esClient, {
        entityId: singleB,
        namespace: 'active_directory',
        email: sharedEmail,
      });

      await triggerMaintainerRun(apiClient, defaultHeaders);

      // B+A should be resolved (AD wins as target)
      await waitForResolution(esClient, singleA, singleB);

      // Multi-value entity should NOT be resolved
      await assertNotResolved(esClient, multiValueEntity);

      // Verify group: only singleA and singleB, not multi-value entity
      const groupResponse = await apiClient.get(
        `${ENTITY_STORE_ROUTES.RESOLUTION_GROUP}?entity_id=${singleB}&apiVersion=2`,
        { headers: defaultHeaders, responseType: 'json' }
      );
      expect(groupResponse.statusCode).toBe(200);
      expect(groupResponse.body.group_size).toBe(2);
      expect(groupResponse.body.target.entity.id).toBe(singleB);
    }
  );

  apiTest(
    'Ambiguous buckets skipped — multiple existing targets for same email',
    async ({ apiClient, esClient }) => {
      const email = 'test7-ambiguous@co.com';
      const e1 = 'test7-e1';
      const t1 = 'test7-t1';
      const e2 = 'test7-e2';
      const t2 = 'test7-t2';
      const e3 = 'test7-unresolved';

      // Seed all 5 entities with the same email
      await seedUserEntity(esClient, { entityId: t1, namespace: 'okta', email });
      await seedUserEntity(esClient, { entityId: e1, namespace: 'entra_id', email });
      await seedUserEntity(esClient, { entityId: t2, namespace: 'active_directory', email });
      await seedUserEntity(esClient, { entityId: e2, namespace: 'github', email });
      await seedUserEntity(esClient, { entityId: e3, namespace: 'slack', email });

      // Pre-link into two separate targets (creating ambiguity)
      const link1 = await apiClient.post(ENTITY_STORE_ROUTES.RESOLUTION_LINK, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { target_id: t1, entity_ids: [e1] },
      });
      expect(link1.statusCode).toBe(200);

      const link2 = await apiClient.post(ENTITY_STORE_ROUTES.RESOLUTION_LINK, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { target_id: t2, entity_ids: [e2] },
      });
      expect(link2.statusCode).toBe(200);

      await triggerMaintainerRun(apiClient, defaultHeaders);

      // E3 should stay unresolved because the bucket is ambiguous (2 existing targets)
      await assertNotResolved(esClient, e3);
    }
  );

  apiTest(
    'Manual override preserved — manually linked entity not re-resolved; new entity extends group',
    async ({ apiClient, esClient }) => {
      const email = 'test8-override@co.com';
      const entityA = 'test8-a';
      const entityB = 'test8-b';
      const entityC = 'test8-c';

      await seedUserEntity(esClient, { entityId: entityA, namespace: 'entra_id', email });
      await seedUserEntity(esClient, { entityId: entityB, namespace: 'okta', email });

      // Manually link A → B (B is target)
      const linkResponse = await apiClient.post(ENTITY_STORE_ROUTES.RESOLUTION_LINK, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { target_id: entityB, entity_ids: [entityA] },
      });
      expect(linkResponse.statusCode).toBe(200);

      // Seed C (unresolved, same email)
      await seedUserEntity(esClient, { entityId: entityC, namespace: 'entra_id', email });

      await triggerMaintainerRun(apiClient, defaultHeaders);

      // C should resolve to B (existing target in the group)
      await waitForResolution(esClient, entityC, entityB);

      // A should still be linked to B (manual override preserved)
      await waitForResolution(esClient, entityA, entityB);

      const groupResponse = await apiClient.get(
        `${ENTITY_STORE_ROUTES.RESOLUTION_GROUP}?entity_id=${entityB}&apiVersion=2`,
        { headers: defaultHeaders, responseType: 'json' }
      );

      expect(groupResponse.statusCode).toBe(200);
      expect(groupResponse.body.group_size).toBe(3);
      expect(groupResponse.body.target.entity.id).toBe(entityB);

      const aliasIds = groupResponse.body.aliases.map((a: any) => a.entity.id);
      expect(aliasIds).toStrictEqual(expect.arrayContaining([entityA, entityC]));
    }
  );
});
