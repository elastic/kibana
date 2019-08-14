/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../scenarios';
import { getUrlPrefix } from '../../../common/lib/space_test_utils';
import { getTestAlertData, setupEsTestIndex, destroyEsTestIndex } from './utils';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function alertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('alerts', () => {
    let esTestIndexName: string;
    let createdObjects: Array<{ spaceId: string; id: string; type: string }> = [];

    before(async () => {
      await destroyEsTestIndex(es);
      ({ name: esTestIndexName } = await setupEsTestIndex(es));
    });
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
    after(async () => destroyEsTestIndex(es));

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('schedule task, run alert and fire actions', async () => {
          const reference = `'create-test-1':${user.username}`;
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/action`)
            .set('kbn-xsrf', 'foo')
            .send({
              description: 'My action',
              actionTypeId: 'test.index-record',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            })
            .expect(200);
          createdObjects.push({ spaceId: space.id, id: createdAction.id, type: 'action' });

          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(
              getTestAlertData({
                interval: '1m',
                alertTypeId: 'test.always-firing',
                alertTypeParams: {
                  index: esTestIndexName,
                  reference,
                },
                actions: [
                  {
                    group: 'default',
                    id: createdAction.id,
                    params: {
                      index: esTestIndexName,
                      reference,
                      message:
                        'instanceContextValue: {{context.instanceContextValue}}, instanceStateValue: {{state.instanceStateValue}}',
                    },
                  },
                ],
              })
            );

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unable to create alert',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              createdObjects.push({ spaceId: space.id, id: response.body.id, type: 'alert' });
              const alertTestRecord = await retry.try(async () => {
                const searchResult = await es.search({
                  index: esTestIndexName,
                  body: {
                    query: {
                      bool: {
                        must: [
                          {
                            term: {
                              source: 'alert:test.always-firing',
                            },
                          },
                          {
                            term: {
                              reference,
                            },
                          },
                        ],
                      },
                    },
                  },
                });
                expect(searchResult.hits.total.value).to.eql(1);
                return searchResult.hits.hits[0];
              });
              expect(alertTestRecord._source).to.eql({
                source: 'alert:test.always-firing',
                reference,
                state: {},
                params: {
                  index: esTestIndexName,
                  reference,
                },
              });
              const actionTestRecord = await retry.try(async () => {
                const searchResult = await es.search({
                  index: esTestIndexName,
                  body: {
                    query: {
                      bool: {
                        must: [
                          {
                            term: {
                              source: 'action:test.index-record',
                            },
                          },
                          {
                            term: {
                              reference,
                            },
                          },
                        ],
                      },
                    },
                  },
                });
                expect(searchResult.hits.total.value).to.eql(1);
                return searchResult.hits.hits[0];
              });
              expect(actionTestRecord._source).to.eql({
                config: {
                  unencrypted: `This value shouldn't get encrypted`,
                },
                secrets: {
                  encrypted: 'This value should be encrypted',
                },
                params: {
                  index: esTestIndexName,
                  reference,
                  message: 'instanceContextValue: true, instanceStateValue: true',
                },
                reference,
                source: 'action:test.index-record',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('custom retry logic', async () => {
          // We'll use this start time to query tasks created after this point
          const testStart = new Date();
          // We have to provide the test.rate-limit the next runAt, for testing purposes
          const retryDate = new Date(Date.now() + 60000);

          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/action`)
            .set('kbn-xsrf', 'foo')
            .send({
              description: 'Test rate limit',
              actionTypeId: 'test.rate-limit',
              config: {},
            })
            .expect(200);
          createdObjects.push({ spaceId: space.id, id: createdAction.id, type: 'action' });

          const reference = `create-test-1:${user.username}`;
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/alert`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(
              getTestAlertData({
                interval: '1m',
                alertTypeId: 'test.always-firing',
                alertTypeParams: {
                  index: esTestIndexName,
                  reference: 'create-test-2',
                },
                actions: [
                  {
                    group: 'default',
                    id: createdAction.id,
                    params: {
                      reference,
                      index: esTestIndexName,
                      retryAt: retryDate.getTime(),
                    },
                  },
                ],
              })
            );

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unable to create alert',
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              createdObjects.push({ spaceId: space.id, id: response.body.id, type: 'alert' });
              const scheduledActionTask = await retry.try(async () => {
                const searchResult = await es.search({
                  index: '.kibana_task_manager',
                  body: {
                    query: {
                      bool: {
                        must: [
                          {
                            term: {
                              'task.status': 'idle',
                            },
                          },
                          {
                            term: {
                              'task.attempts': 1,
                            },
                          },
                          {
                            term: {
                              'task.taskType': 'actions:test.rate-limit',
                            },
                          },
                          {
                            range: {
                              'task.scheduledAt': {
                                gte: testStart,
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                });
                expect(searchResult.hits.total.value).to.eql(1);
                return searchResult.hits.hits[0];
              });
              expect(scheduledActionTask._source.task.runAt).to.eql(retryDate.toISOString());
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
