/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../scenarios';
import { getUrlPrefix } from '../../../common/lib/space_test_utils';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const retry = getService('retry');

  const esTestIndexName = '.kibaka-alerting-test-data';

  describe('execute', () => {
    const actionsToDelete: Array<{ spaceId: string; id: string }> = [];

    before(async () => {
      await es.indices.delete({ index: esTestIndexName, ignore: [404] });
      await es.indices.create({
        index: esTestIndexName,
        body: {
          mappings: {
            properties: {
              source: {
                type: 'keyword',
              },
              reference: {
                type: 'keyword',
              },
              params: {
                enabled: false,
                type: 'object',
              },
              config: {
                enabled: false,
                type: 'object',
              },
              state: {
                enabled: false,
                type: 'object',
              },
            },
          },
        },
      });
    });
    after(async () => {
      await es.indices.delete({ index: esTestIndexName });
      const promises = actionsToDelete.map(({ spaceId, id }) => {
        return supertest
          .delete(`${getUrlPrefix(spaceId)}/api/action/${id}`)
          .set('kbn-xsrf', 'foo')
          .expect(204);
      });
      await Promise.all(promises);
    });

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('calls the execute API', async () => {
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
          actionsToDelete.push({ spaceId: space.id, id: createdAction.id });

          const reference = `actions-execute-1:${user.username}`;
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/action/${createdAction.id}/_execute`)
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                reference,
                index: esTestIndexName,
                message: 'Testing 123',
              },
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unable to get action',
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.be.an('object');
              const indexedRecord = await retry.tryForTime(15000, async () => {
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
              expect(indexedRecord._source).to.eql({
                params: {
                  reference,
                  index: esTestIndexName,
                  message: 'Testing 123',
                },
                config: {
                  unencrypted: `This value shouldn't get encrypted`,
                },
                secrets: {
                  encrypted: 'This value should be encrypted',
                },
                reference,
                source: 'action:test.index-record',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('calls the execute API after action is updated', async () => {
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
          actionsToDelete.push({ spaceId: space.id, id: createdAction.id });

          await supertest
            .put(`${getUrlPrefix(space.id)}/api/action/${createdAction.id}`)
            .set('kbn-xsrf', 'foo')
            .send({
              description: 'My action updated',
              config: {
                unencrypted: `This value shouldn't get encrypted`,
              },
              secrets: {
                encrypted: 'This value should be encrypted',
              },
            })
            .expect(200);

          const reference = `actions-execute-2:${user.username}`;
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/action/${createdAction.id}/_execute`)
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                reference,
                index: esTestIndexName,
                message: 'Testing 123',
              },
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unable to get action',
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body).to.be.an('object');
              const indexedRecord = await retry.tryForTime(15000, async () => {
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
              expect(indexedRecord._source).to.eql({
                params: {
                  reference,
                  index: esTestIndexName,
                  message: 'Testing 123',
                },
                config: {
                  unencrypted: `This value shouldn't get encrypted`,
                },
                secrets: {
                  encrypted: 'This value should be encrypted',
                },
                reference,
                source: 'action:test.index-record',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it(`action doesn't exist`, async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/action/1/_execute`)
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { foo: true },
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unable to get action',
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: 'Saved object [action/1] not found',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should return 400 when payload is empty and invalid', async () => {
          const { body: error } = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/action/1/_execute`)
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'foo')
            .send({})
            .expect(400);
          expect(error).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message: 'child "params" fails because ["params" is required]',
            validation: {
              source: 'payload',
              keys: ['params'],
            },
          });
        });

        it('changing config properties', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/action`)
            .set('kbn-xsrf', 'foo')
            .send({
              description: 'test email action',
              actionTypeId: '.email',
              config: {
                from: 'email-from@example.com',
                host: 'host-is-ignored-here.example.com',
                port: 666,
              },
              secrets: {
                user: 'email-user',
                password: 'email-password',
              },
            })
            .expect(200);
          actionsToDelete.push({ spaceId: space.id, id: createdAction.id });

          await supertest
            .put(`${getUrlPrefix(space.id)}/api/action/${createdAction.id}`)
            .set('kbn-xsrf', 'foo')
            .send({
              description: 'a test email action 2',
              config: {
                from: 'email-from@example.com',
                service: '__json',
              },
              secrets: {
                user: 'email-user',
                password: 'email-password',
              },
            })
            .expect(200);

          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/api/action/${createdAction.id}/_execute`)
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                to: ['X'],
                subject: 'email-subject',
                message: 'email-message',
              },
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Unable to get action',
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
