/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SavedObject, SavedObjectsExportResultDetails } from 'src/core/server';
import { CONFIDENTIAL_SAVED_OBJECT_TYPE } from '../../fixtures/confidential_plugin/server';
import { USERS, ExpectedResponse, assertSavedObjectExists } from '../../common/lib';
import { FtrProviderContext } from '../../services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');

  describe('POST /api/saved_objects/_export', () => {
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

    const authorizedExpectedResponse: ExpectedResponse<
      [
        {
          excludedObjects?: Array<SavedObject<unknown>>;
          excludedObjectsCount?: number;
          expectedResults: Array<SavedObject<unknown>>;
          missingRefCount?: number;
          missingReferences?: SavedObjectsExportResultDetails['missingReferences'];
        }
      ]
    > = {
      httpCode: 200,
      expectResponse: ({
        excludedObjects = [],
        excludedObjectsCount = 0,
        expectedResults,
        missingRefCount = 0,
        missingReferences = [],
      }) => (response) => {
        const ndjson: Array<SavedObject<unknown>> = response.text.split('\n').map(JSON.parse);
        const summary = ndjson.pop();
        expect(summary).to.eql({
          excludedObjects,
          excludedObjectsCount,
          exportedCount: expectedResults.length,
          missingRefCount,
          missingReferences,
        });

        expect(ndjson.length).to.eql(expectedResults.length);
        ndjson.forEach(({ type, id, accessControl }, index) => {
          const expected = expectedResults[index];
          expect({ type, id }).to.eql({ type: expected.type, id: expected.id });
          expect(accessControl).to.eql(undefined);
        });
      },
    };

    const unauthorizedForObjectExpectedResponse: ExpectedResponse<
      [
        {
          savedObjectType: string;
          savedObjectId: string;
        }
      ]
    > = {
      httpCode: 400,
      expectResponse: ({ savedObjectType, savedObjectId }) => ({ body }) => {
        expect(body).to.eql({
          error: 'Bad Request',
          message: 'Error fetching objects to export',
          statusCode: 400,
          attributes: {
            objects: [
              {
                error: {
                  error: 'Forbidden',
                  message: `Unable to bulk_get ${savedObjectType}:${savedObjectId}`,
                  statusCode: 403,
                },
                id: savedObjectId,
                type: savedObjectType,
              },
            ],
          },
        });
      },
    };

    it('does not export confidential objects when user is not authorized for the type', async () => {
      const { username, password } = USERS.CHARLIE;
      const { httpCode, expectResponse } = authorizedExpectedResponse;

      await supertest
        .post(`/api/saved_objects/_export`)
        .auth(username, password)
        .send({
          type: [CONFIDENTIAL_SAVED_OBJECT_TYPE],
        })
        .expect(httpCode)
        .then(
          expectResponse({
            expectedResults: [],
          })
        );
    });

    it('does not export confidential objects when user is not authorized for the instance', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = unauthorizedForObjectExpectedResponse;

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, 'bob_doc_1');

      await supertest
        .post(`/api/saved_objects/_export`)
        .auth(username, password)
        .send({
          objects: [
            {
              type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
              id: 'bob_doc_1',
            },
          ],
        })
        .expect(httpCode)
        .then(
          expectResponse({
            savedObjectType: CONFIDENTIAL_SAVED_OBJECT_TYPE,
            savedObjectId: 'bob_doc_1',
          })
        );
    });

    it('does not export other users confidential objects even when referenced from public objects', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = authorizedExpectedResponse;

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, 'bob_doc_1');

      await supertest
        .post(`/api/saved_objects/index-pattern/sneaky-index-pattern`)
        .auth(username, password)
        .send({
          attributes: {
            title: 'sneaky',
          },
          references: [
            {
              name: `Somebody else's confidential saved object`,
              type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
              id: 'bob_doc_1',
            },
          ],
        })
        .expect(200);

      await supertest
        .post(`/api/saved_objects/_export`)
        .auth(username, password)
        .send({
          objects: [
            {
              type: 'index-pattern',
              id: 'sneaky-index-pattern',
            },
          ],
          includeReferencesDeep: true,
        })
        .expect(httpCode)
        .then(
          expectResponse({
            expectedResults: [
              {
                id: 'sneaky-index-pattern',
                type: 'index-pattern',
                attributes: { title: 'sneaky' },
                references: [
                  {
                    name: `Somebody else's confidential saved object`,
                    type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
                    id: 'bob_doc_1',
                  },
                ],
              },
            ],
            missingRefCount: 1,
            missingReferences: [
              {
                type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
                id: 'bob_doc_1',
              },
            ],
          })
        );
    });

    it('allows confidential objects to be exported, and removes the accessControl', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = authorizedExpectedResponse;

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, 'alice_doc_1');

      await supertest
        .post(`/api/saved_objects/_export`)
        .auth(username, password)
        .send({
          objects: [
            {
              type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
              id: 'alice_doc_1',
            },
          ],
        })
        .expect(httpCode)
        .then(
          expectResponse({
            expectedResults: [
              {
                type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
                id: 'alice_doc_1',
                attributes: {},
                references: [],
              },
            ],
          })
        );
    });
  });
}
