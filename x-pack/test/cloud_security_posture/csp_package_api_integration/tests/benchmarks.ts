/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE } from '@kbn/cloud-security-posture-plugin/common/constants';
import expect from '@kbn/expect';
import Chance from 'chance';
import { CspBenchmarkRule } from '@kbn/cloud-security-posture-plugin/common/types/latest';
import { ApiIntegrationFtrProviderContext } from '../../common/ftr_provider_context';
import { addIndexDocs, deleteExistingIndexByQuery } from '../../common/utils/index_api_helpers';
import { FINDINGS_LATEST_INDEX } from '../../common/utils/indices';
import { setupCSPPackage } from '../../common/utils/csp_package_helpers';

const chance = new Chance();

// eslint-disable-next-line import/no-default-export
export default function (providerContext: ApiIntegrationFtrProviderContext) {
  const { getService } = providerContext;

  const retry = getService('retry');
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');
  const log = getService('log');

  const getCspBenchmarkRules = async (benchmarkId: string): Promise<CspBenchmarkRule[]> => {
    const cspBenchmarkRules = await kibanaServer.savedObjects.find<CspBenchmarkRule>({
      type: CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
    });
    const requestedBenchmarkRules = cspBenchmarkRules.saved_objects.filter(
      (cspBenchmarkRule) => cspBenchmarkRule.attributes.metadata.benchmark.id === benchmarkId
    );
    expect(requestedBenchmarkRules.length).greaterThan(0);

    return requestedBenchmarkRules.map((item) => item.attributes);
  };

  const getMockFinding = (rule: CspBenchmarkRule, evaluation: string) => ({
    '@timestamp': '2023-06-29T02:08:44.993Z',
    resource: {
      id: chance.guid(),
      name: `kubelet`,
      sub_type: 'lower case sub type',
      type: 'k8s_resource_type',
    },
    cloud: {
      account: { id: 'Another Upper case account id' },
    },
    result: { evaluation },
    rule: {
      name: 'Upper case rule name',
      id: rule.metadata.id,
      section: 'Upper case section',
      benchmark: {
        id: rule.metadata.benchmark.id,
        posture_type: rule.metadata.benchmark.posture_type,
        name: rule.metadata.benchmark.name,
        version: rule.metadata.benchmark.version,
        rule_number: rule.metadata.benchmark.rule_number,
      },
    },
    orchestrator: {
      cluster: { id: 'Upper case cluster id' },
    },
  });

  describe('GET /internal/cloud_security_posture/benchmarks', () => {
    describe('Get Benchmark API', async () => {
      beforeEach(async () => {
        await deleteExistingIndexByQuery(es, FINDINGS_LATEST_INDEX);
        await kibanaServer.savedObjects.clean({
          types: ['cloud-security-posture-settings'],
        });
        /**
         * required before indexing findings
         */
        await setupCSPPackage(retry, log, supertest);
      });

      it('Verify cspm benchmark score is updated when muting rules', async () => {
        const benchmark = 'cis_aws';
        const benchmarkRules = await getCspBenchmarkRules(benchmark);

        const cspmFinding1 = getMockFinding(benchmarkRules[0], 'passed');
        const cspmFinding2 = getMockFinding(benchmarkRules[1], 'failed');

        await addIndexDocs(es, [cspmFinding1, cspmFinding2], FINDINGS_LATEST_INDEX);

        const { body: benchmarksBeforeMute } = await supertest
          .get('/internal/cloud_security_posture/benchmarks')
          .set(ELASTIC_HTTP_VERSION_HEADER, '2')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const scoreBeforeMute = benchmarksBeforeMute.items.find(
          (item: { id: string }) => item.id === benchmark
        );

        expect(scoreBeforeMute.score.postureScore).to.equal(50);

        await supertest
          .post(`/internal/cloud_security_posture/rules/_bulk_action`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .set('kbn-xsrf', 'xxxx')
          .send({
            action: 'mute',
            rules: [
              {
                benchmark_id: cspmFinding2.rule.benchmark.id,
                benchmark_version: cspmFinding2.rule.benchmark.version,
                rule_number: cspmFinding2.rule.benchmark.rule_number || '',
                rule_id: cspmFinding2.rule.id,
              },
            ],
          })
          .expect(200);

        const { body: benchmarksAfterMute } = await supertest
          .get('/internal/cloud_security_posture/benchmarks')
          .set(ELASTIC_HTTP_VERSION_HEADER, '2')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const scoreAfterMute = benchmarksAfterMute.items.find(
          (item: { id: string }) => item.id === benchmark
        );

        expect(scoreAfterMute.score.postureScore).to.equal(100);
      });

      it('Verify kspm benchmark score is updated when muting rules', async () => {
        const benchmark = 'cis_k8s';
        const benchmarkRules = await getCspBenchmarkRules(benchmark);

        const kspmFinding1 = getMockFinding(benchmarkRules[0], 'passed');
        const kspmFinding2 = getMockFinding(benchmarkRules[1], 'failed');

        await addIndexDocs(es, [kspmFinding1, kspmFinding2], FINDINGS_LATEST_INDEX);
        const { body: benchmarksBeforeMute } = await supertest
          .get('/internal/cloud_security_posture/benchmarks')
          .set(ELASTIC_HTTP_VERSION_HEADER, '2')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const scoreBeforeMute = benchmarksBeforeMute.items.find(
          (item: { id: string }) => item.id === benchmark
        );

        expect(scoreBeforeMute.score.postureScore).to.equal(50);

        await supertest
          .post(`/internal/cloud_security_posture/rules/_bulk_action`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .set('kbn-xsrf', 'xxxx')
          .send({
            action: 'mute',
            rules: [
              {
                benchmark_id: kspmFinding2.rule.benchmark.id,
                benchmark_version: kspmFinding2.rule.benchmark.version,
                rule_number: kspmFinding2.rule.benchmark.rule_number || '',
                rule_id: kspmFinding2.rule.id,
              },
            ],
          })
          .expect(200);

        const { body: benchmarksAfterMute } = await supertest
          .get('/internal/cloud_security_posture/benchmarks')
          .set(ELASTIC_HTTP_VERSION_HEADER, '2')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const scoreAfterMute = benchmarksAfterMute.items.find(
          (item: { id: string }) => item.id === benchmark
        );

        expect(scoreAfterMute.score.postureScore).to.equal(100);
      });
    });
  });
}
