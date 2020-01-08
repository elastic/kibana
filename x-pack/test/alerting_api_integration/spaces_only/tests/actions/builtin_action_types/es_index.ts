/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

const ES_TEST_INDEX_NAME = 'functional-test-actions-index';

// eslint-disable-next-line import/no-default-export
export default function indexTest({ getService }: FtrProviderContext) {
  const es = getService('legacyEs');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('index action', () => {
    after(() => esArchiver.unload('empty_kibana'));
    beforeEach(() => clearTestIndex(es));

    let createdActionID: string;
    let createdActionIDWithIndex: string;

    it('should be created successfully', async () => {
      // create action with no config
      const { body: createdAction } = await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An index action',
          actionTypeId: '.index',
          config: {},
          secrets: {},
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        name: 'An index action',
        actionTypeId: '.index',
        config: {
          index: null,
        },
      });
      createdActionID = createdAction.id;
      expect(typeof createdActionID).to.be('string');

      const { body: fetchedAction } = await supertest
        .get(`/api/action/${createdActionID}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        id: fetchedAction.id,
        name: 'An index action',
        actionTypeId: '.index',
        config: { index: null },
      });

      // create action with index config
      const { body: createdActionWithIndex } = await supertest
        .post('/api/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'An index action with index config',
          actionTypeId: '.index',
          config: {
            index: ES_TEST_INDEX_NAME,
          },
        })
        .expect(200);

      expect(createdActionWithIndex).to.eql({
        id: createdActionWithIndex.id,
        name: 'An index action with index config',
        actionTypeId: '.index',
        config: {
          index: ES_TEST_INDEX_NAME,
        },
      });
      createdActionIDWithIndex = createdActionWithIndex.id;
      expect(typeof createdActionIDWithIndex).to.be('string');

      const { body: fetchedActionWithIndex } = await supertest
        .get(`/api/action/${createdActionIDWithIndex}`)
        .expect(200);

      expect(fetchedActionWithIndex).to.eql({
        id: fetchedActionWithIndex.id,
        name: 'An index action with index config',
        actionTypeId: '.index',
        config: {
          index: ES_TEST_INDEX_NAME,
        },
      });
    });

    it('should execute successly when expected for a single body', async () => {
      const { body: result } = await supertest
        .post(`/api/action/${createdActionID}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            index: ES_TEST_INDEX_NAME,
            documents: [{ testing: [1, 2, 3] }],
            refresh: true,
          },
        })
        .expect(200);
      expect(result.status).to.eql('ok');

      const items = await getTestIndexItems(es);
      expect(items.length).to.eql(1);
      expect(items[0]._source).to.eql({ testing: [1, 2, 3] });
    });
  });
}

async function clearTestIndex(es: any) {
  return await es.indices.delete({
    index: ES_TEST_INDEX_NAME,
    ignoreUnavailable: true,
  });
}

async function getTestIndexItems(es: any) {
  const result = await es.search({
    index: ES_TEST_INDEX_NAME,
  });

  return result.hits.hits;
}
