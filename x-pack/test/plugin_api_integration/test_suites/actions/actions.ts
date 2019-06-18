/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

export const ES_ARCHIVER_ACTION_ID = '19cfba7c-711a-4170-8590-9a99a281e85c';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const retry = getService('retry');

  const esTestIndexName = '.kibaka-alerting-test-data';

  describe('actions', () => {
    beforeEach(() => esArchiver.load('actions/basic'));
    afterEach(() => esArchiver.unload('actions/basic'));

    before(async () => {
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
    after(() => es.indices.delete({ index: esTestIndexName }));

    it('decrypts attributes and joins on actionTypeConfig when firing', async () => {
      await supertest
        .post(`/api/action/${ES_ARCHIVER_ACTION_ID}/fire`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            index: esTestIndexName,
            reference: 'actions-fire-1',
            message: 'Testing 123',
          },
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            success: true,
          });
        });
      const indexedRecord = await retry.tryForTime(5000, async () => {
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
                      reference: 'actions-fire-1',
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
          index: esTestIndexName,
          reference: 'actions-fire-1',
          message: 'Testing 123',
        },
        config: {
          unencrypted: `This value shouldn't get encrypted`,
          encrypted: 'This value should be encrypted',
        },
        reference: 'actions-fire-1',
        source: 'action:test.index-record',
      });
    });

    it('encrypted attributes still available after update', async () => {
      const { body: updatedAction } = await supertest
        .put(`/api/action/${ES_ARCHIVER_ACTION_ID}`)
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            description: 'My action updated',
            actionTypeConfig: {
              unencrypted: `This value shouldn't get encrypted`,
              encrypted: 'This value should be encrypted',
            },
          },
        })
        .expect(200);
      expect(updatedAction).to.eql({
        id: ES_ARCHIVER_ACTION_ID,
        type: 'action',
        updated_at: updatedAction.updated_at,
        version: updatedAction.version,
        references: [],
        attributes: {
          description: 'My action updated',
          actionTypeId: 'test.index-record',
          actionTypeConfig: {
            unencrypted: `This value shouldn't get encrypted`,
          },
        },
      });
      await supertest
        .post(`/api/action/${ES_ARCHIVER_ACTION_ID}/fire`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            index: esTestIndexName,
            reference: 'actions-fire-2',
            message: 'Testing 123',
          },
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            success: true,
          });
        });
      const indexedRecord = await retry.tryForTime(5000, async () => {
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
                      reference: 'actions-fire-2',
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
          index: esTestIndexName,
          reference: 'actions-fire-2',
          message: 'Testing 123',
        },
        config: {
          unencrypted: `This value shouldn't get encrypted`,
          encrypted: 'This value should be encrypted',
        },
        reference: 'actions-fire-2',
        source: 'action:test.index-record',
      });
    });
  });
}
