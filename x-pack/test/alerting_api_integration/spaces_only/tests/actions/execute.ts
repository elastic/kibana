/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SpaceScenarios } from '../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  const esTestIndexName = '.kibaka-alerting-test-data';
  const authorizationIndex = '.kibana-test-authorization';

  describe('execute', () => {
    const objectRemover = new ObjectRemover(supertest);

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
      await es.indices.create({ index: authorizationIndex });
    });
    after(async () => {
      await es.indices.delete({ index: esTestIndexName });
      await es.indices.delete({ index: authorizationIndex });
      await objectRemover.removeAll();
    });

    async function getTestIndexDoc(source: string, reference: string) {
      const searchResult = await es.search({
        index: esTestIndexName,
        body: {
          query: {
            bool: {
              must: [
                {
                  term: {
                    source,
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
    }

    for (const scenario of SpaceScenarios) {
      describe(scenario.id, () => {
        it('should handle execute request appropriately', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/action`)
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
          objectRemover.add(scenario.id, createdAction.id, 'action');

          const reference = `actions-execute-1:${scenario.id}`;
          const response = await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/action/${createdAction.id}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                reference,
                index: esTestIndexName,
                message: 'Testing 123',
              },
            });

          expect(response.statusCode).to.eql(200);
          expect(response.body).to.be.an('object');
          const indexedRecord = await getTestIndexDoc('action:test.index-record', reference);
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
        });

        it('should handle execute request appropriately after action is updated', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/action`)
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
          objectRemover.add(scenario.id, createdAction.id, 'action');

          await supertest
            .put(`${getUrlPrefix(scenario.id)}/api/action/${createdAction.id}`)
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

          const reference = `actions-execute-2:${scenario.id}`;
          const response = await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/action/${createdAction.id}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                reference,
                index: esTestIndexName,
                message: 'Testing 123',
              },
            });

          expect(response.statusCode).to.eql(200);
          expect(response.body).to.be.an('object');
          const indexedRecord = await getTestIndexDoc('action:test.index-record', reference);
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
        });

        it(`should handle execute request appropriately when action doesn't exist`, async () => {
          await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/action/1/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { foo: true },
            })
            .expect(404, {
              statusCode: 404,
              error: 'Not Found',
              message: 'Saved object [action/1] not found',
            });
        });

        it('should handle execute request appropriately when payload is empty and invalid', async () => {
          await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/action/1/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({})
            .expect(400, {
              statusCode: 400,
              error: 'Bad Request',
              message: 'child "params" fails because ["params" is required]',
              validation: {
                source: 'payload',
                keys: ['params'],
              },
            });
        });

        it('should handle execute request appropriately after changing config properties', async () => {
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/action`)
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
          objectRemover.add(scenario.id, createdAction.id, 'action');

          await supertest
            .put(`${getUrlPrefix(scenario.id)}/api/action/${createdAction.id}`)
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

          await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/action/${createdAction.id}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                to: ['X'],
                subject: 'email-subject',
                message: 'email-message',
              },
            })
            .expect(200);
        });

        it('should handle execute request appropriately and have proper callCluster and savedObjectsClient authorization', async () => {
          const reference = `actions-execute-3:${scenario.id}`;
          const { body: createdAction } = await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/action`)
            .set('kbn-xsrf', 'foo')
            .send({
              description: 'My action',
              actionTypeId: 'test.authorization',
            })
            .expect(200);
          objectRemover.add(scenario.id, createdAction.id, 'action');

          const response = await supertest
            .post(`${getUrlPrefix(scenario.id)}/api/action/${createdAction.id}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                callClusterAuthorizationIndex: authorizationIndex,
                savedObjectsClientType: 'dashboard',
                savedObjectsClientId: '1',
                index: esTestIndexName,
                reference,
              },
            });

          expect(response.statusCode).to.eql(200);
          const indexedRecord = await getTestIndexDoc('action:test.authorization', reference);
          expect(indexedRecord._source.state).to.eql({
            callClusterSuccess: true,
            savedObjectsClientSuccess: false,
            savedObjectsClientError: {
              ...indexedRecord._source.state.savedObjectsClientError,
              output: {
                ...indexedRecord._source.state.savedObjectsClientError.output,
                statusCode: 404,
              },
            },
          });
        });
      });
    }
  });
}
