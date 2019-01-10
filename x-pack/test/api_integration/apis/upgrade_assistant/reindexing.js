/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import expect from 'expect.js';

import { ReindexStatus, REINDEX_OP_TYPE } from '../../../../plugins/upgrade_assistant/common/types';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const archive = 'upgrade_assistant/reindex';
  const indexName = 'dummydata';

  // Utility function that keeps polling API until reindex operation has completed or failed.
  const waitForReindexToComplete = async () => {
    console.log(`Waiting for reindex to complete...`);
    let lastState;

    while (true) {
      lastState = (await supertest.get(`/api/upgrade_assistant/reindex/${indexName}`).expect(200)).body.reindexOp;
      // Once the operation is completed or failed and unlocked, stop polling.
      if (lastState.status !== ReindexStatus.inProgress && lastState.locked === null) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return lastState;
  };

  const cleanup = async () => {
    const lastState = await waitForReindexToComplete();

    console.log(`Deleting reindex saved object...`);
    await es.deleteByQuery({
      index: '.kibana',
      refresh: true,
      body: {
        query: {
          "simple_query_string": {
            query: REINDEX_OP_TYPE,
            fields: ["type"]
          }
        }
      }
    });

    if (lastState.status === ReindexStatus.completed) {
      console.log(`Deleting ${lastState.newIndexName}...`);
      await es.indices.delete({
        index: lastState.newIndexName
      });
    }
  };

  describe('reindexing', () => {
    beforeEach(() => esArchiver.load(archive));
    // Wait for completion and cleanup data so tests don't collide.
    afterEach(cleanup);

    it('should create a new index with the same documents', async () => {
      // const originalMappings = await es.client.indices.getMapping({ index: indexName });
      const { body } = await supertest
        .post(`/api/upgrade_assistant/reindex/${indexName}`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      expect(body.indexName).to.equal(indexName);
      expect(body.status).to.equal(ReindexStatus.inProgress);

      const lastState = await waitForReindexToComplete();
      expect(lastState.errorMessage).to.equal(null);
      expect(lastState.status).to.equal(ReindexStatus.completed);

      // const x = await es.indices.exists({ index: indexName });
      // const y = await es.indices.exists({ index: lastState.newIndexName });
      const { newIndexName } = lastState;
      const indexSummary = await es.indices.get({ index: indexName });

      // The new index was created
      expect(indexSummary[newIndexName]).to.be.an('object');
      // The original index name is aliased to the new one
      expect(indexSummary[newIndexName].aliases[indexName]).to.be.an('object');
      // The number of documents in the new index matches what we expect
      expect(
        (await es.count({ index: lastState.newIndexName })).count
      ).to.be(3);
    });

    it('handles indices with auto-fixable deprecated settings');
    it('rejects indices using unfixable deprecated settings');
  });
}
