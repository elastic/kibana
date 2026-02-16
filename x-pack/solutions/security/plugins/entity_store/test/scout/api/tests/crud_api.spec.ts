/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { COMMON_HEADERS, ENTITY_STORE_ROUTES, ENTITY_STORE_TAGS, LATEST_INDEX } from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import { Entity } from '@kbn/entity-store/common/domain/definitions/entity.gen';
import {API_VERSIONS} from '@kbn/entity-store/server/routes/constants';

const genericEntity: Entity = {
    entity: {
        id: 'required-id',
        // type: 'generic'
    }
}


apiTest.describe('Entity Store API tests', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;
  let crudHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ apiClient, kbnClient, samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...COMMON_HEADERS,
    };
    crudHeaders = {
        ...defaultHeaders,
        'elastic-api-version': API_VERSIONS.public.v1,
    };

    // enable feature flag
    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });

    // Install the entity store
    const response = await apiClient.post(ENTITY_STORE_ROUTES.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(200);
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
    'KUBA Should create an entity',
    async ({ apiClient }) => {

      const create = await apiClient.put(ENTITY_STORE_ROUTES.CRUD_UPSERT('generic'), {
        headers: crudHeaders,
        responseType: 'json',
        body: genericEntity,
      });
      expect(create.body).toStrictEqual({ ok: true });
      expect(create.statusCode).toBe(200);

      const search = await apiClient.post(LATEST_INDEX + '/_search', {
        headers: crudHeaders,
        responseType: 'json',
        body: {
            query: {
                term: {
                    'entity.id': genericEntity.entity.id,
                }
            }
        },
      })
      expect(search.statusCode).toBe(200);
      expect(search.body).toBe({});
    }
  );
});
