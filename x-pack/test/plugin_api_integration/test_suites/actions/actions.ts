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

  const esTestIndexName = '.kibaka-index-action-data';

  describe('encrypted attributes', () => {
    before(async () => {
      await es.indices.create({
        index: esTestIndexName,
        body: {
          mappings: {
            properties: {
              reference: {
                type: 'keyword',
              },
              message: {
                type: 'text',
              },
              actionTypeConfig: {
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
            body: {
              reference: 'actions-fire-1',
              message: 'Testing 123',
            },
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
        reference: 'actions-fire-1',
        message: 'Testing 123',
        actionTypeConfig: {
          unencrypted: 'unencrypted text',
          encrypted: 'something encrypted',
        },
      });
    });
  });
}
