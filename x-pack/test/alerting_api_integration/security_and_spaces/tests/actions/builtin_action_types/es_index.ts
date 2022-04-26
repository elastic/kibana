/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

const ES_TEST_INDEX_NAME = 'functional-test-actions-index';

// eslint-disable-next-line import/no-default-export
export default function indexTest({ getService }: FtrProviderContext) {
  const es: Client = getService('es');
  const supertest = getService('supertest');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  describe('index action', () => {
    beforeEach(() => esDeleteAllIndices(ES_TEST_INDEX_NAME));

    let createdActionID: string;
    let createdActionIDWithIndex: string;

    it('should be created successfully', async () => {
      // create action with no config
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An index action',
          connector_type_id: '.index',
          config: {
            index: ES_TEST_INDEX_NAME,
          },
          secrets: {},
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        is_preconfigured: false,
        is_deprecated: false,
        name: 'An index action',
        connector_type_id: '.index',
        is_missing_secrets: false,
        config: {
          index: ES_TEST_INDEX_NAME,
          refresh: false,
          executionTimeField: null,
        },
      });
      createdActionID = createdAction.id;
      expect(typeof createdActionID).to.be('string');

      const { body: fetchedAction } = await supertest
        .get(`/api/actions/connector/${createdActionID}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        id: fetchedAction.id,
        is_preconfigured: false,
        is_deprecated: false,
        is_missing_secrets: false,
        name: 'An index action',
        connector_type_id: '.index',
        config: { index: ES_TEST_INDEX_NAME, refresh: false, executionTimeField: null },
      });

      // create action with all config props
      const { body: createdActionWithIndex } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An index action with index config',
          connector_type_id: '.index',
          config: {
            index: ES_TEST_INDEX_NAME,
            refresh: true,
            executionTimeField: 'test',
          },
        })
        .expect(200);

      expect(createdActionWithIndex).to.eql({
        id: createdActionWithIndex.id,
        is_preconfigured: false,
        is_deprecated: false,
        name: 'An index action with index config',
        connector_type_id: '.index',
        is_missing_secrets: false,
        config: {
          index: ES_TEST_INDEX_NAME,
          refresh: true,
          executionTimeField: 'test',
        },
      });
      createdActionIDWithIndex = createdActionWithIndex.id;
      expect(typeof createdActionIDWithIndex).to.be('string');

      const { body: fetchedActionWithIndex } = await supertest
        .get(`/api/actions/connector/${createdActionIDWithIndex}`)
        .expect(200);

      expect(fetchedActionWithIndex).to.eql({
        id: fetchedActionWithIndex.id,
        is_preconfigured: false,
        is_deprecated: false,
        name: 'An index action with index config',
        connector_type_id: '.index',
        is_missing_secrets: false,
        config: {
          index: ES_TEST_INDEX_NAME,
          refresh: true,
          executionTimeField: 'test',
        },
      });
    });

    it('should respond with error when creation unsuccessful', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An index action',
          connector_type_id: '.index',
          config: { index: 666 },
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'error validating action type config: [index]: expected value of type [string] but got [number]',
          });
        });
    });

    it('should execute successly when expected for a single body', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An index action',
          connector_type_id: '.index',
          config: {
            index: ES_TEST_INDEX_NAME,
            refresh: true,
          },
          secrets: {},
        })
        .expect(200);
      const { body: result } = await supertest
        .post(`/api/actions/connector/${createdAction.id}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            documents: [{ testing: [1, 2, 3] }],
          },
        })
        .expect(200);
      expect(result.status).to.eql('ok');

      const items = await getTestIndexItems(es);
      expect(items.length).to.eql(1);
      expect(items[0]._source).to.eql({ testing: [1, 2, 3] });
    });

    it('should execute successly when expected for with multiple bodies', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An index action',
          connector_type_id: '.index',
          config: {
            index: ES_TEST_INDEX_NAME,
            refresh: true,
          },
          secrets: {},
        })
        .expect(200);
      const { body: result } = await supertest
        .post(`/api/actions/connector/${createdAction.id}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            documents: [{ testing: [1, 2, 3] }, { Testing: [4, 5, 6] }],
          },
        })
        .expect(200);
      expect(result.status).to.eql('ok');

      const items: any[] = await getTestIndexItems(es);
      expect(items.length).to.eql(2);
      let passed1 = false;
      let passed2 = false;
      for (const item of items) {
        if (item._source.testing != null) {
          expect(item._source).to.eql({ testing: [1, 2, 3] });
          passed1 = true;
        }

        if (item._source.Testing != null) {
          expect(item._source).to.eql({ Testing: [4, 5, 6] });
          passed2 = true;
        }
      }
      expect(passed1).to.be(true);
      expect(passed2).to.be(true);
    });

    it('should execute successly with refresh false', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An index action',
          connector_type_id: '.index',
          config: {
            index: ES_TEST_INDEX_NAME,
            refresh: false,
            executionTimeField: 'test',
          },
          secrets: {},
        })
        .expect(200);
      const { body: result } = await supertest
        .post(`/api/actions/connector/${createdAction.id}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            documents: [{ refresh: 'not set' }],
          },
        })
        .expect(200);
      expect(result.status).to.eql('ok');

      let items;
      items = await getTestIndexItems(es);
      expect(items.length).to.be.lessThan(2);

      const { body: createdActionWithRefresh } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An index action',
          connector_type_id: '.index',
          config: {
            index: ES_TEST_INDEX_NAME,
            refresh: true,
          },
          secrets: {},
        })
        .expect(200);
      const { body: result2 } = await supertest
        .post(`/api/actions/connector/${createdActionWithRefresh.id}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            documents: [{ refresh: 'true' }],
          },
        })
        .expect(200);
      expect(result2.status).to.eql('ok');

      items = await getTestIndexItems(es);
      expect(items.length).to.eql(2);
    });
  });
}

async function getTestIndexItems(es: Client) {
  const result = await es.search({
    index: ES_TEST_INDEX_NAME,
  });

  return result.hits.hits;
}
