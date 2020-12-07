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

  describe('POST /api/saved_objects_tagging/assignments/update_by_tags', () => {
    beforeEach(async () => {
      await esArchiver.load('bulk_assign');
    });

    afterEach(async () => {
      await esArchiver.unload('bulk_assign');
    });

    const authorized: ExpectedResponse = {
      httpCode: 200,
      expectResponse: ({ body }) => {
        expect(body).to.eql({});
      },
    };
    const unauthorized = (...types: string[]): ExpectedResponse => ({
      httpCode: 403,
      expectResponse: ({ body }) => {
        expect(body).to.eql({
          statusCode: 403,
          error: 'Forbidden',
          message: `Forbidden type [${types.join(', ')}]`,
        });
      },
    });

    const scenarioMap = {
      [USERS.SUPERUSER.username]: {
        dashboard: authorized,
        visualization: authorized,
        dash_and_vis: authorized,
      },
      [USERS.DEFAULT_SPACE_SO_MANAGEMENT_WRITE_USER.username]: {
        dashboard: authorized,
        visualization: authorized,
        dash_and_vis: authorized,
      },
      [USERS.DEFAULT_SPACE_SO_TAGGING_READ_USER.username]: {
        dashboard: unauthorized('dashboard'),
        visualization: unauthorized('visualization'),
        dash_and_vis: unauthorized('dashboard', 'visualization'),
      },
      [USERS.DEFAULT_SPACE_READ_USER.username]: {
        dashboard: unauthorized('dashboard'),
        visualization: unauthorized('visualization'),
        dash_and_vis: unauthorized('dashboard', 'visualization'),
      },
      [USERS.DEFAULT_SPACE_ADVANCED_SETTINGS_READ_USER.username]: {
        dashboard: unauthorized('dashboard'),
        visualization: unauthorized('visualization'),
        dash_and_vis: unauthorized('dashboard', 'visualization'),
      },
      [USERS.DEFAULT_SPACE_DASHBOARD_WRITE_USER.username]: {
        dashboard: authorized,
        visualization: unauthorized('visualization'),
        dash_and_vis: unauthorized('visualization'),
      },
      [USERS.DEFAULT_SPACE_VISUALIZE_WRITE_USER.username]: {
        dashboard: unauthorized('dashboard'),
        visualization: authorized,
        dash_and_vis: unauthorized('dashboard'),
      },
    };

    const createUserTest = (
      { username, password, description }: User,
      expected: Record<string, ExpectedResponse>
    ) => {
      describe(`User ${description ?? username}`, () => {
        const { dashboard, visualization, dash_and_vis: both } = expected;
        it(`returns expected ${dashboard.httpCode} response when assigning a dashboard`, async () => {
          await supertest
            .post(`/api/saved_objects_tagging/assignments/update_by_tags`)
            .send({
              tags: ['tag-1', 'tag-2'],
              assign: [{ type: 'dashboard', id: 'ref-to-tag-1-and-tag-3' }],
              unassign: [],
            })
            .auth(username, password)
            .expect(dashboard.httpCode)
            .then(dashboard.expectResponse);
        });
        it(`returns expected ${visualization.httpCode} response when assigning a visualization`, async () => {
          await supertest
            .post(`/api/saved_objects_tagging/assignments/update_by_tags`)
            .send({
              tags: ['tag-1', 'tag-2'],
              assign: [{ type: 'visualization', id: 'ref-to-tag-1' }],
              unassign: [],
            })
            .auth(username, password)
            .expect(visualization.httpCode)
            .then(visualization.expectResponse);
        });
        it(`returns expected ${both.httpCode} response when assigning a dashboard and a visualization`, async () => {
          await supertest
            .post(`/api/saved_objects_tagging/assignments/update_by_tags`)
            .send({
              tags: ['tag-1', 'tag-2'],
              assign: [
                { type: 'dashboard', id: 'ref-to-tag-1-and-tag-3' },
                { type: 'visualization', id: 'ref-to-tag-1' },
              ],
              unassign: [],
            })
            .auth(username, password)
            .expect(both.httpCode)
            .then(both.expectResponse);
        });
      });
    };

    const createTestSuite = () => {
      Object.entries(scenarioMap).forEach(([username, expectedResponse]) => {
        const user = Object.values(USERS).find((usr) => usr.username === username)!;
        createUserTest(user, expectedResponse);
      });
    };

    createTestSuite();
  });
}
