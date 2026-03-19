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
  slo: {
    id: string;
    revision: number;
    name: string;
    enabled: boolean;
  };
  health: {
    isProblematic: boolean;
    rollup: {
      isProblematic: boolean;
      missing: boolean;
      status: string;
      state: string;
    };
    summary: {
      isProblematic: boolean;
      missing: boolean;
      status: string;
      state: string;
    };
  };
}

function createHealthDocument(
  overrides: Partial<Omit<HealthDocument, 'slo'>> & { slo?: Partial<HealthDocument['slo']> } = {}
): HealthDocument {
  const { slo, ...rest } = overrides;
  return {
    '@timestamp': new Date().toISOString(),
    scanId: v7(),
    spaceId: 'default',
    slo: {
      id: v4(),
      revision: 1,
      name: 'Test SLO',
      enabled: true,
      ...slo,
    },
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
    ...rest,
  };
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const sloApi = getService('sloApi');
  const samlAuth = getService('samlAuth');
  const retry = getService('retry');

  let adminRoleAuthc: RoleCredentials;

  // Failing: See https://github.com/elastic/kibana/issues/251364
  describe.skip('Health Scan', function () {
    before(async () => {
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      await Promise.all([
        esClient.deleteByQuery({
          index: HEALTH_DATA_STREAM_NAME,
          query: { match_all: {} },
          refresh: true,
          ignore_unavailable: true,
        }),
        esClient.deleteByQuery({
          index: '.kibana_task_manager',
          query: { term: { 'task.taskType': 'slo:health-scan-task' } },
          refresh: true,
          wait_for_completion: true,
        }),
      ]);
    });

    after(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(adminRoleAuthc);
    });

    afterEach(async () => {
      await Promise.all([
        esClient.deleteByQuery({
          index: HEALTH_DATA_STREAM_NAME,
          query: { match_all: {} },
          refresh: true,
          ignore_unavailable: true,
        }),
        esClient.deleteByQuery({
          index: '.kibana_task_manager',
          query: { term: { 'task.taskType': 'slo:health-scan-task' } },
          refresh: true,
          wait_for_completion: true,
        }),
      ]);
    });

    describe('POST /internal/observability/slos/_health/scans', () => {
      it('schedules a new health scan and returns scheduled status', async () => {
        const response = await sloApi.scheduleHealthScan(adminRoleAuthc, { force: true });

        expect(response).to.have.property('scanId');
        expect(response).to.have.property('scheduledAt');
        expect(response.status).to.eql('scheduled');
      });

      it('returns existing scan when recent scan exists within 1h', async () => {
        const firstResponse = await sloApi.scheduleHealthScan(adminRoleAuthc, { force: true });
        expect(firstResponse).to.have.property('scanId');

        await retry.tryWithRetries(
          'return existing scan',
          async () => {
            const secondResponse = await sloApi.scheduleHealthScan(adminRoleAuthc);
            expect(secondResponse.scanId).to.eql(firstResponse.scanId);
          },
          { timeout: 5000, retryCount: 5 }
        );
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
        expect(response.scan).to.have.property('status');
      });

      it('returns health documents filtered by scanId', async () => {
        const docs = [
          createHealthDocument({ scanId: testScanId, slo: { id: 'slo-1' } }),
          createHealthDocument({ scanId: testScanId, slo: { id: 'slo-2' } }),
          createHealthDocument({ scanId: 'other-scan-id', slo: { id: 'slo-3' } }),
        ];

        await esClient.bulk({
          operations: docs.flatMap((doc) => [{ create: { _index: HEALTH_DATA_STREAM_NAME } }, doc]),
          refresh: true,
        });

        const response = await sloApi.getHealthScanResults(testScanId, adminRoleAuthc, {});

        expect(response.results).to.be.an('array');
        expect(response.results).to.have.length(2);
        expect(response.total).to.eql(2);
        expect(response.scan).to.have.property('status');

        const sloIds = response.results.map((r: any) => r.slo.id);
        expect(sloIds).to.contain('slo-1');
        expect(sloIds).to.contain('slo-2');
        expect(sloIds).to.not.contain('slo-3');
      });

      it('filters by problematic flag', async () => {
        const docs = [
          createHealthDocument({
            scanId: testScanId,
            slo: { id: 'healthy-slo' },
          }),
          createHealthDocument({
            scanId: testScanId,
            slo: { id: 'problematic-slo' },
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
        expect(response.results[0].slo.id).to.eql('problematic-slo');
        expect(response.results[0].health.isProblematic).to.eql(true);
      });

      it('supports pagination via size and searchAfter', async () => {
        const docs = Array.from({ length: 5 }, (_, i) =>
          createHealthDocument({
            scanId: testScanId,
            slo: { id: `slo-${i + 1}` },
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
        expect(firstPage.scan).to.have.property('status');

        const secondPage = await sloApi.getHealthScanResults(testScanId, adminRoleAuthc, {
          size: 2,
          searchAfter: JSON.stringify(firstPage.searchAfter),
        });

        expect(secondPage.results).to.have.length(2);

        const firstPageSloIds = firstPage.results.map((r: any) => r.slo.id);
        const secondPageSloIds = secondPage.results.map((r: any) => r.slo.id);
        const intersection = firstPageSloIds.filter((id: any) => secondPageSloIds.includes(id));
        expect(intersection).to.have.length(0);
      });

      it('filters by spaceId when allSpaces is false', async () => {
        const docs = [
          createHealthDocument({
            scanId: testScanId,
            slo: { id: 'default-space-slo' },
            spaceId: 'default',
          }),
          createHealthDocument({
            scanId: testScanId,
            slo: { id: 'other-space-slo' },
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
        expect(response.results[0].slo.id).to.eql('default-space-slo');
      });

      it('returns all spaces when allSpaces is true', async () => {
        const docs = [
          createHealthDocument({
            scanId: testScanId,
            slo: { id: 'default-space-slo' },
            spaceId: 'default',
          }),
          createHealthDocument({
            scanId: testScanId,
            slo: { id: 'other-space-slo' },
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
        const sloIds = response.results.map((r: any) => r.slo.id);
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
            slo: { id: 'scan1-slo1' },
          }),
          createHealthDocument({
            scanId: testScanIds[0],
            slo: { id: 'scan1-slo2' },
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
          // Scan 2: 3 SLOs, 0 problematic
          createHealthDocument({
            scanId: testScanIds[1],
            slo: { id: 'scan2-slo1' },
          }),
          createHealthDocument({
            scanId: testScanIds[1],
            slo: { id: 'scan2-slo2' },
          }),
          createHealthDocument({
            scanId: testScanIds[1],
            slo: { id: 'scan2-slo3' },
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
        expect(scan1!.status).to.be.a('string');

        expect(scan2).to.be.ok();
        expect(scan2!.total).to.eql(3);
        expect(scan2!.problematic).to.eql(0);
        expect(scan2!.status).to.be.a('string');
      });

      it('respects size parameter', async () => {
        const docs = testScanIds.map((scanId, i) =>
          createHealthDocument({
            scanId,
            slo: { id: `pagination-slo-${i}` },
            '@timestamp': new Date(Date.now() - i * 1000).toISOString(),
          })
        );

        await esClient.bulk({
          operations: docs.flatMap((doc) => [{ create: { _index: HEALTH_DATA_STREAM_NAME } }, doc]),
          refresh: true,
        });

        const response = await sloApi.listHealthScans(adminRoleAuthc, { size: 2 });

        expect(response.scans).to.be.an('array');
        expect(response.scans.length).to.eql(2);
        response.scans.forEach((scan: any) => {
          expect(scan).to.have.property('status');
        });
      });
    });
  });
}
