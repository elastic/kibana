/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CONFIDENTIAL_SAVED_OBJECT_TYPE } from '../../fixtures/confidential_plugin/server';
import { USERS, ExpectedResponse, assertSavedObjectExists } from '../../common/lib';
import { FtrProviderContext } from '../../services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');

  describe('PUT /api/saved_objects/{type}/{id}', () => {
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
      [{ owner?: string; attributes?: Record<string, any>; type: string }]
    > = {
      httpCode: 200,
      expectResponse: ({ owner, type: expectedType, attributes: expectedAttributes }) => ({
        body,
      }) => {
        const { accessControl, type, attributes, error } = body;
        const requiresAccessControl = expectedType === CONFIDENTIAL_SAVED_OBJECT_TYPE;

        const expectedAccessControl = requiresAccessControl ? { owner } : undefined;

        expect(error).to.eql(undefined);

        expect({ accessControl, type, attributes }).to.eql({
          accessControl: expectedAccessControl,
          type: expectedType,
          attributes: expectedAttributes,
        });
      },
    };

    const unauthorizedExpectedResponse: ExpectedResponse<[{ type: string; id?: string }]> = {
      httpCode: 403,
      expectResponse: ({ type, id }) => ({ body }) => {
        expect(body).to.eql({
          statusCode: 403,
          error: 'Forbidden',
          message: `Unable to update ${type}${id ? ':' + id : ''}`,
        });
      },
    };

    it('returns 403 for users who cannot update confidential objects of this type', async () => {
      const { username, password } = USERS.CHARLIE;
      const { httpCode, expectResponse } = unauthorizedExpectedResponse;

      await supertest
        .put(`/api/saved_objects/${CONFIDENTIAL_SAVED_OBJECT_TYPE}/charlie_doc_1`)
        .auth(username, password)
        .send({
          attributes: { name: 'updated' },
        })
        .expect(httpCode)
        .then(expectResponse({ type: CONFIDENTIAL_SAVED_OBJECT_TYPE }));
    });

    it('allows confidential objects to be updated by their owner, and maintains an appropriate accessControl', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = authorizedExpectedResponse;

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, 'alice_doc_1');

      const name = 'updated test';

      await supertest
        .put(`/api/saved_objects/${CONFIDENTIAL_SAVED_OBJECT_TYPE}/alice_doc_1`)
        .auth(username, password)
        .send({
          attributes: { name },
        })
        .expect(httpCode)
        .then(
          expectResponse({
            attributes: { name },
            type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
            owner: username,
          })
        );
    });

    it('does not attach an accessControl for public objects', async () => {
      const { username, password } = USERS.SUPERUSER;
      const { httpCode, expectResponse } = authorizedExpectedResponse;

      await supertest
        .put(`/api/saved_objects/index-pattern/index_pattern_1`)
        .auth(username, password)
        .send({
          attributes: { title: 'some index pattern' },
        })
        .expect(httpCode)
        .then(
          expectResponse({
            type: 'index-pattern',
            attributes: { title: 'some index pattern' },
          })
        );
    });

    it('does not allow updating an object that does not belong to the current user', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = unauthorizedExpectedResponse;

      const savedObjectId = 'bob_doc_1';

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);

      await supertest
        .put(`/api/saved_objects/${CONFIDENTIAL_SAVED_OBJECT_TYPE}/${savedObjectId}`)
        .auth(username, password)
        .send({
          attributes: { name: 'hack attempt' },
        })
        .expect(httpCode)
        .then(expectResponse({ type: CONFIDENTIAL_SAVED_OBJECT_TYPE, id: savedObjectId }));
    });

    [USERS.KIBANA_ADMIN, USERS.SUPERUSER].forEach((user) => {
      it(`allows ${user.description} to update objects that belong to other users, while maintaining the original access control`, async () => {
        const { username, password } = user;
        const { httpCode, expectResponse } = authorizedExpectedResponse;

        const savedObjectId = 'bob_doc_1';

        await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);

        await supertest
          .put(`/api/saved_objects/${CONFIDENTIAL_SAVED_OBJECT_TYPE}/${savedObjectId}`)
          .auth(username, password)
          .send({
            attributes: { name: 'update' },
          })
          .expect(httpCode)
          .then(
            expectResponse({
              attributes: { name: 'update' },
              type: CONFIDENTIAL_SAVED_OBJECT_TYPE,
              owner: USERS.BOB.username,
            })
          );
      });
    });
  });
}
