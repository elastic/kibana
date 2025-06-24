/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { USERS, User, ExpectedResponse } from '../../common/lib';
import { FtrProviderContext } from '../services';
import { createTestSpaces, deleteTestSpaces, createData, deleteData } from './test_utils';

// eslint-disable-next-line import/no-default-export
export default function (ftrContext: FtrProviderContext) {
  const supertest = ftrContext.getService('supertestWithoutAuth');

  describe('POST /internal/ftr/kbn_client_so/_bulk_delete', () => {
    before(async () => {
      await createTestSpaces(ftrContext);
    });

    after(async () => {
      await deleteTestSpaces(ftrContext);
    });

    beforeEach(async () => {
      await createData(ftrContext);
    });

    afterEach(async () => {
      await deleteData(ftrContext);
    });

    const responses: Record<string, ExpectedResponse> = {
      authorized: {
        httpCode: 200,
        expectResponse: ({ body }) => {
          expect(body.statuses.length).to.eql(1);
        },
      },
      unauthorized: {
        httpCode: 403,
        expectResponse: ({ body }) => {
          expect(body).to.eql({
            statusCode: 403,
            error: 'Forbidden',
            message:
              'API [POST /internal/ftr/kbn_client_so/_bulk_delete] is unauthorized for user, this action is granted by the Kibana privileges [ftrApis]',
          });
        },
      },
    };

    const expectedResults: Record<string, User[]> = {
      authorized: [USERS.SUPERUSER],
      unauthorized: [
        USERS.DEFAULT_SPACE_SO_MANAGEMENT_WRITE_USER,
        USERS.DEFAULT_SPACE_SO_TAGGING_WRITE_USER,
        USERS.DEFAULT_SPACE_READ_USER,
        USERS.DEFAULT_SPACE_SO_TAGGING_READ_USER,
        USERS.DEFAULT_SPACE_DASHBOARD_READ_USER,
        USERS.DEFAULT_SPACE_VISUALIZE_READ_USER,
        USERS.DEFAULT_SPACE_ADVANCED_SETTINGS_READ_USER,
        USERS.NOT_A_KIBANA_USER,
      ],
    };

    const createUserTest = (
      { username, password, description }: User,
      { httpCode, expectResponse }: ExpectedResponse
    ) => {
      it(`returns expected ${httpCode} response for ${description ?? username}`, async () => {
        await supertest
          .post(`/internal/ftr/kbn_client_so/_bulk_delete`)
          .send([{ type: 'tag', id: 'tag-1' }])
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
