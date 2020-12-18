/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  SavedObject,
  SavedObjectsImportFailure,
  SavedObjectsImportResponse,
  SavedObjectsImportSuccess,
} from 'src/core/server';
import { CONFIDENTIAL_SAVED_OBJECT_TYPE } from '../../fixtures/confidential_plugin/server';
import {
  USERS,
  ExpectedResponse,
  assertSavedObjectExists,
  assertSavedObjectAccessControl,
  assertSavedObjectMissing,
} from '../../common/lib';
import { FtrProviderContext } from '../../services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');

  describe('POST /api/saved_objects/_resolve_import_errors', () => {
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
          success: boolean;
          successCount: number;
          errors?: SavedObjectsImportFailure[];
          successResults?: Array<
            Omit<SavedObjectsImportSuccess, 'destinationId'> & { expectDestinationId?: boolean }
          >;
        }
      ]
    > = {
      httpCode: 200,
      expectResponse: ({ success, successCount, errors, successResults }) => ({ body }) => {
        expect(body.success).to.eql(success);
        expect(body.successCount).to.eql(successCount);
        if (errors) {
          expect(body.errors).to.eql(errors);
        }
        if (successResults) {
          expect(body.successResults.length).to.eql(successResults.length);
          (body as SavedObjectsImportResponse).successResults!.forEach((result, index) => {
            const expected = successResults[index];
            expect(result.id).to.eql(expected.id);
            expect(result.type).to.eql(expected.type);
            expect(result.overwrite).to.eql(expected.overwrite);
            if (expected.expectDestinationId) {
              expect(typeof result.destinationId).to.eql('string');
            } else {
              expect(result.destinationId).to.eql(undefined);
            }
          });
        }
      },
    };

    const unauthorizedExpectedResponse: ExpectedResponse<[{ type: string; id?: string }]> = {
      httpCode: 403,
      expectResponse: ({ type, id }) => ({ body }) => {
        expect(body).to.eql({
          statusCode: 403,
          error: 'Forbidden',
          message: `Unable to bulk_create ${type}${id ? ':' + id : ''}`,
        });
      },
    };

    const createPayload = (objectsToImport: Array<SavedObject<unknown>>) => {
      return Buffer.from(objectsToImport.map((obj) => JSON.stringify(obj)).join('\n'), 'utf8');
    };

    it('returns 403 for users who cannot import confidential objects of this type', async () => {
      const { username, password } = USERS.CHARLIE;
      const { httpCode, expectResponse } = unauthorizedExpectedResponse;

      const savedObjectId = `charlie_doc_1`;

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);

      const objectsToImport = [
        {
          type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
          id: savedObjectId,
          attributes: {
            name: 'my imported object',
          },
          references: [],
        },
      ];

      const retries = [
        {
          type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
          id: savedObjectId,
          overwrite: true,
        },
      ];

      await supertest
        .post(`/api/saved_objects/_resolve_import_errors`)
        .auth(username, password)
        .field('retries', JSON.stringify(retries))
        .attach('file', createPayload(objectsToImport), 'export.ndjson')
        .expect(httpCode)
        .then(
          expectResponse({
            type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
          })
        );
    });

    it(`allows confidential object conflicts to be resolved via overwrite by the conflict's owner`, async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = authorizedExpectedResponse;

      const savedObjectId = 'alice_doc_1';

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);

      const objectsToImport = [
        {
          type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
          id: savedObjectId,
          attributes: {
            name: 'my imported object',
          },
          references: [],
        },
      ];

      const retries = [
        {
          type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
          id: savedObjectId,
          overwrite: true,
        },
      ];

      await supertest
        .post(`/api/saved_objects/_resolve_import_errors`)
        .auth(username, password)
        .field('retries', JSON.stringify(retries))
        .attach('file', createPayload(objectsToImport), 'export.ndjson')
        .expect(httpCode)
        .then(
          expectResponse({
            success: true,
            successCount: 1,
            successResults: [
              {
                type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
                id: savedObjectId,
                overwrite: true,
                meta: {},
              },
            ],
          })
        );

      await assertSavedObjectAccessControl(
        es,
        CONFIDENTIAL_SAVED_OBJECT_TYPE,
        savedObjectId,
        'default',
        {
          owner: username,
        }
      );
    });

    it(`allows confidential object conflicts to be resolved via "new copy" by the conflict's owner`, async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = authorizedExpectedResponse;

      const savedObjectId = 'alice_doc_1';
      const newSavedObjectId = 'new_copy_alice_doc_1';

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);
      await assertSavedObjectMissing(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, newSavedObjectId);

      const objectsToImport = [
        {
          type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
          id: savedObjectId,
          attributes: {
            name: 'my imported object',
          },
          references: [],
        },
      ];

      const retries = [
        {
          type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
          id: savedObjectId,
          overwrite: false,
          destinationId: newSavedObjectId,
        },
      ];

      await supertest
        .post(`/api/saved_objects/_resolve_import_errors?createNewCopies=true`)
        .auth(username, password)
        .field('retries', JSON.stringify(retries))
        .attach('file', createPayload(objectsToImport), 'export.ndjson')
        .expect(httpCode)
        .then(
          expectResponse({
            success: true,
            successCount: 1,
            successResults: [
              {
                type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
                id: savedObjectId,
                expectDestinationId: true,
                meta: {},
              },
            ],
          })
        );

      await assertSavedObjectAccessControl(
        es,
        CONFIDENTIAL_SAVED_OBJECT_TYPE,
        savedObjectId,
        'default',
        {
          owner: username,
        }
      );
      await assertSavedObjectAccessControl(
        es,
        CONFIDENTIAL_SAVED_OBJECT_TYPE,
        newSavedObjectId,
        'default',
        {
          owner: username,
        }
      );
    });

    it(`allows confidential object conflicts to be resolved via "new copy" by other users`, async () => {
      const { username, password } = USERS.SUPERUSER;
      const { httpCode, expectResponse } = authorizedExpectedResponse;

      const savedObjectId = 'alice_doc_1';
      const newSavedObjectId = 'new_copy_superuser_doc_1';

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);
      await assertSavedObjectMissing(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, newSavedObjectId);

      const objectsToImport = [
        {
          type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
          id: savedObjectId,
          attributes: {
            name: 'my imported object',
          },
          references: [],
        },
      ];

      const retries = [
        {
          type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
          id: savedObjectId,
          overwrite: false,
          destinationId: newSavedObjectId,
        },
      ];

      await supertest
        .post(`/api/saved_objects/_resolve_import_errors?createNewCopies=true`)
        .auth(username, password)
        .field('retries', JSON.stringify(retries))
        .attach('file', createPayload(objectsToImport), 'export.ndjson')
        .expect(httpCode)
        .then(
          expectResponse({
            success: true,
            successCount: 1,
            successResults: [
              {
                type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
                id: savedObjectId,
                expectDestinationId: true,
                meta: {},
              },
            ],
          })
        );

      // existing object should have the old ACL
      await assertSavedObjectAccessControl(
        es,
        CONFIDENTIAL_SAVED_OBJECT_TYPE,
        savedObjectId,
        'default',
        {
          owner: USERS.ALICE.username,
        }
      );
      // new object should belong to the importer
      await assertSavedObjectAccessControl(
        es,
        CONFIDENTIAL_SAVED_OBJECT_TYPE,
        newSavedObjectId,
        'default',
        {
          owner: username,
        }
      );
    });

    it(`does not allow the destinationId to overwrite a confidential object that belongs to another user`, async () => {
      const { username, password } = USERS.SUPERUSER;
      const { httpCode, expectResponse } = authorizedExpectedResponse;

      const savedObjectId = 'alice_doc_1';
      const newSavedObjectId = 'charlie_doc_1';

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);
      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, newSavedObjectId);

      const objectsToImport = [
        {
          type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
          id: savedObjectId,
          attributes: {
            name: 'my imported object',
          },
          references: [],
        },
      ];

      const retries = [
        {
          type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
          id: savedObjectId,
          overwrite: false,
          destinationId: newSavedObjectId,
        },
      ];

      await supertest
        .post(`/api/saved_objects/_resolve_import_errors?createNewCopies=true`)
        .auth(username, password)
        .field('retries', JSON.stringify(retries))
        .attach('file', createPayload(objectsToImport), 'export.ndjson')
        .expect(httpCode)
        .then(
          expectResponse({
            success: true,
            successCount: 1,
            successResults: [
              {
                type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
                id: savedObjectId,
                meta: {},
                expectDestinationId: true,
              },
            ],
          })
        );

      // existing object should have the old ACL
      await assertSavedObjectAccessControl(
        es,
        CONFIDENTIAL_SAVED_OBJECT_TYPE,
        savedObjectId,
        'default',
        {
          owner: USERS.ALICE.username,
        }
      );
      // targeted existing object should also have the old ACL
      await assertSavedObjectAccessControl(
        es,
        CONFIDENTIAL_SAVED_OBJECT_TYPE,
        newSavedObjectId,
        'default',
        {
          owner: USERS.CHARLIE.username,
        }
      );
    });
  });
}
