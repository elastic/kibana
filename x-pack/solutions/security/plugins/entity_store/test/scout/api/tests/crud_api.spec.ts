/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { Client } from '@elastic/elasticsearch';
import { hashEuid } from '../../../../server/domain/crud/utils';
import { getEuidFromObject } from '../../../../common/domain/euid';
import type { Entity, HostEntity } from '../../../../common/domain/definitions/entity.gen';
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
    expect(response.statusCode).toBe(201);
  });

  apiTest.afterAll(async ({ apiClient }) => {
    const response = await apiClient.post(ENTITY_STORE_ROUTES.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(200);
  });

  apiTest('Should create an entity with generated ID', async ({ apiClient, esClient }) => {
    const entityObj: Entity = {
      entity: {},
    };
    const create = await apiClient.post(ENTITY_STORE_ROUTES.CRUD_CREATE('generic'), {
      headers: defaultHeaders,
      responseType: 'json',
      body: entityObj,
    });
    expect(create.statusCode).toBe(200);
    expect(create.body).toStrictEqual({ ok: true });

    const entities = await esClient.search({
      index: LATEST_INDEX,
      query: {
        match_all: {},
      },
    });
    expect(entities.hits.hits.length).toBeGreaterThan(0);
  });

  apiTest('Should require a force flag for restricted fields', async ({ apiClient, esClient }) => {
    // Send a field that exists on generic definition but has allowAPIUpdate: false (e.g. entity.name)
    const entityObj: Entity = {
      entity: {
        name: 'needs-force-flag',
      },
    };

    const create = await apiClient.post(ENTITY_STORE_ROUTES.CRUD_CREATE('generic'), {
      headers: defaultHeaders,
      responseType: 'json',
      body: entityObj,
    });
    expect(create.statusCode).toBe(400);
    expect(create.body.message).toContain('not allowed to be updated without forcing it');

    const createWithForce = await apiClient.post(
      ENTITY_STORE_ROUTES.CRUD_CREATE('generic') + '?force=true',
      {
        headers: defaultHeaders,
        responseType: 'json',
        body: entityObj,
      }
    );
    expect(createWithForce.statusCode).toBe(200);
  });

  apiTest('Should update an entity by ID', async ({ apiClient, esClient }) => {
    const entityObj: Entity = {
      entity: {
        id: 'host:this-is-update',
      },
      host: {
        name: 'this-is-update',
      },
    };

    const create = await apiClient.post(ENTITY_STORE_ROUTES.CRUD_CREATE('host'), {
      headers: defaultHeaders,
      responseType: 'json',
      body: entityObj,
    });
    expect(create.statusCode).toBe(200);
    expect(await countEntitiesByID(esClient, LATEST_INDEX, 'host:this-is-update')).toBe(1);

    // Update the entity with the same ID
    const update = await apiClient.put(ENTITY_STORE_ROUTES.CRUD_UPDATE('host') + '?force=true', {
      headers: defaultHeaders,
      responseType: 'json',
      body: {
        entity: {
          id: entityObj.entity.id,
        },
        host: {
          name: 'updated-name',
        },
      },
    });
    expect(update.statusCode).toBe(200);

    const entities = await esClient.search({
      index: LATEST_INDEX,
      query: {
        term: {
          'host.entity.id': 'host:this-is-update',
        },
      },
    });
    expect(entities.hits.hits).toHaveLength(1);
    const received = entities.hits.hits[0]._source as HostEntity;
    expect(received.host?.name).toBe('updated-name');
  });

  apiTest('Should perform a bulk update', async ({ apiClient, esClient }) => {
    const bulkBody = {
      entities: [
        {
          type: 'generic',
          doc: {
            entity: {},
          },
        },
        {
          type: 'generic',
          doc: {
            entity: {},
          },
        },
      ],
    };

    const bulkUpdate = await apiClient.put(ENTITY_STORE_ROUTES.CRUD_BULK_UPDATE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: bulkBody,
    });
    expect(bulkUpdate.statusCode).toBe(200);
    expect(bulkUpdate.body.errors).toHaveLength(0);

    const resp = await esClient.search({
      index: LATEST_INDEX,
      query: {
        match_all: {},
      },
    });
    expect(resp.hits.hits.length).toBeGreaterThanOrEqual(2);
  });

  apiTest('Should delete an entity', async ({ apiClient, esClient }) => {
    const entityObj: Entity = {
      entity: {},
    };
    const create = await apiClient.post(ENTITY_STORE_ROUTES.CRUD_CREATE('generic'), {
      headers: defaultHeaders,
      responseType: 'json',
      body: entityObj,
    });
    expect(create.statusCode).toBe(200);

    const resp = await esClient.search({
      index: LATEST_INDEX,
      query: {
        match_all: {},
      },
    });
    expect(resp.hits.hits.length).toBeGreaterThan(0);
    const createdEntityId = (resp.hits.hits[0]._source as Entity).entity?.id;
    expect(createdEntityId).toBeDefined();

    const del = await apiClient.delete(ENTITY_STORE_ROUTES.CRUD_DELETE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {
        entityId: createdEntityId,
      },
    });
    expect(del.body).toStrictEqual({ deleted: true });
    expect(del.statusCode).toBe(200);

    const apiNotFound = await apiClient.delete(ENTITY_STORE_ROUTES.CRUD_DELETE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {
        entityId: createdEntityId,
      },
    });
    expect(apiNotFound.body.statusCode).toBe(404);
  });
});

async function countEntitiesByID(esClient: Client, index: string, id: string): Promise<number> {
  const resp = await esClient.search({
    index,
    query: {
      bool: {
        should: [{ wildcard: { 'entity.id': id } }, { wildcard: { 'host.entity.id': id } }],
        minimum_should_match: 1,
      },
    },
  });
  return resp.hits.hits.length;
}
