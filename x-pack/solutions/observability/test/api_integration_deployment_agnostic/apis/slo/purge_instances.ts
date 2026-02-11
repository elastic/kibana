/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import expect from '@kbn/expect';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { SUMMARY_DESTINATION_INDEX_NAME } from '@kbn/slo-plugin/common/constants';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { TEST_SPACE_ID, createDummySummaryDoc } from './fixtures/slo';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const sloApi = getService('sloApi');
  const retry = getService('retry');
  const samlAuth = getService('samlAuth');

  let adminRoleAuthc: RoleCredentials;

  async function insertSummaryDocs(docs: any[]) {
    const operations = docs.flatMap((doc) => [
      { index: { _index: SUMMARY_DESTINATION_INDEX_NAME } },
      doc,
    ]);

    await esClient.bulk({
      refresh: 'wait_for',
      operations,
    });
  }

  async function countSummaryDocs(filter?: QueryDslQueryContainer) {
    const result = await esClient.count({
      index: SUMMARY_DESTINATION_INDEX_NAME,
      query: filter,
    });
    return result.count;
  }

  async function cleanupSummaryDocs() {
    await esClient.deleteByQuery({
      index: SUMMARY_DESTINATION_INDEX_NAME,
      query: { match_all: {} },
      refresh: true,
      conflicts: 'proceed',
    });
  }

  async function forceRefreshSummaryIndex() {
    await esClient.indices.refresh({
      index: SUMMARY_DESTINATION_INDEX_NAME,
    });
  }

  describe('Purge Instances', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await cleanupSummaryDocs();
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    afterEach(async () => {
      await cleanupSummaryDocs();
    });

    it('purges all stale instances without list filter', async () => {
      // Insert documents with old summaryUpdatedAt
      const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days ago
      const docs = [
        createDummySummaryDoc('slo-1', 'instance-1', oldDate),
        createDummySummaryDoc('slo-1', 'instance-2', oldDate),
        createDummySummaryDoc('slo-2', 'instance-1', oldDate),
      ];

      await insertSummaryDocs(docs);
      const countBefore = await countSummaryDocs({
        bool: { must: [{ term: { spaceId: TEST_SPACE_ID } }] },
      });
      expect(countBefore).to.eql(3);

      const response = await sloApi.purgeInstances({ staleDuration: '30d' }, adminRoleAuthc);
      expect(response).to.have.property('taskId');

      await retry.waitFor('task completion', async () => {
        const status = await sloApi.purgeInstancesStatus(response.taskId, adminRoleAuthc);
        return status.completed === true;
      });

      const status = await sloApi.purgeInstancesStatus(response.taskId, adminRoleAuthc);
      expect(status.completed).to.eql(true);
      expect(status.status).to.have.property('deleted');
      expect(status.status.deleted).to.be.equal(3);

      await forceRefreshSummaryIndex();
      const countAfter = await countSummaryDocs({
        bool: { must: [{ term: { spaceId: TEST_SPACE_ID } }] },
      });
      expect(countAfter).to.eql(0);
    });

    it('purges only specific SLO instances when list is provided', async () => {
      // Insert documents for multiple SLOs
      const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const docs = [
        createDummySummaryDoc('slo-to-purge-1', 'instance-1', oldDate),
        createDummySummaryDoc('slo-to-purge-1', 'instance-2', oldDate),
        createDummySummaryDoc('slo-to-keep', 'instance-1', oldDate),
        createDummySummaryDoc('slo-to-keep', 'instance-2', oldDate),
      ];

      await insertSummaryDocs(docs);

      // Verify all documents were inserted
      const countBefore = await countSummaryDocs({
        bool: { must: [{ term: { spaceId: TEST_SPACE_ID } }] },
      });
      expect(countBefore).to.eql(4);

      const response = await sloApi.purgeInstances(
        { list: ['slo-to-purge-1'], staleDuration: '30d' },
        adminRoleAuthc
      );
      expect(response).to.have.property('taskId');

      await retry.waitFor('task completion', async () => {
        const status = await sloApi.purgeInstancesStatus(response.taskId, adminRoleAuthc);
        return status.completed === true;
      });

      await forceRefreshSummaryIndex();
      const countAfter = await countSummaryDocs({
        bool: { must: [{ term: { spaceId: TEST_SPACE_ID } }] },
      });
      expect(countAfter).to.eql(2);

      const keepCount = await countSummaryDocs({
        bool: {
          must: [{ term: { spaceId: TEST_SPACE_ID } }, { term: { 'slo.id': 'slo-to-keep' } }],
        },
      });
      expect(keepCount).to.eql(2);
    });

    it('respects staleDuration parameter and only deletes old documents', async () => {
      // Insert mix of old and recent documents
      const oldDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days ago
      const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days ago
      const docs = [
        createDummySummaryDoc('slo-1', 'instance-old', oldDate),
        createDummySummaryDoc('slo-1', 'instance-recent', recentDate),
      ];

      await insertSummaryDocs(docs);

      const countBefore = await countSummaryDocs({
        bool: { must: [{ term: { spaceId: TEST_SPACE_ID } }] },
      });
      expect(countBefore).to.eql(2);

      const response = await sloApi.purgeInstances({ staleDuration: '30d' }, adminRoleAuthc);
      expect(response).to.have.property('taskId');

      await retry.waitFor('task completion', async () => {
        const status = await sloApi.purgeInstancesStatus(response.taskId, adminRoleAuthc);
        return status.completed === true;
      });

      await forceRefreshSummaryIndex();
      const countAfter = await countSummaryDocs({
        bool: { must: [{ term: { spaceId: TEST_SPACE_ID } }] },
      });
      expect(countAfter).to.eql(1);

      const recentCount = await countSummaryDocs({
        bool: {
          must: [
            { term: { spaceId: TEST_SPACE_ID } },
            { term: { 'slo.instanceId': 'instance-recent' } },
          ],
        },
      });
      expect(recentCount).to.eql(1);
    });

    it('allows force parameter to override staleDuration validation', async () => {
      // Insert documents with old summaryUpdatedAt
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago
      const docs = [createDummySummaryDoc('slo-1', 'instance-1', oldDate)];

      await insertSummaryDocs(docs);

      const countBefore = await countSummaryDocs({
        bool: { must: [{ term: { spaceId: TEST_SPACE_ID } }] },
      });
      expect(countBefore).to.eql(1);

      const response = await sloApi.purgeInstances(
        { staleDuration: '5d', force: true },
        adminRoleAuthc
      );
      expect(response).to.have.property('taskId');

      await retry.waitFor('task completion', async () => {
        const status = await sloApi.purgeInstancesStatus(response.taskId, adminRoleAuthc);
        return status.completed === true;
      });

      await forceRefreshSummaryIndex();
      const countAfter = await countSummaryDocs({
        bool: { must: [{ term: { spaceId: TEST_SPACE_ID } }] },
      });
      expect(countAfter).to.eql(0);
    });

    it('returns task not found error for invalid taskId', async () => {
      const status = await sloApi.purgeInstancesStatus('inexistant-task-id', adminRoleAuthc);
      expect(status).to.have.property('completed', false);
      expect(status).to.have.property('error', 'Task not found');
    });
  });
}
