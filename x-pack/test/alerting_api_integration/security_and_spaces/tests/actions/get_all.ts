/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../scenarios';
import { getUrlPrefix, getTestAlertData, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function getAllActionTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('getAll', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle get all action request appropriately', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/action`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My action',
              actionTypeId: 'test.index-record',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            })
            .expect(200);
          objectRemover.add(space.id, createdAction.id, 'action', 'actions');

          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/api/actions`)
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Not Found',
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql([
                {
                  id: createdAction.id,
                  isPreconfigured: false,
                  name: 'My action',
                  actionTypeId: 'test.index-record',
                  config: {
                    unencrypted: `This value shouldn't get encrypted`,
                  },
                  referencedByCount: 0,
                },
                {
                  id: 'preconfigured-es-index-action',
                  isPreconfigured: true,
                  actionTypeId: '.index',
                  name: 'preconfigured_es_index_action',
                  referencedByCount: 0,
                },
                {
                  id: 'my-slack1',
                  isPreconfigured: true,
                  actionTypeId: '.slack',
                  name: 'Slack#xyz',
                  referencedByCount: 0,
                },
                {
                  id: 'custom-system-abc-connector',
                  isPreconfigured: true,
                  actionTypeId: 'system-abc-action-type',
                  name: 'SystemABC',
                  referencedByCount: 0,
                },
                {
                  id: 'preconfigured.test.index-record',
                  isPreconfigured: true,
                  actionTypeId: 'test.index-record',
                  name: 'Test:_Preconfigured_Index_Record',
                  referencedByCount: 0,
                },
              ]);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle get all request appropriately with proper referencedByCount', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/action`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My action',
              actionTypeId: 'test.index-record',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            })
            .expect(200);
          objectRemover.add(space.id, createdAction.id, 'action', 'actions');

          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerts/alert`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestAlertData({
                actions: [
                  {
                    group: 'default',
                    id: createdAction.id,
                    params: {},
                  },
                  {
                    group: 'default',
                    id: 'my-slack1',
                    params: {
                      message: 'test',
                    },
                  },
                ],
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'alert', 'alerts');

          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/api/actions`)
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Not Found',
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql([
                {
                  id: createdAction.id,
                  isPreconfigured: false,
                  name: 'My action',
                  actionTypeId: 'test.index-record',
                  config: {
                    unencrypted: `This value shouldn't get encrypted`,
                  },
                  referencedByCount: 1,
                },
                {
                  id: 'preconfigured-es-index-action',
                  isPreconfigured: true,
                  actionTypeId: '.index',
                  name: 'preconfigured_es_index_action',
                  referencedByCount: 0,
                },
                {
                  id: 'my-slack1',
                  isPreconfigured: true,
                  actionTypeId: '.slack',
                  name: 'Slack#xyz',
                  referencedByCount: 1,
                },
                {
                  id: 'custom-system-abc-connector',
                  isPreconfigured: true,
                  actionTypeId: 'system-abc-action-type',
                  name: 'SystemABC',
                  referencedByCount: 0,
                },
                {
                  id: 'preconfigured.test.index-record',
                  isPreconfigured: true,
                  actionTypeId: 'test.index-record',
                  name: 'Test:_Preconfigured_Index_Record',
                  referencedByCount: 0,
                },
              ]);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`shouldn't get actions from another space`, async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/action`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'My action',
              actionTypeId: 'test.index-record',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            })
            .expect(200);
          objectRemover.add(space.id, createdAction.id, 'action', 'actions');

          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix('other')}/api/actions`)
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Not Found',
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.eql([
                {
                  id: 'preconfigured-es-index-action',
                  isPreconfigured: true,
                  actionTypeId: '.index',
                  name: 'preconfigured_es_index_action',
                  referencedByCount: 0,
                },
                {
                  id: 'my-slack1',
                  isPreconfigured: true,
                  actionTypeId: '.slack',
                  name: 'Slack#xyz',
                  referencedByCount: 0,
                },
                {
                  id: 'custom-system-abc-connector',
                  isPreconfigured: true,
                  actionTypeId: 'system-abc-action-type',
                  name: 'SystemABC',
                  referencedByCount: 0,
                },
                {
                  id: 'preconfigured.test.index-record',
                  isPreconfigured: true,
                  actionTypeId: 'test.index-record',
                  name: 'Test:_Preconfigured_Index_Record',
                  referencedByCount: 0,
                },
              ]);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
