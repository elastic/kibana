/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import {
  ReindexStatus,
  REINDEX_OP_TYPE,
} from '../../../legacy/plugins/upgrade_assistant/common/types';

export default function({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('legacyEs');

  // Utility function that keeps polling API until reindex operation has completed or failed.
  const waitForReindexToComplete = async indexName => {
    console.log(`Waiting for reindex to complete...`);
    let lastState;

    while (true) {
      lastState = (await supertest.get(`/api/upgrade_assistant/reindex/${indexName}`).expect(200))
        .body.reindexOp;
      // Once the operation is completed or failed and unlocked, stop polling.
      if (lastState.status !== ReindexStatus.inProgress && lastState.locked === null) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return lastState;
  };

  describe('reindexing', () => {
    afterEach(() => {
      // Cleanup saved objects
      return es.deleteByQuery({
        index: '.kibana',
        refresh: true,
        body: {
          query: {
            simple_query_string: {
              query: REINDEX_OP_TYPE,
              fields: ['type'],
            },
          },
        },
      });
    });

    it('should create a new index with the same documents', async () => {
      await esArchiver.load('upgrade_assistant/reindex');
      const { body } = await supertest
        .post(`/api/upgrade_assistant/reindex/dummydata`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      expect(body.indexName).to.equal('dummydata');
      expect(body.status).to.equal(ReindexStatus.inProgress);

      const lastState = await waitForReindexToComplete('dummydata');
      expect(lastState.errorMessage).to.equal(null);
      expect(lastState.status).to.equal(ReindexStatus.completed);

      const { newIndexName } = lastState;
      const indexSummary = await es.indices.get({ index: 'dummydata' });

      // The new index was created
      expect(indexSummary[newIndexName]).to.be.an('object');
      // The original index name is aliased to the new one
      expect(indexSummary[newIndexName].aliases.dummydata).to.be.an('object');
      // The number of documents in the new index matches what we expect
      expect((await es.count({ index: lastState.newIndexName })).count).to.be(3);

      // Cleanup newly created index
      await es.indices.delete({
        index: lastState.newIndexName,
      });
    });

    it('should update any aliases', async () => {
      await esArchiver.load('upgrade_assistant/reindex');

      // Add aliases and ensure each returns the right number of docs
      await es.indices.updateAliases({
        body: {
          actions: [
            { add: { index: 'dummydata', alias: 'myAlias' } },
            { add: { index: 'dummy*', alias: 'wildcardAlias' } },
            {
              add: { index: 'dummydata', alias: 'myHttpsAlias', filter: { term: { https: true } } },
            },
          ],
        },
      });
      expect((await es.count({ index: 'myAlias' })).count).to.be(3);
      expect((await es.count({ index: 'wildcardAlias' })).count).to.be(3);
      expect((await es.count({ index: 'myHttpsAlias' })).count).to.be(2);

      // Reindex
      await supertest
        .post(`/api/upgrade_assistant/reindex/dummydata`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      const lastState = await waitForReindexToComplete('dummydata');

      // The regular aliases should still return 3 docs
      expect((await es.count({ index: 'myAlias' })).count).to.be(3);
      expect((await es.count({ index: 'wildcardAlias' })).count).to.be(3);
      // The filtered alias should still return 2 docs
      expect((await es.count({ index: 'myHttpsAlias' })).count).to.be(2);

      // Cleanup newly created index
      await es.indices.delete({
        index: lastState.newIndexName,
      });
    });

    it('shows no warnings', async () => {
      const resp = await supertest.get(`/api/upgrade_assistant/reindex/7.0-data`);
      expect(resp.body.warnings.length).to.be(0);
    });

    it('reindexes old 7.0 index', async () => {
      const { body } = await supertest
        .post(`/api/upgrade_assistant/reindex/7.0-data`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      expect(body.indexName).to.equal('7.0-data');
      expect(body.status).to.equal(ReindexStatus.inProgress);

      const lastState = await waitForReindexToComplete('7.0-data');
      expect(lastState.errorMessage).to.equal(null);
      expect(lastState.status).to.equal(ReindexStatus.completed);
    });
  });
}
