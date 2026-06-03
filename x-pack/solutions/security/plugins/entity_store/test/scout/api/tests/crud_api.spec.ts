/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import type { Client } from '@elastic/elasticsearch';
import { hashEuid, getEuidFromObject } from '../../../../common/domain/euid';
import type { Entity, HostEntity } from '../../../../common/domain/definitions/entity.gen';
import {
  PUBLIC_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
  LATEST_ALIAS,
} from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import { clearEntityStoreIndices } from '../fixtures/helpers';

apiTest.describe('Entity Store CRUD API tests', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ apiClient, kbnClient, samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };

    // enable feature flag
    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });

    // Install the entity store
    const response = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(201);
  });

  apiTest.afterAll(async ({ apiClient, esClient }) => {
    const response = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(200);
    await clearEntityStoreIndices(esClient);
  });

  apiTest('Should create an entity', async ({ apiClient, esClient }) => {
    const entityObj: Entity = {
      entity: {
        id: 'required-id-create',
      },
    };
    const create = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('generic'), {
      headers: defaultHeaders,
      responseType: 'json',
      body: entityObj,
    });
    expect(create.statusCode).toBe(200);
    expect(create.body).toStrictEqual({ ok: true });

    expect(await countEntitiesByID(esClient, LATEST_ALIAS, entityObj.entity!.id!)).toBe(1);
    const euid = getEuidFromObject('generic', entityObj) as string;
    const check = await esClient.get({ index: LATEST_ALIAS, id: hashEuid(euid) });
    expect(check.found).toBe(true);
  });

  apiTest('Should receive a conflict (409) if an entity already exists', async ({ apiClient }) => {
    const entityObj: Entity = {
      entity: {
        id: 'conflict-create',
      },
    };
    const create = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('generic'), {
      headers: defaultHeaders,
      responseType: 'json',
      body: entityObj,
    });
    expect(create.statusCode).toBe(200);
    expect(create.body).toStrictEqual({ ok: true });

    const secondCreate = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('generic'), {
      headers: defaultHeaders,
      responseType: 'json',
      body: entityObj,
    });
    expect(secondCreate.statusCode).toBe(409);
  });

  apiTest(
    'Should use generated EUID on create when entity.id is not supplied',
    async ({ apiClient, esClient }) => {
      // Do not supply entity.id! The EUID should be generated from identity fields
      // For a host entity, EUID is derived from host.name: "host:<host.name>"
      const entityObj = {
        host: { name: 'create-generated-euid' },
      } as Entity;

      const create = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('host'), {
        headers: defaultHeaders,
        responseType: 'json',
        body: entityObj,
      });
      expect(create.statusCode).toBe(200);

      const expectedEuid = 'host:create-generated-euid';

      // Entity should be stored using the generated EUID
      const byGenerated = await esClient.get({
        index: LATEST_ALIAS,
        id: hashEuid(expectedEuid),
      });
      expect(byGenerated.found).toBe(true);

      // The stored entity.id should be the generated EUID
      const source = byGenerated._source as HostEntity;
      expect(source.entity?.id).toBe(expectedEuid);
    }
  );

  apiTest(
    'Should reject create when supplied entity.id does not match generated EUID',
    async ({ apiClient }) => {
      const entityObj: Entity = {
        entity: { id: 'wrong-supplied-id' },
        host: { name: 'create-mismatch-test' },
      };

      const create = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('host'), {
        headers: defaultHeaders,
        responseType: 'json',
        body: entityObj,
      });
      expect(create.statusCode).toBe(400);
      expect(create.body.message).toContain('does not match generated EUID');
    }
  );

  apiTest('Should require a force flag for restricted fields', async ({ apiClient }) => {
    // First create the entity so we can test force flag on update
    const entityId = 'required-id-force';
    const createObj: Entity = { entity: { id: entityId } };
    const create = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('generic'), {
      headers: defaultHeaders,
      responseType: 'json',
      body: createObj,
    });
    expect(create.statusCode).toBe(200);

    // Update with a field that has allowAPIUpdate: false (e.g. entity.name) without force
    const updateObj: Entity = {
      entity: {
        id: entityId,
        name: 'needs-force-flag',
      },
    };

    const update = await apiClient.put(ENTITY_STORE_ROUTES.public.CRUD_UPDATE('generic'), {
      headers: defaultHeaders,
      responseType: 'json',
      body: updateObj,
    });
    expect(update.statusCode).toBe(400);
    expect(update.body.message).toContain('not allowed to be updated without forcing it');

    // With force flag it should succeed
    const updateWithForce = await apiClient.put(
      ENTITY_STORE_ROUTES.public.CRUD_UPDATE('generic') + '?force=true',
      {
        headers: defaultHeaders,
        responseType: 'json',
        body: updateObj,
      }
    );
    expect(updateWithForce.statusCode).toBe(200);
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

    const create = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('host'), {
      headers: defaultHeaders,
      responseType: 'json',
      body: entityObj,
    });
    expect(create.statusCode).toBe(200);
    expect(await countEntitiesByID(esClient, LATEST_ALIAS, 'host:this-is-update')).toBe(1);

    // Update the entity with the same ID
    const update = await apiClient.put(
      ENTITY_STORE_ROUTES.public.CRUD_UPDATE('host') + '?force=true',
      {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          entity: {
            id: entityObj.entity!.id!,
            name: 'this-is-update',
          },
          host: {
            name: 'this-is-update',
          },
        },
      }
    );
    expect(update.statusCode).toBe(200);

    const entities = await esClient.search({
      index: LATEST_ALIAS,
      query: {
        term: {
          'entity.id': 'host:this-is-update',
        },
      },
    });
    expect(entities.hits.hits).toHaveLength(1);
    const received = entities.hits.hits[0]._source as HostEntity;
    expect(received.entity?.id).toBe(entityObj.entity?.id);
    expect(received.host).toMatchObject({
      name: 'this-is-update',
    });
  });

  apiTest(
    'Should update an entity by ID only (no identity fields)',
    async ({ apiClient, esClient }) => {
      // Create a host entity
      const createObj: Entity = {
        entity: { id: 'host:update-id-only' },
        host: { name: 'update-id-only' },
      };
      const create = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('host'), {
        headers: defaultHeaders,
        responseType: 'json',
        body: createObj,
      });
      expect(create.statusCode).toBe(200);

      // Update using only entity.id (no host.name identity field)
      const update = await apiClient.put(
        ENTITY_STORE_ROUTES.public.CRUD_UPDATE('host') + '?force=true',
        {
          headers: defaultHeaders,
          responseType: 'json',
          body: {
            entity: {
              id: 'host:update-id-only',
              name: 'updated-name',
            },
          },
        }
      );
      expect(update.statusCode).toBe(200);

      const entities = await esClient.search({
        index: LATEST_ALIAS,
        query: { term: { 'entity.id': 'host:update-id-only' } },
      });
      expect(entities.hits.hits).toHaveLength(1);
      const received = entities.hits.hits[0]._source as HostEntity;
      expect(received.entity?.name).toBe('updated-name');
    }
  );

  apiTest(
    'Should update an entity by identity fields only (no entity.id)',
    async ({ apiClient, esClient }) => {
      // Create a host entity
      const createObj: Entity = {
        entity: { id: 'host:update-identity-only' },
        host: { name: 'update-identity-only' },
      };
      const create = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('host'), {
        headers: defaultHeaders,
        responseType: 'json',
        body: createObj,
      });
      expect(create.statusCode).toBe(200);

      // Update using only identity fields (host.name), no entity.id
      const update = await apiClient.put(
        ENTITY_STORE_ROUTES.public.CRUD_UPDATE('host') + '?force=true',
        {
          headers: defaultHeaders,
          responseType: 'json',
          body: {
            entity: {
              name: 'updated-via-identity',
            },
            host: {
              name: 'update-identity-only',
            },
          },
        }
      );
      expect(update.statusCode).toBe(200);

      const entities = await esClient.search({
        index: LATEST_ALIAS,
        query: { term: { 'entity.id': 'host:update-identity-only' } },
      });
      expect(entities.hits.hits).toHaveLength(1);
      const received = entities.hits.hits[0]._source as HostEntity;
      expect(received.entity?.name).toBe('updated-via-identity');
    }
  );

  apiTest('Should perform a bulk update', async ({ apiClient, esClient }) => {
    // Create entities first so bulk update has something to update
    for (const id of ['required-id-1-bulk', 'required-id-2-bulk']) {
      const createResp = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('generic'), {
        headers: defaultHeaders,
        responseType: 'json',
        body: { entity: { id } },
      });
      expect(createResp.statusCode).toBe(200);
    }

    const bulkBody = {
      entities: [
        {
          type: 'generic',
          doc: {
            entity: {
              id: 'required-id-1-bulk',
            },
          },
        },
        {
          type: 'generic',
          doc: {
            entity: {
              id: 'required-id-2-bulk',
            },
          },
        },
      ],
    };

    const bulkUpdate = await apiClient.put(ENTITY_STORE_ROUTES.public.CRUD_BULK_UPDATE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: bulkBody,
    });
    expect(bulkUpdate.statusCode).toBe(200);
    expect(bulkUpdate.body.errors).toHaveLength(0);

    const resp = await esClient.search({
      index: LATEST_ALIAS,
      query: {
        wildcard: {
          'entity.id': 'required-id-*-bulk',
        },
      },
    });
    expect(resp.hits.hits).toHaveLength(2);
  });

  apiTest('Should create an entity from a flat document', async ({ apiClient, esClient }) => {
    const flatDoc = {
      'entity.id': 'flat-create-id',
    };
    const create = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('generic'), {
      headers: defaultHeaders,
      responseType: 'json',
      body: flatDoc,
    });
    expect(create.statusCode).toBe(200);
    expect(create.body).toStrictEqual({ ok: true });

    expect(await countEntitiesByID(esClient, LATEST_ALIAS, 'flat-create-id')).toBe(1);
  });

  apiTest('Should update an entity from a flat document', async ({ apiClient, esClient }) => {
    // Create entity first (nested)
    const createObj: Entity = {
      entity: { id: 'host:flat-update' },
      host: { name: 'flat-update' },
    };
    const create = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('host'), {
      headers: defaultHeaders,
      responseType: 'json',
      body: createObj,
    });
    expect(create.statusCode).toBe(200);

    // Update with a flat document
    const flatUpdateDoc = {
      'entity.id': 'host:flat-update',
      'entity.name': 'flat-updated-name',
      'host.name': 'flat-update',
    };
    const update = await apiClient.put(
      ENTITY_STORE_ROUTES.public.CRUD_UPDATE('host') + '?force=true',
      {
        headers: defaultHeaders,
        responseType: 'json',
        body: flatUpdateDoc,
      }
    );
    expect(update.statusCode).toBe(200);

    const entities = await esClient.search({
      index: LATEST_ALIAS,
      query: { term: { 'entity.id': 'host:flat-update' } },
    });
    expect(entities.hits.hits).toHaveLength(1);
    const received = entities.hits.hits[0]._source as HostEntity;
    expect(received.entity?.name).toBe('flat-updated-name');
  });

  apiTest(
    'Should replace values (not merge into arrays) when updating twice with flat documents',
    async ({ apiClient, esClient }) => {
      // Create a host entity
      const createObj: Entity = {
        entity: { id: 'host:flat-double-update' },
        host: { name: 'flat-double-update' },
      };
      const create = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('host'), {
        headers: defaultHeaders,
        responseType: 'json',
        body: createObj,
      });
      expect(create.statusCode).toBe(200);

      // First update with flat doc
      const firstUpdate = await apiClient.put(
        ENTITY_STORE_ROUTES.public.CRUD_UPDATE('host') + '?force=true',
        {
          headers: defaultHeaders,
          responseType: 'json',
          body: {
            'entity.id': 'host:flat-double-update',
            'entity.name': 'first-name',
            'host.name': 'flat-double-update',
          },
        }
      );
      expect(firstUpdate.statusCode).toBe(200);

      // Second update with flat doc on the same paths
      const secondUpdate = await apiClient.put(
        ENTITY_STORE_ROUTES.public.CRUD_UPDATE('host') + '?force=true',
        {
          headers: defaultHeaders,
          responseType: 'json',
          body: {
            'entity.id': 'host:flat-double-update',
            'entity.name': 'second-name',
            'host.name': 'flat-double-update',
          },
        }
      );
      expect(secondUpdate.statusCode).toBe(200);

      const entities = await esClient.search({
        index: LATEST_ALIAS,
        query: { term: { 'entity.id': 'host:flat-double-update' } },
      });
      expect(entities.hits.hits).toHaveLength(1);
      const received = entities.hits.hits[0]._source as HostEntity;

      // Values must be strings, not arrays. Confirms replace, not merge
      expect(received.entity?.name).toBe('second-name');
      expect(typeof received.entity?.name).toBe('string');
      expect(received.host?.name).toBe('flat-double-update');
      expect(typeof received.host?.name).toBe('string');
    }
  );

  apiTest('Should delete an entity', async ({ apiClient, esClient }) => {
    const entityObj: Entity = {
      entity: {
        id: 'required-id-delete',
      },
    };
    const create = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('generic'), {
      headers: defaultHeaders,
      responseType: 'json',
      body: entityObj,
    });
    expect(create.statusCode).toBe(200);
    const resp = await esClient.search({
      index: LATEST_ALIAS,
      query: {
        match: {
          'entity.id': entityObj.entity!.id!,
        },
      },
    });
    expect(resp.hits.hits).toHaveLength(1);
    expect(resp.hits.hits[0]._id).toBeDefined();

    const euid = getEuidFromObject('generic', entityObj) as string;

    const expectedHashedEntityId = hashEuid(euid);
    const hashedEntityId = resp.hits.hits[0]._id as string;
    expect(hashedEntityId).toBe(expectedHashedEntityId);

    const del = await apiClient.delete(ENTITY_STORE_ROUTES.public.CRUD_DELETE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {
        entityId: euid,
      },
    });
    expect(del.body).toStrictEqual({ deleted: true });
    expect(del.statusCode).toBe(200);

    await expect(
      esClient.get({
        index: LATEST_ALIAS,
        id: hashedEntityId,
      })
    ).rejects.toThrow(`"found":false`);

    const apiNotFound = await apiClient.delete(ENTITY_STORE_ROUTES.public.CRUD_DELETE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {
        entityId: entityObj.entity!.id!,
      },
    });
    expect(apiNotFound.body.statusCode).toBe(404);
  });

  apiTest('Should list entities without params', async ({ apiClient, esClient }) => {
    const entityObj: Entity = {
      entity: {
        id: 'required-id-list',
      },
    };

    const create = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('generic'), {
      headers: defaultHeaders,
      responseType: 'json',
      body: entityObj,
    });
    expect(create.statusCode).toBe(200);
    expect(await countEntitiesByID(esClient, LATEST_ALIAS, entityObj.entity!.id!)).toBe(1);

    const list = await apiClient.get(ENTITY_STORE_ROUTES.public.CRUD_GET, {
      headers: defaultHeaders,
      responseType: 'json',
    });
    expect(list.statusCode).toBe(200);
    expect(list.body.entities).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entity: expect.objectContaining({
            id: entityObj.entity!.id!,
          }),
        }),
      ])
    );
  });

  apiTest('Should list entities with a DSL filter', async ({ apiClient }) => {
    const matchEntity: Entity = { entity: { id: 'list-filter-match' } };
    const noMatchEntity: Entity = { entity: { id: 'list-filter-nomatch' } };

    for (const ent of [matchEntity, noMatchEntity]) {
      const resp = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('generic'), {
        headers: defaultHeaders,
        responseType: 'json',
        body: ent,
      });
      expect(resp.statusCode).toBe(200);
    }

    const kqlFilter = `entity.id: ${matchEntity.entity!.id!}`;
    const list = await apiClient.get(
      ENTITY_STORE_ROUTES.public.CRUD_GET + `?filter=${encodeURIComponent(kqlFilter)}`,
      {
        headers: defaultHeaders,
        responseType: 'json',
      }
    );
    expect(list.statusCode).toBe(200);
    expect(list.body.entities).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entity: expect.objectContaining({ id: matchEntity.entity!.id! }),
        }),
      ])
    );
    const returnedIds = list.body.entities.map((e: Entity) => e.entity?.id);
    expect(returnedIds).not.toContain(noMatchEntity.entity!.id!);
  });

  apiTest('Should list entities with size param', async ({ apiClient }) => {
    for (let i = 0; i < 3; i++) {
      const resp = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('generic'), {
        headers: defaultHeaders,
        responseType: 'json',
        body: { entity: { id: `list-size-${i}` } },
      });
      expect(resp.statusCode).toBe(200);
    }

    const list = await apiClient.get(ENTITY_STORE_ROUTES.public.CRUD_GET + '?size=1', {
      headers: defaultHeaders,
      responseType: 'json',
    });
    expect(list.statusCode).toBe(200);
    expect(list.body.entities).toHaveLength(1);
    expect(list.body.nextSearchAfter).toBeDefined();
  });

  apiTest('Should paginate with searchAfter', async ({ apiClient }) => {
    for (let i = 0; i < 2; i++) {
      const resp = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('generic'), {
        headers: defaultHeaders,
        responseType: 'json',
        body: { entity: { id: `list-page-${i}` } },
      });
      expect(resp.statusCode).toBe(200);
    }

    const firstPage = await apiClient.get(ENTITY_STORE_ROUTES.public.CRUD_GET + '?size=1', {
      headers: defaultHeaders,
      responseType: 'json',
    });
    expect(firstPage.statusCode).toBe(200);
    expect(firstPage.body.entities).toHaveLength(1);
    expect(firstPage.body.nextSearchAfter).toBeDefined();

    const searchAfter = JSON.stringify(firstPage.body.nextSearchAfter);
    const secondPage = await apiClient.get(
      ENTITY_STORE_ROUTES.public.CRUD_GET +
        `?size=1&searchAfter=${encodeURIComponent(searchAfter)}`,
      {
        headers: defaultHeaders,
        responseType: 'json',
      }
    );
    expect(secondPage.statusCode).toBe(200);
    expect(secondPage.body.entities).toHaveLength(1);

    const firstId = firstPage.body.entities[0].entity?.id;
    const secondId = secondPage.body.entities[0].entity?.id;
    expect(firstId).not.toBe(secondId);
  });

  apiTest('Should return specific fields when fields param is provided', async ({ apiClient }) => {
    const entityObj: Entity = {
      entity: {
        id: 'list-fields-test',
      },
    };
    const create = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('generic'), {
      headers: defaultHeaders,
      responseType: 'json',
      body: entityObj,
    });
    expect(create.statusCode).toBe(200);

    const kqlFilter = `entity.id: ${entityObj.entity!.id!}`;
    const list = await apiClient.get(
      ENTITY_STORE_ROUTES.public.CRUD_GET +
        `?filter=${encodeURIComponent(kqlFilter)}&fields=entity.id`,
      {
        headers: defaultHeaders,
        responseType: 'json',
      }
    );
    expect(list.statusCode).toBe(200);
    expect(list.body.fields).toBeDefined();
    expect(list.body.fields).toHaveLength(1);
    expect(list.body.fields[0]['entity.id']).toContain(entityObj.entity!.id!);
  });

  apiTest(
    'Should not include fields in response when fields param is omitted',
    async ({ apiClient }) => {
      const entityObj: Entity = {
        entity: {
          id: 'list-no-fields-test',
        },
      };
      const create = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('generic'), {
        headers: defaultHeaders,
        responseType: 'json',
        body: entityObj,
      });
      expect(create.statusCode).toBe(200);

      const kqlFilter = `entity.id: ${entityObj.entity!.id!}`;
      const list = await apiClient.get(
        ENTITY_STORE_ROUTES.public.CRUD_GET + `?filter=${encodeURIComponent(kqlFilter)}`,
        {
          headers: defaultHeaders,
          responseType: 'json',
        }
      );
      expect(list.statusCode).toBe(200);
      expect(list.body.fields).toBeUndefined();
    }
  );

  apiTest(
    'Should return multiple fields when multiple fields are requested',
    async ({ apiClient }) => {
      const entityObj: Entity = {
        entity: {
          id: 'host:list-multi-fields',
        },
        host: {
          name: 'list-multi-fields',
        },
      };
      const create = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('host'), {
        headers: defaultHeaders,
        responseType: 'json',
        body: entityObj,
      });
      expect(create.statusCode).toBe(200);

      const kqlFilter = `entity.id: "${entityObj.entity!.id!}"`;
      const list = await apiClient.get(
        ENTITY_STORE_ROUTES.public.CRUD_GET +
          `?filter=${encodeURIComponent(kqlFilter)}&fields=entity.id,host.name`,
        {
          headers: defaultHeaders,
          responseType: 'json',
        }
      );
      expect(list.statusCode).toBe(200);
      expect(list.body.fields).toBeDefined();
      expect(list.body.fields).toHaveLength(1);
      const fields = list.body.fields[0];
      expect(fields['entity.id']).toContain(entityObj.entity!.id!);
      expect(fields['host.name']).toContain('list-multi-fields');
    }
  );

  apiTest(
    'Should return empty fields entry when requested field does not exist on the entity',
    async ({ apiClient }) => {
      const entityObj: Entity = {
        entity: {
          id: 'list-missing-field-test',
        },
      };
      const create = await apiClient.post(ENTITY_STORE_ROUTES.public.CRUD_CREATE('generic'), {
        headers: defaultHeaders,
        responseType: 'json',
        body: entityObj,
      });
      expect(create.statusCode).toBe(200);

      const kqlFilter = `entity.id: ${entityObj.entity!.id!}`;
      const list = await apiClient.get(
        ENTITY_STORE_ROUTES.public.CRUD_GET +
          `?filter=${encodeURIComponent(kqlFilter)}&fields=entity.id,does.not.exist`,
        {
          headers: defaultHeaders,
          responseType: 'json',
        }
      );
      expect(list.statusCode).toBe(200);
      expect(list.body.fields).toBeDefined();
      expect(list.body.fields).toHaveLength(1);
      expect(list.body.fields[0]['entity.id']).toContain(entityObj.entity!.id!);
      // ES omits missing fields from the fields object entirely
      expect(list.body.fields[0]['does.not.exist']).toBeUndefined();
    }
  );

  apiTest('Should return 400 for invalid kql', async ({ apiClient }) => {
    const list = await apiClient.get(
      ENTITY_STORE_ROUTES.public.CRUD_GET + `?filter=${encodeURIComponent('entity.id:')}`,
      {
        headers: defaultHeaders,
        responseType: 'json',
      }
    );
    expect(list.statusCode).toBe(400);
    expect(list.body.message).toContain('Invalid filter');
  });

  apiTest('Should return 400 for invalid searchAfter JSON', async ({ apiClient }) => {
    const list = await apiClient.get(
      ENTITY_STORE_ROUTES.public.CRUD_GET + `?searchAfter=${encodeURIComponent('{bad')}`,
      {
        headers: defaultHeaders,
        responseType: 'json',
      }
    );
    expect(list.statusCode).toBe(400);
    expect(list.body.message).toContain('Invalid searchAfter');
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
