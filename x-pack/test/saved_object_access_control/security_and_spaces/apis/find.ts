/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SavedObjectsFindResponse } from 'src/core/server';
import { CONFIDENTIAL_SAVED_OBJECT_TYPE } from '../../fixtures/confidential_plugin/server';
import { USERS, ExpectedResponse, assertSavedObjectExists } from '../../common/lib';
import { FtrProviderContext } from '../../services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');

  type FindResponseOpts = Array<{ type: string; id: string; namespaces?: string[] }>;

  const authorizedExpectedResponse: ExpectedResponse<[FindResponseOpts]> = {
    httpCode: 200,
    expectResponse: (opts: FindResponseOpts) => ({ body }) => {
      const expectedPayload = opts.map(({ type, id, namespaces }) => {
        return {
          id,
          type,
          namespaces,
        };
      });

      const { saved_objects: savedObjects } = body as SavedObjectsFindResponse;
      expect(savedObjects.length).to.eql(expectedPayload.length);
      savedObjects.forEach((object, index) => {
        const { id, type, namespaces } = expectedPayload[index];
        expect(object.id).to.eql(id, JSON.stringify({ index, object }));
        expect(object.type).to.eql(type, JSON.stringify({ index, object }));
        expect(object.namespaces).to.eql(namespaces, JSON.stringify({ index, object }));
        expect(object.attributes).to.be.an(Object);
      });
    },
  };

  describe('GET /api/saved_objects/_find', () => {
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

    it(`returns no objects when searching for unauthorized types`, async () => {
      const { username, password } = USERS.CHARLIE;
      const { httpCode, expectResponse } = authorizedExpectedResponse;
      const savedObjectId = 'charlie_doc_1';

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);

      await supertest
        .get(`/api/saved_objects/_find?type=${CONFIDENTIAL_SAVED_OBJECT_TYPE}`)
        .auth(username, password)
        .expect(httpCode)
        .then(expectResponse([]));
    });

    it(`returns the owners confidential objects`, async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = authorizedExpectedResponse;
      const savedObjectId = 'alice_doc_1';

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);

      await supertest
        .get(`/api/saved_objects/_find?type=${CONFIDENTIAL_SAVED_OBJECT_TYPE}`)
        .auth(username, password)
        .expect(httpCode)
        .then(
          expectResponse([
            {
              type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
              id: savedObjectId,
              namespaces: ['default'],
            },
          ])
        );
    });

    it(`returns the owners confidential objects when searching across spaces, omitting spaces the user isn't authorized for`, async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = authorizedExpectedResponse;
      const savedObjectId = 'alice_doc_1';

      // User is not authorized for this object. Ensure it exists so we can verify it's not returned for the right reason.
      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, 'charlie_doc_1');

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);
      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId, 'space_1');
      await assertSavedObjectExists(
        es,
        CONFIDENTIAL_SAVED_OBJECT_TYPE,
        'alice_space_1_doc',
        'space_1'
      );

      // this document exists, but Alice is not authorized to query within the `space_2` space
      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId, 'space_2');

      await supertest
        .get(`/api/saved_objects/_find?type=${CONFIDENTIAL_SAVED_OBJECT_TYPE}&namespaces=*`)
        .auth(username, password)
        .expect(httpCode)
        .then(
          expectResponse([
            {
              type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
              id: savedObjectId,
              namespaces: ['default'],
            },
            {
              type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
              id: savedObjectId,
              namespaces: ['space_1'],
            },
            {
              type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
              id: 'alice_space_1_doc',
              namespaces: ['space_1'],
            },
          ])
        );
    });

    [USERS.KIBANA_ADMIN, USERS.SUPERUSER].forEach((user) => {
      it(`allows ${user.description} to find confidential objects that belong to other users`, async () => {
        const { username, password } = user;
        const { httpCode, expectResponse } = authorizedExpectedResponse;
        const savedObjectId = 'charlie_doc_1';

        await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);

        await supertest
          .get(`/api/saved_objects/_find?type=${CONFIDENTIAL_SAVED_OBJECT_TYPE}&namespaces=*`)
          .auth(username, password)
          .expect(httpCode)
          .then(
            expectResponse([
              {
                type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
                id: 'alice_doc_1',
                namespaces: ['default'],
              },
              {
                type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
                id: 'alice_doc_1',
                namespaces: ['space_1'],
              },
              {
                type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
                id: 'alice_doc_1',
                namespaces: ['space_2'],
              },

              {
                type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
                id: 'alice_space_1_doc',
                namespaces: ['space_1'],
              },
              {
                type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
                id: 'bob_doc_1',
                namespaces: ['default'],
              },
              {
                type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
                id: 'bob_doc_1',
                namespaces: ['space_1'],
              },
              {
                type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
                id: 'charlie_doc_1',
                namespaces: ['default'],
              },
            ])
          );
      });
    });
  });
}
