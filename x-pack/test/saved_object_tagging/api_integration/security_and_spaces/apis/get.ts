/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { USERS, User, ExpectedResponse } from '../../../common/lib';
import { FtrProviderContext } from '../services';
import { createTestSpaces, deleteTestSpaces, createTags, deleteTags } from './test_utils';

// eslint-disable-next-line import/no-default-export
export default function (ftrContext: FtrProviderContext) {
  const supertest = ftrContext.getService('supertestWithoutAuth');

  describe('GET /api/saved_objects_tagging/tags/{id}', () => {
    before(async () => {
      await createTestSpaces(ftrContext);
    });

    after(async () => {
      await deleteTestSpaces(ftrContext);
    });

    beforeEach(async () => {
      await createTags(ftrContext);
    });

    afterEach(async () => {
      await deleteTags(ftrContext);
    });

    const responses: Record<string, ExpectedResponse> = {
      authorized: {
        httpCode: 200,
        expectResponse: ({ body }) => {
          expect(body).to.eql({
            tag: {
              id: 'default-space-tag-1',
              name: 'tag-1',
              description: 'Tag 1 in default space',
              managed: false,
              color: '#FF00FF',
            },
          });
        },
      },
      unauthorized: {
        httpCode: 403,
        expectResponse: ({ body }) => {
          expect(body).to.eql({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Unable to get tag',
          });
        },
      },
    };

    const expectedResults: Record<string, User[]> = {
      authorized: [
        USERS.SUPERUSER,
        USERS.DEFAULT_SPACE_READ_USER,
        USERS.DEFAULT_SPACE_SO_MANAGEMENT_WRITE_USER,
        USERS.DEFAULT_SPACE_SO_TAGGING_READ_USER,
        USERS.DEFAULT_SPACE_SO_TAGGING_WRITE_USER,
        USERS.DEFAULT_SPACE_DASHBOARD_READ_USER,
        USERS.DEFAULT_SPACE_VISUALIZE_READ_USER,
        USERS.DEFAULT_SPACE_MAPS_READ_USER,
      ],
      unauthorized: [USERS.NOT_A_KIBANA_USER, USERS.DEFAULT_SPACE_ADVANCED_SETTINGS_READ_USER],
    };

    const createUserTest = (
      { username, password, description }: User,
      { httpCode, expectResponse }: ExpectedResponse
    ) => {
      it(`returns expected ${httpCode} response for ${description ?? username}`, async () => {
        await supertest
          .get(`/api/saved_objects_tagging/tags/default-space-tag-1`)
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
