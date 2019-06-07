/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const retry = getService('retry');

  const esTestIndexName = '.kibaka-alerting-test-data';

  describe('actions', () => {
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
      await esArchiver.load('actions/basic');
    });
    after(async () => {
      await esArchiver.unload('actions/basic');
      await es.indices.delete({ index: esTestIndexName });
    });

    it('decrypts attributes and joins on actionTypeConfig when firing', async () => {
      await supertest
        .post(`/api/action/9597aa29-5d74-485b-af1d-4b7fdfd079e4/fire`)
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

    it('should retry failures', async () => {
      await supertest
        .post('/api/action/08cca6da-60ed-49ca-85f6-641240300a3f/fire')
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            index: esTestIndexName,
            reference: 'retry-action-1',
          },
        })
        .expect(200);
      await retry.tryForTime(5000, async () => {
        const searchResult = await es.search({
          index: esTestIndexName,
          body: {
            query: {
              bool: {
                must: [
                  {
                    term: {
                      source: 'action:test.failing',
                    },
                  },
                  {
                    term: {
                      reference: 'retry-action-1',
                    },
                  },
                ],
              },
            },
          },
        });
        expect(searchResult.hits.total.value).to.greaterThan(1);
      });
    });
  });
}
