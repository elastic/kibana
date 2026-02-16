/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { Client } from '@elastic/elasticsearch';
import type { Entity } from '../../../../common/domain/definitions/entity.gen';
import {
  COMMON_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  LATEST_INDEX,
} from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';

apiTest.describe('Entity Store CRUD API tests', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ apiClient, kbnClient, samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...COMMON_HEADERS,
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

  apiTest('Should create an entity', async ({ apiClient, esClient }) => {
    const entityObj: Entity = {
      entity: {
        id: 'required-id-create',
      },
    };
    const create = await apiClient.put(ENTITY_STORE_ROUTES.CRUD_UPSERT('generic'), {
      headers: defaultHeaders,
      responseType: 'json',
      body: entityObj,
    });
    expect(create.statusCode).toBe(200);
    expect(create.body).toStrictEqual({ ok: true });

    expect(await countEntitiesByID(esClient, LATEST_INDEX, entityObj.entity.id)).toBe(1);
  });

  apiTest('Should require a force flag', async ({ apiClient, esClient }) => {
    const entityObj: Entity = {
      entity: {
        id: 'required-id-force',
      },
      host: {
        name: 'needs-force-flag',
      },
    };

    const create = await apiClient.put(ENTITY_STORE_ROUTES.CRUD_UPSERT('generic'), {
      headers: defaultHeaders,
      responseType: 'json',
      body: entityObj,
    });
    expect(create.statusCode).toBe(400);
    expect(create.body.message).toContain('not allowed to be updated without forcing it');

    expect(await countEntitiesByID(esClient, LATEST_INDEX, entityObj.entity.id)).toBe(0);

    const createWithForce = await apiClient.put(
      ENTITY_STORE_ROUTES.CRUD_UPSERT('generic') + '?force=true',
      {
        headers: defaultHeaders,
        responseType: 'json',
        body: entityObj,
      }
    );
    expect(createWithForce.statusCode).toBe(200);

    const entities = await esClient.search({
      index: LATEST_INDEX,
      query: {
        term: {
          'entity.id': entityObj.entity.id,
        },
      },
    });
    expect(await countEntitiesByID(esClient, LATEST_INDEX, entityObj.entity.id)).toBe(1);
  });
});

async function countEntitiesByID(esClient: Client, index: string, id: string): Promise<number> {
  const resp = await esClient.search({
    index,
    query: {
      term: {
        'entity.id': id,
      },
    },
  });
  return resp.hits.hits.length;
}
