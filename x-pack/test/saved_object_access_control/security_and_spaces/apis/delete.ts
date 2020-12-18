/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CONFIDENTIAL_SAVED_OBJECT_TYPE } from '../../fixtures/confidential_plugin/server';
import {
  USERS,
  ExpectedResponse,
  assertSavedObjectExists,
  assertSavedObjectMissing,
} from '../../common/lib';
import { FtrProviderContext } from '../../services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');

  describe('DELETE /api/saved_objects/{type}/{id}', () => {
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

    const authorizedExpectedResponse: ExpectedResponse<never> = {
      httpCode: 200,
      expectResponse: () => ({ body }) => {
        expect(body).to.eql({});
      },
    };

    const unauthorizedExpectedResponse: ExpectedResponse<[{ type: string; id?: string }]> = {
      httpCode: 403,
      expectResponse: ({ type, id }) => ({ body }) => {
        expect(body).to.eql({
          statusCode: 403,
          error: 'Forbidden',
          message: `Unable to delete ${type}${id ? ':' + id : ''}`,
        });
      },
    };

    it('returns 403 for users who cannot delete confidential objects of this type', async () => {
      const { username, password } = USERS.CHARLIE;
      const { httpCode, expectResponse } = unauthorizedExpectedResponse;

      await supertest
        .delete(`/api/saved_objects/${CONFIDENTIAL_SAVED_OBJECT_TYPE}/charlie_doc_1`)
        .auth(username, password)
        .send({
          attributes: { name: 'updated' },
        })
        .expect(httpCode)
        .then(expectResponse({ type: CONFIDENTIAL_SAVED_OBJECT_TYPE }));
    });

    it('does not allow deleting an object that does not belong to the current user', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = unauthorizedExpectedResponse;

      const savedObjectId = 'bob_doc_1';

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);

      await supertest
        .delete(`/api/saved_objects/${CONFIDENTIAL_SAVED_OBJECT_TYPE}/${savedObjectId}`)
        .auth(username, password)
        .send({
          attributes: { name: 'hack attempt' },
        })
        .expect(httpCode)
        .then(expectResponse({ type: CONFIDENTIAL_SAVED_OBJECT_TYPE, id: savedObjectId }));

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, savedObjectId);
    });

    it('allows confidential objects to be deleted by their owner', async () => {
      const { username, password } = USERS.ALICE;
      const { httpCode, expectResponse } = authorizedExpectedResponse;

      await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, 'alice_doc_1');

      await supertest
        .delete(`/api/saved_objects/${CONFIDENTIAL_SAVED_OBJECT_TYPE}/alice_doc_1`)
        .auth(username, password)
        .expect(httpCode)
        .then(expectResponse());

      await assertSavedObjectMissing(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, 'alice_doc_1');
    });

    [USERS.KIBANA_ADMIN, USERS.SUPERUSER].forEach((user) => {
      it(`allows ${user.description} to delete objects belonging to other users`, async () => {
        await esArchiver.load(
          'x-pack/test/saved_object_access_control/fixtures/es_archiver/confidential_objects'
        );

        const { username, password } = user;
        const { httpCode, expectResponse } = authorizedExpectedResponse;

        await assertSavedObjectExists(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, 'alice_doc_1');

        await supertest
          .delete(`/api/saved_objects/${CONFIDENTIAL_SAVED_OBJECT_TYPE}/alice_doc_1`)
          .auth(username, password)
          .expect(httpCode)
          .then(expectResponse());

        await assertSavedObjectMissing(es, CONFIDENTIAL_SAVED_OBJECT_TYPE, 'alice_doc_1');
      });
    });
  });
}
