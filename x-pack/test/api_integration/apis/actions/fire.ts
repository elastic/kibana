/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { ES_ARCHIVER_ACTION_ID, SPACE_1_ES_ARCHIVER_ACTION_ID } from './constants';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const retry = getService('retry');

  const esTestIndexName = '.kibaka-alerting-test-data';

  describe('fire', () => {
    beforeEach(() => esArchiver.load('actions/basic'));
    afterEach(() => esArchiver.unload('actions/basic'));

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
    after(() => es.indices.delete({ index: esTestIndexName }));

    it('decrypts attributes when calling fire API', async () => {
      await supertest
        .post(`/api/action/${ES_ARCHIVER_ACTION_ID}/_fire`)
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
          expect(resp.body).to.be.an('object');
        });
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
        },
        secrets: {
          encrypted: 'This value should be encrypted',
        },
        reference: 'actions-fire-1',
        source: 'action:test.index-record',
      });
    });

    it(`can't fire from another space`, async () => {
      await supertest
        .post(`/api/action/${SPACE_1_ES_ARCHIVER_ACTION_ID}/_fire`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            index: esTestIndexName,
            reference: 'actions-fire-2',
            message: 'Testing 123',
          },
        })
        .expect(404);
    });

    it('fire works in a space', async () => {
      await supertest
        .post(`/s/space_1/api/action/${SPACE_1_ES_ARCHIVER_ACTION_ID}/_fire`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            index: esTestIndexName,
            reference: 'actions-fire-3',
            message: 'Testing 123',
          },
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.be.an('object');
        });
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
                      reference: 'actions-fire-3',
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
          reference: 'actions-fire-3',
          message: 'Testing 123',
        },
        config: {
          unencrypted: `This value shouldn't get encrypted`,
        },
        secrets: {
          encrypted: 'This value should be encrypted',
        },
        reference: 'actions-fire-3',
        source: 'action:test.index-record',
      });
    });

    it('fire still works with encrypted attributes after updating an action', async () => {
      const { body: updatedAction } = await supertest
        .put(`/api/action/${ES_ARCHIVER_ACTION_ID}`)
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
      expect(updatedAction).to.eql({
        id: ES_ARCHIVER_ACTION_ID,
        actionTypeId: 'test.index-record',
        description: 'My action updated',
        config: {
          unencrypted: `This value shouldn't get encrypted`,
        },
      });
      await supertest
        .post(`/api/action/${ES_ARCHIVER_ACTION_ID}/_fire`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            index: esTestIndexName,
            reference: 'actions-fire-4',
            message: 'Testing 123',
          },
        })
        .expect(200)
        .then((resp: any) => {
          expect(resp.body).to.be.an('object');
        });
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
                      reference: 'actions-fire-4',
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
          reference: 'actions-fire-4',
          message: 'Testing 123',
        },
        config: {
          unencrypted: `This value shouldn't get encrypted`,
        },
        secrets: {
          encrypted: 'This value should be encrypted',
        },
        reference: 'actions-fire-4',
        source: 'action:test.index-record',
      });
    });

    it(`should return 404 when action doesn't exist`, async () => {
      const { body: response } = await supertest
        .post('/api/action/1/_fire')
        .set('kbn-xsrf', 'foo')
        .send({
          params: { foo: true },
        })
        .expect(404);
      expect(response).to.eql({
        statusCode: 404,
        error: 'Not Found',
        message: 'Saved object [action/1] not found',
      });
    });

    it('should return 400 when payload is empty and invalid', async () => {
      const { body: response } = await supertest
        .post(`/api/action/${ES_ARCHIVER_ACTION_ID}/_fire`)
        .set('kbn-xsrf', 'foo')
        .send({})
        .expect(400);
      expect(response).to.eql({
        statusCode: 400,
        error: 'Bad Request',
        message: 'child "params" fails because ["params" is required]',
        validation: {
          source: 'payload',
          keys: ['params'],
        },
      });
    });
  });
}
