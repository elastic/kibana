/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { PUBLIC_HEADERS, ENTITY_STORE_TAGS } from '../fixtures/constants';
import { installAllEntityTypes, uninstallAllEntityTypes } from '../fixtures/helpers';
import { createSystemIndicesEsClient } from '../fixtures/system_indices_es_client';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';

const KIBANA_INDEX = '.kibana';

// The `.kibana` index is a system index; direct access additionally requires
// the x-elastic-product-origin header alongside allow_restricted_indices.
const SYSTEM_INDEX_HEADERS = { 'x-elastic-product-origin': 'kibana' };

// entity-definition was a `multiple-isolated` SO type, so the raw .kibana
// document id is `entity-definition:<objectId>` with no namespace prefix
// (see generateRawId in the core SO serializer).
const v1EntityDefinitionDocId = (entityType: string, namespace: string) =>
  `entity-definition:security_${entityType}_${namespace}`;

const ALL_ENTITY_TYPES = ['user', 'host', 'service', 'generic'] as const;

apiTest.describe('Entity Store remove_v1 SO cleanup', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;
  let systemIndicesEsClient: Client;

  apiTest.beforeAll(async ({ samlAuth, kbnClient, esClient, config }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };
    await kbnClient.uiSettings.update({ [FF_ENABLE_ENTITY_STORE_V2]: true });

    systemIndicesEsClient = await createSystemIndicesEsClient(esClient, config);
  });

  apiTest.afterEach(async ({ apiClient }) => {
    // Remove any seeded docs first and unconditionally, so neither a failed
    // install nor a failed uninstall can leak legacy documents into sibling
    // suites sharing this cluster.
    await Promise.all(
      ALL_ENTITY_TYPES.map((type) =>
        systemIndicesEsClient.delete(
          { index: KIBANA_INDEX, id: v1EntityDefinitionDocId(type, 'default'), refresh: true },
          { headers: SYSTEM_INDEX_HEADERS, ignore: [404] }
        )
      )
    );
    await uninstallAllEntityTypes(apiClient, defaultHeaders);
  });

  apiTest(
    'install removes legacy entity-definition SO documents from .kibana',
    async ({ apiClient }) => {
      const soDocIds = ALL_ENTITY_TYPES.map((type) => v1EntityDefinitionDocId(type, 'default'));

      // Seed fake legacy entity-definition docs directly into .kibana. These
      // would have been written by the now-deleted entity_manager plugin;
      // we simulate their presence to verify that stopAndRemoveV1 deletes them.
      await Promise.all(
        soDocIds.map((id) =>
          systemIndicesEsClient.index(
            {
              index: KIBANA_INDEX,
              id,
              document: {
                type: 'entity-definition',
                references: [],
                updated_at: new Date().toISOString(),
              },
              refresh: 'wait_for',
            },
            { headers: SYSTEM_INDEX_HEADERS }
          )
        )
      );

      const beforeExists = await Promise.all(
        soDocIds.map((id) =>
          systemIndicesEsClient.exists(
            { index: KIBANA_INDEX, id },
            { headers: SYSTEM_INDEX_HEADERS }
          )
        )
      );
      expect(beforeExists).toStrictEqual([true, true, true, true]);

      // install triggers AssetManagerClient.init → stopAndRemoveV1 for each
      // entity type, which deletes the entity-definition doc from .kibana via
      // internalEsClient.delete (kibana_system identity).
      const install = await installAllEntityTypes(apiClient, defaultHeaders);
      expect(install.statusCode).toBe(201);

      const afterExists = await Promise.all(
        soDocIds.map((id) =>
          systemIndicesEsClient.exists(
            { index: KIBANA_INDEX, id },
            { headers: SYSTEM_INDEX_HEADERS }
          )
        )
      );
      expect(afterExists).toStrictEqual([false, false, false, false]);
    }
  );

  apiTest(
    'install succeeds with no legacy entity-definition SOs present',
    async ({ apiClient }) => {
      const soDocIds = ALL_ENTITY_TYPES.map((type) => v1EntityDefinitionDocId(type, 'default'));

      // Confirm nothing pre-exists — install must not fail when there is
      // nothing to clean up (the delete uses ignore: [404]).
      const beforeExists = await Promise.all(
        soDocIds.map((id) =>
          systemIndicesEsClient.exists(
            { index: KIBANA_INDEX, id },
            { headers: SYSTEM_INDEX_HEADERS }
          )
        )
      );
      expect(beforeExists).toStrictEqual([false, false, false, false]);

      const install = await installAllEntityTypes(apiClient, defaultHeaders);
      expect(install.statusCode).toBe(201);
    }
  );
});
