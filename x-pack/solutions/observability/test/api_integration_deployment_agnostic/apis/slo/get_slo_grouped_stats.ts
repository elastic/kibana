/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { InternalRequestHeader, RoleCredentials } from '@kbn/ftr-common-functional-services';
import { SUMMARY_DESTINATION_INDEX_NAME } from '@kbn/slo-plugin/common/constants';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { createApmSummaryDoc } from './fixtures/slo';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  let adminRoleAuthc: RoleCredentials;
  let internalHeaders: InternalRequestHeader;

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

  async function cleanupSummaryDocs() {
    await esClient.deleteByQuery({
      index: SUMMARY_DESTINATION_INDEX_NAME,
      query: { match_all: {} },
      refresh: true,
      conflicts: 'proceed',
    });
  }

  describe('Get SLO Grouped Stats', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      internalHeaders = samlAuth.getInternalRequestHeader();
    });

    after(async () => {
      await cleanupSummaryDocs();
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    afterEach(async () => {
      await cleanupSummaryDocs();
    });

    it('returns empty results when no APM SLOs exist', async () => {
      const response = await supertestWithoutAuth
        .post(`/internal/slos/_grouped_stats`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(internalHeaders)
        .send({ type: 'apm' })
        .expect(200);

      expect(response.body.results).to.have.length(0);
    });

    it('returns grouped stats by service.name for APM SLOs', async () => {
      const now = new Date().toISOString();
      const docs = [
        createApmSummaryDoc('slo-1', 'service-a', 'HEALTHY', now),
        createApmSummaryDoc('slo-2', 'service-a', 'VIOLATED', now),
        createApmSummaryDoc('slo-3', 'service-b', 'HEALTHY', now),
        createApmSummaryDoc('slo-4', 'service-b', 'HEALTHY', now),
        createApmSummaryDoc('slo-5', 'service-b', 'DEGRADING', now),
      ];

      await insertSummaryDocs(docs);

      const response = await supertestWithoutAuth
        .post(`/internal/slos/_grouped_stats`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(internalHeaders)
        .send({ type: 'apm' })
        .expect(200);

      expect(response.body.results).to.have.length(2);

      const serviceA = response.body.results.find(
        (r: { entity: string }) => r.entity === 'service-a'
      );
      const serviceB = response.body.results.find(
        (r: { entity: string }) => r.entity === 'service-b'
      );

      expect(serviceA).to.be.ok();
      expect(serviceA.summary.healthy).to.eql(1);
      expect(serviceA.summary.violated).to.eql(1);
      expect(serviceA.summary.degrading).to.eql(0);
      expect(serviceA.summary.noData).to.eql(0);

      expect(serviceB).to.be.ok();
      expect(serviceB.summary.healthy).to.eql(2);
      expect(serviceB.summary.violated).to.eql(0);
      expect(serviceB.summary.degrading).to.eql(1);
      expect(serviceB.summary.noData).to.eql(0);
    });

    it('filters by serviceNames', async () => {
      const now = new Date().toISOString();
      const docs = [
        createApmSummaryDoc('slo-1', 'service-a', 'HEALTHY', now),
        createApmSummaryDoc('slo-2', 'service-b', 'HEALTHY', now),
        createApmSummaryDoc('slo-3', 'service-c', 'HEALTHY', now),
      ];

      await insertSummaryDocs(docs);

      const response = await supertestWithoutAuth
        .post(`/internal/slos/_grouped_stats`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(internalHeaders)
        .send({ type: 'apm', serviceNames: ['service-a', 'service-b'] })
        .expect(200);

      expect(response.body.results).to.have.length(2);

      const entities = response.body.results.map((r: { entity: string }) => r.entity);
      expect(entities).to.contain('service-a');
      expect(entities).to.contain('service-b');
      expect(entities).to.not.contain('service-c');
    });

    it('filters by environment', async () => {
      const now = new Date().toISOString();
      const docs = [
        createApmSummaryDoc('slo-1', 'service-a', 'HEALTHY', now, { environment: 'production' }),
        createApmSummaryDoc('slo-2', 'service-a', 'HEALTHY', now, { environment: 'staging' }),
        createApmSummaryDoc('slo-3', 'service-b', 'HEALTHY', now, { environment: 'production' }),
      ];

      await insertSummaryDocs(docs);

      const response = await supertestWithoutAuth
        .post(`/internal/slos/_grouped_stats`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(internalHeaders)
        .send({ type: 'apm', environment: 'production' })
        .expect(200);

      expect(response.body.results).to.have.length(2);

      const serviceA = response.body.results.find(
        (r: { entity: string }) => r.entity === 'service-a'
      );
      const serviceB = response.body.results.find(
        (r: { entity: string }) => r.entity === 'service-b'
      );

      expect(serviceA.summary.healthy).to.eql(1);
      expect(serviceB.summary.healthy).to.eql(1);
    });

    it('respects size parameter', async () => {
      const now = new Date().toISOString();
      const docs = [
        createApmSummaryDoc('slo-1', 'service-a', 'HEALTHY', now),
        createApmSummaryDoc('slo-2', 'service-b', 'HEALTHY', now),
        createApmSummaryDoc('slo-3', 'service-c', 'HEALTHY', now),
      ];

      await insertSummaryDocs(docs);

      const response = await supertestWithoutAuth
        .post(`/internal/slos/_grouped_stats`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(internalHeaders)
        .send({ type: 'apm', size: 2 })
        .expect(200);

      expect(response.body.results).to.have.length(2);
    });

    it('excludes stale SLO summaries', async () => {
      const now = new Date().toISOString();
      const staleDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago

      const docs = [
        createApmSummaryDoc('slo-1', 'service-fresh', 'HEALTHY', now),
        createApmSummaryDoc('slo-2', 'service-stale', 'HEALTHY', staleDate),
      ];

      await insertSummaryDocs(docs);

      const response = await supertestWithoutAuth
        .post(`/internal/slos/_grouped_stats`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(internalHeaders)
        .send({ type: 'apm' })
        .expect(200);

      expect(response.body.results).to.have.length(1);
      expect(response.body.results[0].entity).to.eql('service-fresh');
    });

    it('only includes APM indicator types', async () => {
      const now = new Date().toISOString();
      const docs = [
        createApmSummaryDoc('slo-1', 'service-a', 'HEALTHY', now, {
          indicatorType: 'sli.apm.transactionDuration',
        }),
        createApmSummaryDoc('slo-2', 'service-a', 'HEALTHY', now, {
          indicatorType: 'sli.apm.transactionErrorRate',
        }),
      ];

      await insertSummaryDocs(docs);

      const response = await supertestWithoutAuth
        .post(`/internal/slos/_grouped_stats`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(internalHeaders)
        .send({ type: 'apm' })
        .expect(200);

      expect(response.body.results).to.have.length(1);
      expect(response.body.results[0].entity).to.eql('service-a');
      expect(response.body.results[0].summary.healthy).to.eql(2);
    });

    it('returns 400 for unsupported SLO type', async () => {
      const response = await supertestWithoutAuth
        .post(`/internal/slos/_grouped_stats`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(internalHeaders)
        .send({ type: 'unsupported-type' })
        .expect(400);

      expect(response.body.message).to.contain('"unsupported-type" does not match expected type');
    });

    it('returns 400 for invalid size parameter', async () => {
      const response = await supertestWithoutAuth
        .post(`/internal/slos/_grouped_stats`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(internalHeaders)
        .send({ type: 'apm', size: 0 })
        .expect(400);

      expect(response.body.message).to.contain('size must be equal to or greater than');
    });
  });
}
