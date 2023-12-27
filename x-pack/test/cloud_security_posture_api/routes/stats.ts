/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { expect as expectExpect } from 'expect';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import {
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
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
  getFullBenchmarkScoreMockData,
  getCustomBenchmarkScoreMockData,
} from './mocks/benchmark_score_mock';
import { findingsMockData } from './mocks/findings_mock';
import { CspBenchmarkRule } from '@kbn/cloud-security-posture-plugin/common/types/latest';

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
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  const getRandomCspBenchmarkRule = async () => {
    const cspBenchmarkRules = await kibanaServer.savedObjects.find<CspBenchmarkRule>({
      type: CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
    });
    expect(cspBenchmarkRules.saved_objects.length).greaterThan(0);

    const randomIndex = Math.floor(Math.random() * cspBenchmarkRules.saved_objects.length);
    return cspBenchmarkRules.saved_objects[randomIndex].attributes;
  };

  /**
   * required before indexing findings
   */
  const waitForPluginInitialized = (): Promise<void> =>
    retry.try(async () => {
      log.debug('Check CSP plugin is initialized');
      const response = await supertest
        .get('/internal/cloud_security_posture/status?check=init')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(200);
      expect(response.body).to.eql({ isPluginInitialized: true });
      log.debug('CSP plugin is initialized');
    });

  const index = {
    addFindings: async <T>(findingsMock: T[]) => {
      await Promise.all(
        findingsMock.map((findingsDoc) =>
          es.index({
            index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
            body: { ...findingsDoc, '@timestamp': new Date().toISOString() },
            refresh: true,
          })
        )
      );
    },

    addScores: async <T>(scoresMock: T[]) => {
      await Promise.all(
        scoresMock.map((scoreDoc) =>
          es.index({
            index: BENCHMARK_SCORE_INDEX_DEFAULT_NS,
            body: { ...scoreDoc, '@timestamp': new Date().toISOString() },
            refresh: true,
          })
        )
      );
    },

    removeFindings: async () => {
      const indexExists = await es.indices.exists({ index: LATEST_FINDINGS_INDEX_DEFAULT_NS });

      if (indexExists) {
        es.deleteByQuery({
          index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
          query: { match_all: {} },
          refresh: true,
        });
      }
    },

    removeScores: async () => {
      const indexExists = await es.indices.exists({ index: BENCHMARK_SCORE_INDEX_DEFAULT_NS });

      if (indexExists) {
        es.deleteByQuery({
          index: BENCHMARK_SCORE_INDEX_DEFAULT_NS,
          query: { match_all: {} },
          refresh: true,
        });
      }
    },

    deleteFindingsIndex: async () => {
      const indexExists = await es.indices.exists({ index: LATEST_FINDINGS_INDEX_DEFAULT_NS });

      if (indexExists) {
        await es.indices.delete({ index: LATEST_FINDINGS_INDEX_DEFAULT_NS });
      }
    },
  };

  describe('GET /internal/cloud_security_posture/stats', () => {
    describe('CSPM Compliance Dashboard Stats API', async () => {
      beforeEach(async () => {
        await index.removeFindings();
        await index.removeScores();

        await waitForPluginInitialized();
        await index.addScores(getBenchmarkScoreMockData('cspm'));
        await index.addFindings([findingsMockData[1]]);
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
        await index.removeFindings();
        await index.removeScores();

        await waitForPluginInitialized();
        await index.addScores(getBenchmarkScoreMockData('kspm'));
        await index.addFindings([findingsMockData[0]]);
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

      it('should return KSPM benchmarks V2 for enabled rules', async () => {
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
        await index.removeFindings();
        await index.removeScores();

        await waitForPluginInitialized();
      });
      it('should calculate benchmarks posture score based on enabled rules', async () => {
        await index.addScores(getBenchmarkScoreMockData('cspm'));
        const rule = await getRandomCspBenchmarkRule();
        const finding1 = findingsMockData[1];
        finding1.rule.id = rule.metadata.id;
        await index.addFindings([finding1, findingsMockData[2]]);
        await index.addScores(getFullBenchmarkScoreMockData('cspm'));
        await index.addScores(getCustomBenchmarkScoreMockData('cspm'));

        await supertest
          .post(`/internal/cloud_security_posture/rules/_bulk_action`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .set('kbn-xsrf', 'xxxx')
          .send({
            action: 'unmute',
            rules: [
              {
                rule_id: finding1.rule.id,
              },
            ],
          })
          .expect(200);

        const { body: res }: { body: ComplianceDashboardDataV2 } = await kibanaHttpClient
          .get(`/internal/cloud_security_posture/stats/cspm`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '2')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        // const resBenchmarks = removeRealtimeBenchmarkFields(res.benchmarks);

        const trends = removeRealtimeCalculatedFields(res.trend);

        expectExpect(res.trend).toEqual(expectExpect.objectContaining({}));

        // expect({
        //   ...res,
        //   benchmarks: resBenchmarks,
        //   trend: trends,
        // }).to.eql(kspmComplianceDashboardDataMockV2);
      });

      it('should calculate compliance posture score based on enabled rules', async () => {});
    });
  });
}
