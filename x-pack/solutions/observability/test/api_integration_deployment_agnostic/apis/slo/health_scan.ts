/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { HEALTH_DATA_STREAM_NAME } from '@kbn/slo-plugin/common/constants';
import { v4, v7 } from 'uuid';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

interface HealthDocument {
  '@timestamp': string;
  scanId: string;
  spaceId: string;
  sloId: string;
  revision: number;
  isProblematic: boolean;
  health: any;
}

function createHealthDocument(overrides: Partial<HealthDocument> = {}): HealthDocument {
  return {
    '@timestamp': new Date().toISOString(),
    scanId: v7(),
    spaceId: 'default',
    sloId: v4(),
    revision: 1,
    isProblematic: false,
    health: {
      isProblematic: false,
      rollup: {
        isProblematic: false,
        missing: false,
        status: 'healthy',
        state: 'started',
      },
      summary: {
        isProblematic: false,
        missing: false,
        status: 'healthy',
        state: 'started',
      },
    },
    ...overrides,
  };
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const sloApi = getService('sloApi');
  const samlAuth = getService('samlAuth');
  const retry = getService('retry');

  let adminRoleAuthc: RoleCredentials;

  describe('Health Scan', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      await esClient.deleteByQuery({
        index: HEALTH_DATA_STREAM_NAME,
        query: { match_all: {} },
        refresh: true,
        ignore_unavailable: true,
      });
    });

    after(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    afterEach(async () => {
      await esClient.deleteByQuery({
        index: HEALTH_DATA_STREAM_NAME,
        query: { match_all: {} },
        refresh: true,
        ignore_unavailable: true,
      });
    });

    describe('POST /internal/observability/slos/_health/scans', () => {
      it('schedules a new health scan and returns scheduled status', async () => {
        const response = await sloApi.scheduleHealthScan(adminRoleAuthc, { force: true });

        expect(response).to.have.property('scanId');
        expect(response).to.have.property('scheduledAt');
        expect(response.status).to.eql('scheduled');
      });

      it('returns existing scan when recent scan exists within 1h', async () => {
        const firstResponse = await sloApi.scheduleHealthScan(adminRoleAuthc, { force: false });
        expect(firstResponse).to.have.property('scanId');

        retry.tryForTime(30 * 1000, async () => {
          const secondResponse = await sloApi.scheduleHealthScan(adminRoleAuthc);

          expect(secondResponse).to.have.property('scanId');
          expect(secondResponse.scanId).to.eql(firstResponse.scanId);
        });
      });

      it('forces a new scan when force parameter is true', async () => {
        const firstResponse = await sloApi.scheduleHealthScan(adminRoleAuthc, { force: true });
        expect(firstResponse).to.have.property('scanId');

        const secondResponse = await sloApi.scheduleHealthScan(adminRoleAuthc, { force: true });

        expect(secondResponse).to.have.property('scanId');
        expect(secondResponse.scanId).to.not.eql(firstResponse.scanId);
      });
    });

    describe('GET /internal/observability/slos/_health/scans/{scanId}', () => {
      const testScanId = v7();

      it('returns empty results when no health documents exist for scanId', async () => {
        const response = await sloApi.getHealthScanResults(
          'non-existent-scan-id',
          adminRoleAuthc,
          {}
        );

        expect(response.results).to.be.an('array');
        expect(response.results).to.have.length(0);
        expect(response.total).to.eql(0);
      });

      it('returns health documents filtered by scanId', async () => {
        const docs = [
          createHealthDocument({ scanId: testScanId, sloId: 'slo-1' }),
          createHealthDocument({ scanId: testScanId, sloId: 'slo-2' }),
          createHealthDocument({ scanId: 'other-scan-id', sloId: 'slo-3' }),
        ];

        await esClient.bulk({
          operations: docs.flatMap((doc) => [{ create: { _index: HEALTH_DATA_STREAM_NAME } }, doc]),
          refresh: true,
        });

        const response = await sloApi.getHealthScanResults(testScanId, adminRoleAuthc, {});

        expect(response.results).to.be.an('array');
        expect(response.results).to.have.length(2);
        expect(response.total).to.eql(2);

        const sloIds = response.results.map((r: any) => r.sloId);
        expect(sloIds).to.contain('slo-1');
        expect(sloIds).to.contain('slo-2');
        expect(sloIds).to.not.contain('slo-3');
      });

      it('filters by problematic flag', async () => {
        const docs = [
          createHealthDocument({
            scanId: testScanId,
            sloId: 'healthy-slo',
            isProblematic: false,
          }),
          createHealthDocument({
            scanId: testScanId,
            sloId: 'problematic-slo',
            isProblematic: true,
            health: {
              isProblematic: true,
              rollup: {
                isProblematic: true,
                missing: false,
                status: 'unhealthy',
                state: 'failed',
              },
              summary: {
                isProblematic: false,
                missing: false,
                status: 'healthy',
                state: 'started',
              },
            },
          }),
        ];

        await esClient.bulk({
          operations: docs.flatMap((doc) => [{ create: { _index: HEALTH_DATA_STREAM_NAME } }, doc]),
          refresh: true,
        });

        const response = await sloApi.getHealthScanResults(testScanId, adminRoleAuthc, {
          problematic: true,
        });

        expect(response.results).to.have.length(1);
        expect(response.results[0].sloId).to.eql('problematic-slo');
        expect(response.results[0].isProblematic).to.eql(true);
      });

      it('supports pagination via size and searchAfter', async () => {
        const docs = Array.from({ length: 5 }, (_, i) =>
          createHealthDocument({
            scanId: testScanId,
            sloId: `slo-${i + 1}`,
            '@timestamp': new Date(Date.now() - i * 1000).toISOString(),
          })
        );

        await esClient.bulk({
          operations: docs.flatMap((doc) => [{ create: { _index: HEALTH_DATA_STREAM_NAME } }, doc]),
          refresh: true,
        });

        const firstPage = await sloApi.getHealthScanResults(testScanId, adminRoleAuthc, {
          size: 2,
        });

        expect(firstPage.results).to.have.length(2);
        expect(firstPage.total).to.eql(5);
        expect(firstPage.searchAfter).to.be.an('array');

        const secondPage = await sloApi.getHealthScanResults(testScanId, adminRoleAuthc, {
          size: 2,
          searchAfter: JSON.stringify(firstPage.searchAfter),
        });

        expect(secondPage.results).to.have.length(2);

        const firstPageSloIds = firstPage.results.map((r: any) => r.sloId);
        const secondPageSloIds = secondPage.results.map((r: any) => r.sloId);
        const intersection = firstPageSloIds.filter((id: any) => secondPageSloIds.includes(id));
        expect(intersection).to.have.length(0);
      });

      it('filters by spaceId when allSpaces is false', async () => {
        const docs = [
          createHealthDocument({
            scanId: testScanId,
            sloId: 'default-space-slo',
            spaceId: 'default',
          }),
          createHealthDocument({
            scanId: testScanId,
            sloId: 'other-space-slo',
            spaceId: 'other-space',
          }),
        ];

        await esClient.bulk({
          operations: docs.flatMap((doc) => [{ create: { _index: HEALTH_DATA_STREAM_NAME } }, doc]),
          refresh: true,
        });

        const response = await sloApi.getHealthScanResults(testScanId, adminRoleAuthc, {
          allSpaces: false,
        });

        expect(response.results).to.have.length(1);
        expect(response.results[0].sloId).to.eql('default-space-slo');
      });

      it('returns all spaces when allSpaces is true', async () => {
        const docs = [
          createHealthDocument({
            scanId: testScanId,
            sloId: 'default-space-slo',
            spaceId: 'default',
          }),
          createHealthDocument({
            scanId: testScanId,
            sloId: 'other-space-slo',
            spaceId: 'other-space',
          }),
        ];

        await esClient.bulk({
          operations: docs.flatMap((doc) => [{ create: { _index: HEALTH_DATA_STREAM_NAME } }, doc]),
          refresh: true,
        });

        const response = await sloApi.getHealthScanResults(testScanId, adminRoleAuthc, {
          allSpaces: true,
        });

        expect(response.results).to.have.length(2);
        const sloIds = response.results.map((r: any) => r.sloId);
        expect(sloIds).to.contain('default-space-slo');
        expect(sloIds).to.contain('other-space-slo');
      });
    });

    describe('GET /internal/observability/slos/_health/scans', () => {
      const testScanIds = ['list-scan-1', 'list-scan-2', 'list-scan-3'];

      it('returns empty list when no scans exist', async () => {
        const response = await sloApi.listHealthScans(adminRoleAuthc, {});

        expect(response.scans).to.be.an('array');
        expect(response.scans).to.have.length(0);
      });

      it('returns aggregated scan summaries', async () => {
        const docs = [
          // Scan 1: 2 SLOs, 1 problematic
          createHealthDocument({
            scanId: testScanIds[0],
            sloId: 'scan1-slo1',
            isProblematic: false,
          }),
          createHealthDocument({
            scanId: testScanIds[0],
            sloId: 'scan1-slo2',
            isProblematic: true,
          }),
          // Scan 2: 3 SLOs, 0 problematic
          createHealthDocument({
            scanId: testScanIds[1],
            sloId: 'scan2-slo1',
            isProblematic: false,
          }),
          createHealthDocument({
            scanId: testScanIds[1],
            sloId: 'scan2-slo2',
            isProblematic: false,
          }),
          createHealthDocument({
            scanId: testScanIds[1],
            sloId: 'scan2-slo3',
            isProblematic: false,
          }),
        ];

        await esClient.bulk({
          operations: docs.flatMap((doc) => [{ create: { _index: HEALTH_DATA_STREAM_NAME } }, doc]),
          refresh: true,
        });

        const response = await sloApi.listHealthScans(adminRoleAuthc, { size: 10 });

        expect(response.scans).to.be.an('array');
        expect(response.scans.length).to.be.greaterThan(0);

        const scan1 = response.scans.find((s: any) => s.scanId === testScanIds[0]);
        const scan2 = response.scans.find((s: any) => s.scanId === testScanIds[1]);

        expect(scan1).to.be.ok();
        expect(scan1!.total).to.eql(2);
        expect(scan1!.problematic).to.eql(1);

        expect(scan2).to.be.ok();
        expect(scan2!.total).to.eql(3);
        expect(scan2!.problematic).to.eql(0);
      });

      it('supports pagination via size and searchAfter', async () => {
        const docs = testScanIds.map((scanId, i) =>
          createHealthDocument({
            scanId,
            sloId: `pagination-slo-${i}`,
            '@timestamp': new Date(Date.now() - i * 1000).toISOString(),
          })
        );

        await esClient.bulk({
          operations: docs.flatMap((doc) => [{ create: { _index: HEALTH_DATA_STREAM_NAME } }, doc]),
          refresh: true,
        });

        const firstPage = await sloApi.listHealthScans(adminRoleAuthc, { size: 2 });

        expect(firstPage.scans).to.be.an('array');
        expect(firstPage.scans.length).to.eql(2);

        const secondPage = await sloApi.listHealthScans(adminRoleAuthc, {
          size: 2,
          searchAfter: firstPage.searchAfter,
        });

        expect(secondPage.scans).to.be.an('array');

        const firstPageScanIds = firstPage.scans.map((s: any) => s.scanId);
        const secondPageScanIds = secondPage.scans.map((s: any) => s.scanId);
        const intersection = firstPageScanIds.filter((id: any) => secondPageScanIds.includes(id));
        expect(intersection).to.have.length(0);
      });
    });
  });
}
