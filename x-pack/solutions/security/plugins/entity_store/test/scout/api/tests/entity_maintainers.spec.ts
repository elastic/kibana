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
import { COMMON_HEADERS, ENTITY_STORE_ROUTES, ENTITY_STORE_TAGS } from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import { getUpdatesEntitiesDataStreamName } from '../../../../server/domain/asset_manager/updates_data_stream';
import { getLatestEntitiesIndexName } from '../../../../server/domain/asset_manager/latest_index';

const REGISTERED_MAINTAINER_ID = 'entity_maintainers_test';
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
  apiTest.describe('privilege checks', () => {
    apiTest.beforeEach(async ({ kbnClient }) => {
      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
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
  });

  apiTest.describe('init logic', () => {
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

    apiTest('Should schedule never-started maintainers and return 200', async ({ apiClient }) => {
      const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect(installResponse.statusCode).toBe(201);

      const getBefore = await apiClient.get(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_GET, {
        headers: defaultHeaders,
        responseType: 'json',
      });
      expect(getBefore.statusCode).toBe(200);
      const maintainerBefore = getBefore.body.maintainers?.find(
        (m: { id: string }) => m.id === REGISTERED_MAINTAINER_ID
      );
      expect(maintainerBefore).toBeDefined();
      expect(maintainerBefore.taskStatus).toBe('never_started');

      const initResponse = await apiClient.post(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_INIT, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect(initResponse.statusCode).toBe(200);
      expect(initResponse.body).toMatchObject({ ok: true });

      const getAfter = await apiClient.get(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_GET, {
        headers: defaultHeaders,
        responseType: 'json',
      });
      expect(getAfter.statusCode).toBe(200);
      const maintainerAfter = getAfter.body.maintainers?.find(
        (m: { id: string }) => m.id === REGISTERED_MAINTAINER_ID
      );
      expect(maintainerAfter).toBeDefined();
      expect(maintainerAfter.taskStatus).toBe('started');
      expect(typeof maintainerAfter.runs).toBe('number');
    });

    apiTest(
      'Should be idempotent: second init does not duplicate or change already-started maintainers',
      async ({ apiClient }) => {
        await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
          headers: defaultHeaders,
          responseType: 'json',
          body: {},
        });
        await apiClient.post(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_INIT, {
          headers: defaultHeaders,
          responseType: 'json',
          body: {},
        });

        const getAfterFirst = await apiClient.get(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_GET, {
          headers: defaultHeaders,
          responseType: 'json',
        });
        const maintainerAfterFirst = getAfterFirst.body.maintainers?.find(
          (m: { id: string }) => m.id === REGISTERED_MAINTAINER_ID
        );
        expect(maintainerAfterFirst?.taskStatus).toBe('started');

        const secondInit = await apiClient.post(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_INIT, {
          headers: defaultHeaders,
          responseType: 'json',
          body: {},
        });
        expect(secondInit.statusCode).toBe(200);

        const getAfterSecond = await apiClient.get(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_GET, {
          headers: defaultHeaders,
          responseType: 'json',
        });
        const listAfterSecond = getAfterSecond.body.maintainers ?? [];
        const maintainersWithId = listAfterSecond.filter(
          (m: { id: string }) => m.id === REGISTERED_MAINTAINER_ID
        );
        expect(maintainersWithId).toHaveLength(1);
        expect(maintainersWithId[0].taskStatus).toBe('started');
      }
    );

    apiTest(
      'Should not start stopped maintainers: init only schedules missing tasks',
      async ({ apiClient }) => {
        await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
          headers: defaultHeaders,
          responseType: 'json',
          body: {},
        });
        await apiClient.post(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_INIT, {
          headers: defaultHeaders,
          responseType: 'json',
          body: {},
        });

        const stopResponse = await apiClient.put(
          ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_STOP(REGISTERED_MAINTAINER_ID),
          {
            headers: defaultHeaders,
            responseType: 'json',
            body: {},
          }
        );
        expect(stopResponse.statusCode).toBe(200);

        const getAfterStop = await apiClient.get(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_GET, {
          headers: defaultHeaders,
          responseType: 'json',
        });
        const maintainerStopped = getAfterStop.body.maintainers?.find(
          (m: { id: string }) => m.id === REGISTERED_MAINTAINER_ID
        );
        expect(maintainerStopped?.taskStatus).toBe('stopped');

        const initResponse = await apiClient.post(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_INIT, {
          headers: defaultHeaders,
          responseType: 'json',
          body: {},
        });
        expect(initResponse.statusCode).toBe(200);

        const getAfterInit = await apiClient.get(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_GET, {
          headers: defaultHeaders,
          responseType: 'json',
        });
        const maintainerAfterInit = getAfterInit.body.maintainers?.find(
          (m: { id: string }) => m.id === REGISTERED_MAINTAINER_ID
        );
        expect(maintainerAfterInit?.taskStatus).toBe('stopped');
      }
    );

    apiTest(
      'Should return 200 when all maintainers already have tasks (no-op)',
      async ({ apiClient }) => {
        await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
          headers: defaultHeaders,
          responseType: 'json',
          body: {},
        });
        await apiClient.post(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_INIT, {
          headers: defaultHeaders,
          responseType: 'json',
          body: {},
        });

        const initNoOp = await apiClient.post(ENTITY_STORE_ROUTES.ENTITY_MAINTAINERS_INIT, {
          headers: defaultHeaders,
          responseType: 'json',
          body: {},
        });
        expect(initNoOp.statusCode).toBe(200);
        expect(initNoOp.body).toMatchObject({ ok: true });
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
});
