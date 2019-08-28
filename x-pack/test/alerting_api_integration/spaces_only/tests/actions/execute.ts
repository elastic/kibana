/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
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

    it('should handle execute request appropriately', async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/action`)
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
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action');

      const reference = `actions-execute-1:${Spaces.space1.id}`;
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/action/${createdAction.id}/_execute`)
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

    it('should handle execute request appropriately and have proper callCluster and savedObjectsClient authorization', async () => {
      const reference = `actions-execute-3:${Spaces.space1.id}`;
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/action`)
        .set('kbn-xsrf', 'foo')
        .send({
          description: 'My action',
          actionTypeId: 'test.authorization',
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdAction.id, 'action');

      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/action/${createdAction.id}/_execute`)
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
