/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getTestAlertData, setupEsTestIndex, destroyEsTestIndex } from './utils';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { ES_ARCHIVER_ACTION_ID } from './constants';

// eslint-disable-next-line import/no-default-export
export default function alertTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const retry = getService('retry');

  describe('alerts', () => {
    let esTestIndexName: string;
    const createdAlertIds: string[] = [];

    before(async () => {
      await destroyEsTestIndex(es);
      ({ name: esTestIndexName } = await setupEsTestIndex(es));
      await esArchiver.load('actions/basic');
    });
    after(async () => {
      await Promise.all(
        createdAlertIds.map(id => {
          return supertest
            .delete(`/api/alert/${id}`)
            .set('kbn-xsrf', 'foo')
            .expect(200);
        })
      );
      await esArchiver.unload('actions/basic');
      await destroyEsTestIndex(es);
    });

    it('should schedule task, run alert and fire actions', async () => {
      await supertest
        .post('/api/alert')
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            interval: '1s',
            alertTypeId: 'test.always-firing',
            alertTypeParams: {
              index: esTestIndexName,
              reference: 'create-test-1',
            },
            actions: [
              {
                group: 'default',
                id: ES_ARCHIVER_ACTION_ID,
                params: {
                  index: esTestIndexName,
                  reference: 'create-test-1',
                  message:
                    'instanceContextValue: {{context.instanceContextValue}}, instanceStateValue: {{state.instanceStateValue}}',
                },
              },
            ],
          })
        )
        .expect(200)
        .then((resp: any) => {
          createdAlertIds.push(resp.body.id);
        });
      const alertTestRecord = await retry.tryForTime(5000, async () => {
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
                      reference: 'create-test-1',
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
        reference: 'create-test-1',
        state: {},
        params: {
          index: esTestIndexName,
          reference: 'create-test-1',
        },
      });
      const actionTestRecord = await retry.tryForTime(5000, async () => {
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
                      reference: 'create-test-1',
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
          encrypted: 'This value should be encrypted',
          unencrypted: `This value shouldn't get encrypted`,
        },
        params: {
          index: esTestIndexName,
          reference: 'create-test-1',
          message: 'instanceContextValue: true, instanceStateValue: true',
        },
        reference: 'create-test-1',
        source: 'action:test.index-record',
      });
    });
  });
}
