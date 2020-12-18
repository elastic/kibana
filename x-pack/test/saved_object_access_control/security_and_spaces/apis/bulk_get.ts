/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { SavedObjectsBulkResponse } from 'src/core/server';
import { CONFIDENTIAL_SAVED_OBJECT_TYPE } from '../../fixtures/confidential_plugin/server';
import type { FtrProviderContext } from '../../services';
import { USERS, ExpectedResponse, assertSavedObjectExists } from '../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('POST /api/saved_objects/_bulk_get', () => {
    before(async () => {
      await esArchiver.load(
        'x-pack/test/saved_object_access_control/fixtures/es_archiver/confidential_objects'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/test/saved_object_access_control/fixtures/es_archiver/confidential_objects'
      );
    });

    type BulkGetResponseOpts = Array<{ type: string; id: string; statusCode: number }>;

    const authorizedExpectedResponse: ExpectedResponse<[BulkGetResponseOpts]> = {
      httpCode: 200,
      expectResponse: (opts: BulkGetResponseOpts) => ({ body }) => {
        const expectedPayload = opts.map(({ type, id, statusCode }) => {
          if (statusCode === 403) {
            return {
              error: {
                error: 'Forbidden',
                message: `Unable to bulk_get ${type}:${id}`,
                statusCode: 403,
              },
              id,
              type,
            };
          }
          if (statusCode === 404) {
            return {
              error: {
                error: 'Not Found',
                message: `Saved object [${type}/${id}] not found`,
                statusCode: 404,
              },
              id,
              type,
            };
          }
          if (statusCode === 200) {
            return {
              id,
              type,
            };
          }
          throw new Error(`Unexpected status code: ${statusCode}`);
        });

        const { saved_objects: savedObjects } = body as SavedObjectsBulkResponse;
        expect(savedObjects.length).to.eql(expectedPayload.length);
        savedObjects.forEach((object, index) => {
          const { id, type, error } = expectedPayload[index];
          expect(object.id).to.eql(id);
          expect(object.type).to.eql(type);
          expect(object.error).to.eql(error);
          if (error) {
            expect(object.attributes).to.eql(undefined);
          } else {
            expect(object.attributes).to.be.an(Object);
          }
        });
      },
    };

    const unauthorizedExpectedResponse: ExpectedResponse<[{ savedObjectType: string }]> = {
      httpCode: 403,
      expectResponse: ({ savedObjectType }) => ({ body }) => {
        expect(body).to.eql({
          statusCode: 403,
          error: 'Forbidden',
          message: `Unable to bulk_get ${savedObjectType}`,
        });
      },
    };

    it('returns 404 for confidential objects that do not exist', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = authorizedExpectedResponse;
      const savedObjectId = 'not_found_object';
      await supertest
        .post(`/api/saved_objects/_bulk_get`)
        .auth(username, password)
        .send([
          {
            type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
            id: savedObjectId,
          },
        ])
        .expect(httpCode)
        .then(
          expectResponse([
            {
              type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
              id: savedObjectId,
              statusCode: 404,
            },
          ])
        );
    });

    it('returns 403 for confidential objects that belong to another user', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = authorizedExpectedResponse;
      const savedObjectId = 'bob_doc_1';

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);

      await supertest
        .post(`/api/saved_objects/_bulk_get`)
        .auth(username, password)
        .send([
          {
            type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
            id: savedObjectId,
          },
        ])
        .expect(httpCode)
        .then(
          expectResponse([
            {
              type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
              id: savedObjectId,
              statusCode: 403,
            },
          ])
        );
    });

    it('returns 404 for confidential objects that exist in another space', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = authorizedExpectedResponse;
      const savedObjectId = 'alice_space_1_doc';

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId, 'space_1');

      await supertest
        .post(`/api/saved_objects/_bulk_get`)
        .auth(username, password)
        .send([
          {
            type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
            id: savedObjectId,
          },
        ])
        .expect(httpCode)
        .then(
          expectResponse([
            {
              type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
              id: savedObjectId,
              statusCode: 404,
            },
          ])
        );
    });

    it('returns 403 for users who cannot access confidential objects of this type', async () => {
      const { username, password } = USERS.CHARLIE;
      const { httpCode, expectResponse } = unauthorizedExpectedResponse;
      const savedObjectId = 'charlie_doc_1';

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);

      await supertest
        .post(`/api/saved_objects/_bulk_get`)
        .auth(username, password)
        .send([
          {
            type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
            id: savedObjectId,
          },
        ])
        .expect(httpCode)
        .then(expectResponse({ savedObjectType: CONFIDENTIAL_SAVED_OBJECT_TYPE }));
    });

    it('returns 403 if user is not authorized for all requested types', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = unauthorizedExpectedResponse;

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, 'alice_doc_1');

      await supertest
        .post(`/api/saved_objects/_bulk_get`)
        .auth(username, password)
        .send([
          {
            type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
            id: 'alice_doc_1',
          },
          {
            type: 'dashboard',
            id: 'dashboard_1',
          },
        ])
        .expect(httpCode)
        .then(expectResponse({ savedObjectType: 'dashboard' }));
    });

    it('returns 200 for confidential objects that belong to the current user', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = authorizedExpectedResponse;
      const savedObjectId = 'alice_doc_1';
      await supertest
        .post(`/api/saved_objects/_bulk_get`)
        .auth(username, password)
        .send([
          {
            type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
            id: savedObjectId,
          },
        ])
        .expect(httpCode)
        .then(
          expectResponse([
            {
              type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
              id: savedObjectId,
              statusCode: 200,
            },
          ])
        );
    });

    it('returns only the objects the user is authorized for', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = authorizedExpectedResponse;

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, 'alice_doc_1');
      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, 'bob_doc_1');
      await assertSavedObjectExists(es, 'index-pattern', 'index_pattern_1');

      await supertest
        .post(`/api/saved_objects/_bulk_get`)
        .auth(username, password)
        .send([
          {
            type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
            id: 'alice_doc_1',
          },
          {
            type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
            id: 'bob_doc_1',
          },
        ])
        .expect(httpCode)
        .then(
          expectResponse([
            {
              type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
              id: 'alice_doc_1',
              statusCode: 200,
            },
            {
              type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
              id: 'bob_doc_1',
              statusCode: 403,
            },
          ])
        );
    });

    [USERS.KIBANA_ADMIN, USERS.SUPERUSER].forEach((user) => {
      it(`allows ${user.description} to access objects from other users`, async () => {
        const { username, password } = user;
        const { httpCode, expectResponse } = authorizedExpectedResponse;
        const savedObjectId = 'bob_doc_1';

        await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);

        await supertest
          .post(`/api/saved_objects/_bulk_get`)
          .auth(username, password)
          .send([
            {
              type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
              id: savedObjectId,
            },
          ])
          .expect(httpCode)
          .then(
            expectResponse([
              {
                type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
                id: savedObjectId,
                statusCode: 200,
              },
            ])
          );
      });
    });
  });
}
