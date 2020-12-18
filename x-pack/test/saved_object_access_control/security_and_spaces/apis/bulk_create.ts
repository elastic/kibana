/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SavedObjectsBulkResponse } from 'src/core/server';
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

  describe('POST /api/saved_objects/_bulk_create', () => {
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
        Array<{
          owner?: string;
          attributes?: Record<string, any>;
          type: string;
          id?: string;
          namespaces?: string[];
        }>
      ]
    > = {
      httpCode: 200,
      expectResponse: (opts) => ({ body }) => {
        const { saved_objects: savedObjects } = body as SavedObjectsBulkResponse;

        expect(opts.length).to.eql(savedObjects.length);
        savedObjects.forEach((object, index) => {
          const expected = opts[index];
          if (expected.id) {
            expect(object.id).to.eql(expected.id);
          }
          expect(object.type).to.eql(expected.type);

          if (expected.owner) {
            expect(object.accessControl).to.eql({
              owner: expected.owner,
            });
          } else {
            expect(object.accessControl).to.eql(undefined);
          }

          expect(object.namespaces).to.eql(expected.namespaces);

          expect(object.error).to.eql(undefined);
        });
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

    it('returns 403 for users who cannot create confidential objects of this type', async () => {
      const { username, password } = USERS.CHARLIE;
      const { httpCode, expectResponse } = unauthorizedExpectedResponse;

      await supertest
        .post(`/api/saved_objects/_bulk_create`)
        .auth(username, password)
        .send([
          {
            type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
            id: 'charlie_doc_1',
            attributes: {
              name: 'new name',
            },
          },
        ])
        .expect(httpCode)
        .then(expectResponse({ type: CONFIDENTIAL_SAVED_OBJECT_TYPE }));
    });

    it('allows confidential objects to be created, and attaches an appropriate accessControl', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = authorizedExpectedResponse;

      const savedObjectId = 'alice_new_doc_1';

      await assertSavedObjectMissing(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);

      const name = 'bulk create test';

      await supertest
        .post(`/api/saved_objects/_bulk_create`)
        .auth(username, password)
        .send([
          {
            type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
            id: savedObjectId,
            attributes: {
              name,
            },
          },
        ])
        .expect(httpCode)
        .then(
          expectResponse([
            {
              attributes: { name },
              type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
              id: savedObjectId,
              namespaces: ['default'],
              owner: username,
            },
          ])
        );
    });

    it('does not attach an accessControl for public objects', async () => {
      const { username, password } = USERS.SUPERUSER;
      const { httpCode, expectResponse } = authorizedExpectedResponse;

      const savedObjectId = 'new_index_pattern';

      await supertest
        .post(`/api/saved_objects/_bulk_create`)
        .auth(username, password)
        .send([
          {
            id: savedObjectId,
            type: 'index-pattern',
            attributes: {
              title: 'title',
            },
          },
        ])
        .expect(httpCode)
        .then(
          expectResponse([
            {
              id: savedObjectId,
              type: 'index-pattern',
              attributes: {
                title: 'title',
              },
              namespaces: ['default'],
            },
          ])
        );

      await assertSavedObjectAccessControl(
        es,
        'index-pattern',
        savedObjectId,
        'default',
        undefined
      );
    });

    it('does not allow creating an object that overwrites an object belonging to another user', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = unauthorizedExpectedResponse;

      const savedObjectId = 'bob_doc_1';

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);

      await supertest
        .post(`/api/saved_objects/_bulk_create`)
        .auth(username, password)
        .send([
          {
            type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
            id: savedObjectId,
            attributes: { name: 'hack attempt' },
          },
        ])
        .expect(httpCode)
        .then(expectResponse({ type: CONFIDENTIAL_SAVED_OBJECT_TYPE, id: savedObjectId }));
    });

    it('does not allow overwriting an object belonging to another user', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = unauthorizedExpectedResponse;

      const savedObjectId = 'bob_doc_1';

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);

      await supertest
        .post(`/api/saved_objects/_bulk_create?overwrite=true`)
        .auth(username, password)
        .send([
          {
            type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
            id: savedObjectId,
            attributes: { name: 'hack attempt' },
          },
        ])
        .expect(httpCode)
        .then(expectResponse({ type: CONFIDENTIAL_SAVED_OBJECT_TYPE, id: savedObjectId }));
    });

    [USERS.KIBANA_ADMIN, USERS.SUPERUSER].forEach((user) => {
      it(`allows ${user.description} to overwrite objects that belong to other users`, async () => {
        const { username, password } = user;
        const { httpCode, expectResponse } = authorizedExpectedResponse;

        const savedObjectId = 'alice_doc_1';

        await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);

        await supertest
          .post(`/api/saved_objects/_bulk_create?overwrite=true`)
          .auth(username, password)
          .send([
            {
              type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
              id: savedObjectId,
              attributes: { name: 'update attempt' },
            },
          ])
          .expect(httpCode)
          .then(
            expectResponse([
              {
                id: savedObjectId,
                type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
                attributes: { name: 'update attempt' },
                owner: username,
                namespaces: ['default'],
              },
            ])
          );
      });
    });
  });
}
