/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchRoleDescriptor } from '@kbn/scout-security';
import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';

import {
  ENTITY_STORE_CLUSTER_PRIVILEGES,
  ENTITY_STORE_SOURCE_INDICES_PRIVILEGES,
  ENTITY_STORE_TARGET_INDICES_PRIVILEGES,
} from '../../../../server/domain/constants';
import { getLatestEntitiesIndexName } from '../../../../server/domain/asset_manager/latest_index';
import { getUpdatesEntitiesDataStreamName } from '../../../../server/domain/asset_manager/updates_data_stream';
import { COMMON_HEADERS, ENTITY_STORE_ROUTES, ENTITY_STORE_TAGS } from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';

// Init/stop/start/run behavior with registered maintainers is covered by Jest
// (entity_maintainers_client.test.ts) with a mocked registry.

const TARGET_INDEX_LATEST = getLatestEntitiesIndexName('default');
const TARGET_INDEX_UPDATES = getUpdatesEntitiesDataStreamName('default');
const SAVED_OBJECT_PRIVILEGE = 'saved_object:entity-engine-descriptor-v2/create';

interface RoleOptions {
  withTargetIndex?: boolean;
  withSavedObjectCreate?: boolean;
}

const buildRoleDescriptor = ({
  withTargetIndex = true,
  withSavedObjectCreate = true,
}: RoleOptions = {}): ElasticsearchRoleDescriptor => {
  const indices = [
    { names: ['logs-*'], privileges: ENTITY_STORE_SOURCE_INDICES_PRIVILEGES },
    { names: [TARGET_INDEX_UPDATES], privileges: ENTITY_STORE_SOURCE_INDICES_PRIVILEGES },
  ];

  if (withTargetIndex) {
    indices.push({
      names: [TARGET_INDEX_LATEST],
      privileges: ENTITY_STORE_TARGET_INDICES_PRIVILEGES,
    });
  }

  return {
    cluster: ENTITY_STORE_CLUSTER_PRIVILEGES,
    indices,
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: withSavedObjectCreate
          ? ['feature_siem.all', SAVED_OBJECT_PRIVILEGE]
          : ['feature_siem.all'],
        resources: ['*'],
      },
    ],
  };
};

const getRoleWithoutTargetIndexPrivileges = () => buildRoleDescriptor({ withTargetIndex: false });
const getRoleWithoutSavedObjectCreate = () => buildRoleDescriptor({ withSavedObjectCreate: false });

apiTest.describe('Entity Store entity maintainers', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...COMMON_HEADERS,
    };
  });

  apiTest.beforeEach(async ({ kbnClient }) => {
    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });
  });

  apiTest.afterEach(async ({ apiClient }) => {
    await apiClient.post(ENTITY_STORE_ROUTES.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
  });

  apiTest(
    'Should return 403 when user lacks permissions for target index patterns',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(
        getRoleWithoutTargetIndexPrivileges()
      );

      const response = await apiClient.post(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_INIT, {
        headers: { ...COMMON_HEADERS, ...apiKeyHeader },
        responseType: 'json',
        body: {},
      });

      expect(response.statusCode).toBe(403);
      expect(response.body.attributes).toMatchObject({
        missing_elasticsearch_privileges: {
          cluster: [],
          index: [
            {
              index: TARGET_INDEX_LATEST,
              privileges: expect.arrayContaining(ENTITY_STORE_TARGET_INDICES_PRIVILEGES),
            },
          ],
        },
      });
    }
  );

  apiTest(
    'Should return 403 when user lacks permissions for entity store saved object descriptor',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(
        getRoleWithoutSavedObjectCreate()
      );

      const response = await apiClient.post(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_INIT, {
        headers: { ...COMMON_HEADERS, ...apiKeyHeader },
        responseType: 'json',
        body: {},
      });

      expect(response.statusCode).toBe(403);
      expect(response.body.attributes).toMatchObject({
        missing_kibana_privileges: [SAVED_OBJECT_PRIVILEGE],
      });
    }
  );

  apiTest('Should return 400 when entity store is not installed', async ({ apiClient }) => {
    await apiClient.post(ENTITY_STORE_ROUTES.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });

    const initResponse = await apiClient.post(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_INIT, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });

    expect(initResponse.statusCode).toBe(400);
    expect(initResponse.body.message).toBe(
      'Entity store is not installed. Install the entity store first, then initialize entity maintainers.'
    );
  });
});
