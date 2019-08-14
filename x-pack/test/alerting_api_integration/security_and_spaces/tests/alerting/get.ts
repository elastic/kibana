/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getTestAlertData } from './utils';
import { UserAtSpaceScenarios } from '../../scenarios';
import { getUrlPrefix } from '../../../common/lib/space_test_utils';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('get', () => {
    let createdObjects: Array<{ spaceId: string; id: string; type: string }> = [];

    afterEach(async () => {
      await Promise.all(
        createdObjects.map(({ spaceId, id, type }) => {
          return supertest
            .delete(`${getUrlPrefix(spaceId)}/api/${type}/${id}`)
            .set('kbn-xsrf', 'foo')
            .expect(204);
        })
      );
      createdObjects = [];
    });

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('get as user', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .send(getTestAlertData())
            .expect(200);
          createdObjects.push({ spaceId: space.id, id: createdAlert.id, type: 'alert' });

          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/api/alert/${createdAlert.id}`)
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unable to get alert',
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql({
                id: createdAlert.id,
                alertTypeId: 'test.noop',
                interval: '10s',
                enabled: true,
                actions: [],
                alertTypeParams: {},
                createdBy: 'elastic',
                scheduledTaskId: response.body.scheduledTaskId,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('get non existing alert', async () => {
          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/api/alert/1`)
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unable to get alert',
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Saved object [alert/1] not found',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
