/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import {
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
} from '@kbn/cloud-security-posture-plugin/common/constants';
import {
  BenchmarkData,
  Cluster,
  ComplianceDashboardData,
  ComplianceDashboardDataV2,
  PostureTrend,
} from '@kbn/cloud-security-posture-plugin/common/types_old';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';
import {
  getBenchmarkScoreMockData,
  kspmComplianceDashboardDataMockV1,
  kspmComplianceDashboardDataMockV2,
  cspmComplianceDashboardDataMockV1,
  cspmComplianceDashboardDataMockV2,
} from './mocks/benchmark_score_mock';
import { findingsMockData } from './mocks/findings_mock';
import { CspSecurityCommonProvider } from './helper/user_roles_utilites';
import { waitForPluginInitialized, EsIndexDataProvider } from '../utils';

const removeRealtimeCalculatedFields = (trends: PostureTrend[]) => {
  return trends.map((trend: PostureTrend) => {
    const { timestamp, ...rest } = trend;
    return rest;
  });
};

const removeRealtimeClusterFields = (clusters: Cluster[]) =>
  clusters.flatMap((cluster) => {
    const clusterWithoutTrend = {
      ...cluster,
      trend: removeRealtimeCalculatedFields(cluster.trend),
    };
    const { lastUpdate, ...clusterWithoutTime } = clusterWithoutTrend.meta;

    return { ...clusterWithoutTrend, meta: clusterWithoutTime };
  });

const removeRealtimeBenchmarkFields = (benchmarks: BenchmarkData[]) =>
  benchmarks.flatMap((benchmark) => ({
    ...benchmark,
    trend: removeRealtimeCalculatedFields(benchmark.trend),
  }));

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const kibanaHttpClient = getService('supertest');

  const retry = getService('retry');
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const cspSecurity = CspSecurityCommonProvider(providerContext);
  const findingsIndex = new EsIndexDataProvider(es, LATEST_FINDINGS_INDEX_DEFAULT_NS);
  const benchmarkScoreIndex = new EsIndexDataProvider(es, BENCHMARK_SCORE_INDEX_DEFAULT_NS);

  describe('GET /internal/cloud_security_posture/stats', () => {
    describe('CSPM Compliance Dashboard Stats API', async () => {
      beforeEach(async () => {
        await findingsIndex.deleteAll();
        await benchmarkScoreIndex.deleteAll();

        await waitForPluginInitialized({ retry, logger: log, supertest });
        await benchmarkScoreIndex.addBulk(getBenchmarkScoreMockData('cspm', true));
        await findingsIndex.addBulk([findingsMockData[1]]);
      });

      afterEach(async () => {
        await findingsIndex.deleteAll();
        await benchmarkScoreIndex.deleteAll();
      });

      it('should return CSPM cluster V1 ', async () => {
        const { body: res }: { body: ComplianceDashboardData } = await kibanaHttpClient
          .get(`/internal/cloud_security_posture/stats/cspm`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        const resClusters = removeRealtimeClusterFields(res.clusters);
        const trends = removeRealtimeCalculatedFields(res.trend);

        expect({
          ...res,
          clusters: resClusters,
          trend: trends,
        }).to.eql(cspmComplianceDashboardDataMockV1);
      });

      it('should return CSPM benchmarks V2 ', async () => {
        const { body: res }: { body: ComplianceDashboardDataV2 } = await kibanaHttpClient
          .get(`/internal/cloud_security_posture/stats/cspm`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '2')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const resBenchmarks = removeRealtimeBenchmarkFields(res.benchmarks);

        const trends = removeRealtimeCalculatedFields(res.trend);

        expect({
          ...res,
          benchmarks: resBenchmarks,
          trend: trends,
        }).to.eql(cspmComplianceDashboardDataMockV2);
      });
    });

    describe('KSPM Compliance Dashboard Stats API', async () => {
      beforeEach(async () => {
        await findingsIndex.deleteAll();
        await benchmarkScoreIndex.deleteAll();

        await waitForPluginInitialized({ retry, logger: log, supertest });
        await benchmarkScoreIndex.addBulk(getBenchmarkScoreMockData('kspm', true));
        await findingsIndex.addBulk([findingsMockData[0]]);
      });

      afterEach(async () => {
        await findingsIndex.deleteAll();
        await benchmarkScoreIndex.deleteAll();
      });

      it('should return KSPM clusters V1 ', async () => {
        const { body: res }: { body: ComplianceDashboardData } = await kibanaHttpClient
          .get(`/internal/cloud_security_posture/stats/kspm`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const resClusters = removeRealtimeClusterFields(res.clusters);
        const trends = removeRealtimeCalculatedFields(res.trend);

        expect({
          ...res,
          clusters: resClusters,
          trend: trends,
        }).to.eql(kspmComplianceDashboardDataMockV1);
      });

      it('should return KSPM benchmarks V2', async () => {
        const { body: res }: { body: ComplianceDashboardDataV2 } = await kibanaHttpClient
          .get(`/internal/cloud_security_posture/stats/kspm`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '2')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const resBenchmarks = removeRealtimeBenchmarkFields(res.benchmarks);

        const trends = removeRealtimeCalculatedFields(res.trend);

        expect({
          ...res,
          benchmarks: resBenchmarks,
          trend: trends,
        }).to.eql(kspmComplianceDashboardDataMockV2);
      });

      it('should return KSPM benchmarks V2', async () => {
        const { body: res }: { body: ComplianceDashboardDataV2 } = await kibanaHttpClient
          .get(`/internal/cloud_security_posture/stats/kspm`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '2')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const resBenchmarks = removeRealtimeBenchmarkFields(res.benchmarks);

        const trends = removeRealtimeCalculatedFields(res.trend);

        expect({
          ...res,
          benchmarks: resBenchmarks,
          trend: trends,
        }).to.eql(kspmComplianceDashboardDataMockV2);
      });
    });

    describe('Compliance dashboard based on enabled rules', async () => {
      beforeEach(async () => {
        await findingsIndex.deleteAll();
        await benchmarkScoreIndex.deleteAll();

        await waitForPluginInitialized({ retry, logger: log, supertest });
      });

      afterEach(async () => {
        await findingsIndex.deleteAll();
        await benchmarkScoreIndex.deleteAll();
      });

      it('should calculate cspm benchmarks posture score based only on enabled rules', async () => {
        await benchmarkScoreIndex.addBulk([
          ...getBenchmarkScoreMockData('cspm', true),
          ...getBenchmarkScoreMockData('cspm', false),
        ]);
        await findingsIndex.addBulk([findingsMockData[1]]);

        const { body: res }: { body: ComplianceDashboardDataV2 } = await kibanaHttpClient
          .get(`/internal/cloud_security_posture/stats/cspm`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '2')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const resBenchmarks = removeRealtimeBenchmarkFields(res.benchmarks);

        const trends = removeRealtimeCalculatedFields(res.trend);

        expect({
          ...res,
          benchmarks: resBenchmarks,
          trend: trends,
        }).to.eql(cspmComplianceDashboardDataMockV2);
      });

      it('should calculate kspm benchmarks posture score based only on enabled rules', async () => {
        await benchmarkScoreIndex.addBulk([
          ...getBenchmarkScoreMockData('kspm', true),
          ...getBenchmarkScoreMockData('kspm', false),
        ]);
        await findingsIndex.addBulk([findingsMockData[0]]);

        const { body: res }: { body: ComplianceDashboardDataV2 } = await kibanaHttpClient
          .get(`/internal/cloud_security_posture/stats/kspm`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '2')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const resBenchmarks = removeRealtimeBenchmarkFields(res.benchmarks);

        const trends = removeRealtimeCalculatedFields(res.trend);

        expect({
          ...res,
          benchmarks: resBenchmarks,
          trend: trends,
        }).to.eql(kspmComplianceDashboardDataMockV2);
      });
    });

    describe('GET stats API with user that has specific access', async () => {
      beforeEach(async () => {
        await findingsIndex.deleteAll();
        await benchmarkScoreIndex.deleteAll();

        await waitForPluginInitialized({ retry, logger: log, supertest });
      });

      afterEach(async () => {
        await findingsIndex.deleteAll();
        await benchmarkScoreIndex.deleteAll();
      });

      it('GET stats API V1 with user with read access', async () => {
        await benchmarkScoreIndex.addBulk([
          ...getBenchmarkScoreMockData('cspm', true),
          ...getBenchmarkScoreMockData('cspm', false),
        ]);
        await findingsIndex.addBulk([findingsMockData[1]]);

        const { status } = await supertestWithoutAuth
          .get(`/internal/cloud_security_posture/stats/cspm`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'xxxx')
          .auth(
            'role_security_read_user',
            cspSecurity.getPasswordForUser('role_security_read_user')
          );
        expect(status).to.be(200);
      });

      it('GET stats API V2 with user with read access', async () => {
        await benchmarkScoreIndex.addBulk([
          ...getBenchmarkScoreMockData('cspm', true),
          ...getBenchmarkScoreMockData('cspm', false),
        ]);
        await findingsIndex.addBulk([findingsMockData[1]]);

        const { status } = await supertestWithoutAuth
          .get(`/internal/cloud_security_posture/stats/cspm`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '2')
          .set('kbn-xsrf', 'xxxx')
          .auth(
            'role_security_read_user',
            cspSecurity.getPasswordForUser('role_security_read_user')
          );
        expect(status).to.be(200);
      });

      it('GET stats API V2 with user without read access', async () => {
        await benchmarkScoreIndex.addBulk([
          ...getBenchmarkScoreMockData('kspm', true),
          ...getBenchmarkScoreMockData('kspm', false),
        ]);
        await findingsIndex.addBulk([findingsMockData[0]]);

        const { status } = await supertestWithoutAuth
          .get(`/internal/cloud_security_posture/stats/kspm`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '2')
          .set('kbn-xsrf', 'xxxx')
          .auth(
            'role_security_no_read_user',
            cspSecurity.getPasswordForUser('role_security_no_read_user')
          );
        expect(status).to.be(403);
      });
    });
  });
}
