/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { USERS, User, ExpectedResponse } from '../../../common/lib';
import { FtrProviderContext } from '../services';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');

  describe('DELETE /api/saved_objects_tagging/tags/{id}', () => {
    beforeEach(async () => {
      await esArchiver.load('rbac_tags');
    });

    afterEach(async () => {
      await esArchiver.unload('rbac_tags');
    });

    const responses: Record<string, ExpectedResponse> = {
      authorized: {
        httpCode: 200,
        expectResponse: ({ body }) => {
          expect(body).to.eql({});
        },
      },
      unauthorized: {
        httpCode: 403,
        expectResponse: ({ body }) => {
          expect(body).to.eql({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Unable to delete tag',
          });
        },
      },
    };

    const expectedResults: Record<string, User[]> = {
      authorized: [
        USERS.SUPERUSER,
        USERS.DEFAULT_SPACE_SO_MANAGEMENT_WRITE_USER,
        USERS.DEFAULT_SPACE_SO_TAGGING_WRITE_USER,
      ],
      unauthorized: [
        USERS.DEFAULT_SPACE_READ_USER,
        USERS.DEFAULT_SPACE_SO_TAGGING_READ_USER,
        USERS.DEFAULT_SPACE_DASHBOARD_READ_USER,
        USERS.DEFAULT_SPACE_VISUALIZE_READ_USER,
        USERS.DEFAULT_SPACE_ADVANCED_SETTINGS_READ_USER,
        USERS.DEFAULT_SPACE_MAPS_READ_USER,
        USERS.NOT_A_KIBANA_USER,
      ],
    };

    const createUserTest = (
      { username, password, description }: User,
      { httpCode, expectResponse }: ExpectedResponse
    ) => {
      it(`returns expected ${httpCode} response for ${description ?? username}`, async () => {
        await supertest
          .delete(`/api/saved_objects_tagging/tags/default-space-tag-1`)
          .auth(username, password)
          .expect(httpCode)
          .then(expectResponse);
      });
    };

    const createTestSuite = () => {
      Object.entries(expectedResults).forEach(([responseId, users]) => {
        const response: ExpectedResponse = responses[responseId];
        users.forEach((user) => {
          createUserTest(user, response);
        });
      });
    };

    createTestSuite();
  });
}
