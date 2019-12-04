/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import {
  ESTestIndexTool,
  ES_TEST_INDEX_NAME,
  getUrlPrefix,
  ObjectRemover,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');
  const retry = getService('retry');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  const authorizationIndex = '.kibana-test-authorization';

  describe('execute', () => {
    const objectRemover = new ObjectRemover(supertest);

    before(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
      await es.indices.create({ index: authorizationIndex });
    });
    after(async () => {
      await esTestIndexTool.destroy();
      await es.indices.delete({ index: authorizationIndex });
      await objectRemover.removeAll();
    });

    it('should handle execute request appropriately', async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/action`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action',
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
            index: ES_TEST_INDEX_NAME,
            message: 'Testing 123',
          },
        });

      expect(response.statusCode).to.eql(200);
      expect(response.body).to.be.an('object');
      const searchResult = await esTestIndexTool.search('action:test.index-record', reference);
      expect(searchResult.hits.total.value).to.eql(1);
      const indexedRecord = searchResult.hits.hits[0];
      expect(indexedRecord._source).to.eql({
        params: {
          reference,
          index: ES_TEST_INDEX_NAME,
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

    it(`shouldn't execute an action from another space`, async () => {
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/action`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action',
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

      const reference = `actions-execute-2:${Spaces.space1.id}`;
      await supertest
        .post(`${getUrlPrefix(Spaces.other.id)}/api/action/${createdAction.id}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            reference,
            index: ES_TEST_INDEX_NAME,
            message: 'Testing 123',
          },
        })
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: `Saved object [action/${createdAction.id}] not found`,
        });
    });

    it('should handle execute request appropriately and have proper callCluster and savedObjectsClient authorization', async () => {
      const reference = `actions-execute-3:${Spaces.space1.id}`;
      const { body: createdAction } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/action`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'My action',
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
            index: ES_TEST_INDEX_NAME,
            reference,
          },
        });

      expect(response.statusCode).to.eql(200);
      const searchResult = await esTestIndexTool.search('action:test.authorization', reference);
      expect(searchResult.hits.total.value).to.eql(1);
      const indexedRecord = searchResult.hits.hits[0];
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
