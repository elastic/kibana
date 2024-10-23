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
import {
  CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
} from '@kbn/cloud-security-posture-plugin/common/constants';
import expect from '@kbn/expect';
import Chance from 'chance';
import { CspBenchmarkRule } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import { FtrProviderContext } from '../ftr_provider_context';
import { CspSecurityCommonProvider } from './helper/user_roles_utilites';
import { waitForPluginInitialized, EsIndexDataProvider } from '../utils';

const chance = new Chance();

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const retry = getService('retry');
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');
  const logger = getService('log');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const cspSecurity = CspSecurityCommonProvider(providerContext);
  const findingsIndex = new EsIndexDataProvider(es, LATEST_FINDINGS_INDEX_DEFAULT_NS);

  const getCspBenchmarkRules = async (benchmarkId: string): Promise<CspBenchmarkRule[]> => {
    let cspBenchmarkRules: CspBenchmarkRule[] = [];
    await retry.try(async () => {
      const cspBenchmarkRulesSavedObjects = await kibanaServer.savedObjects.find<CspBenchmarkRule>({
        type: CSP_BENCHMARK_RULE_SAVED_OBJECT_TYPE,
      });

      const requestedBenchmarkRules = cspBenchmarkRulesSavedObjects.saved_objects.filter(
        (cspBenchmarkRule: any) => cspBenchmarkRule.attributes.metadata.benchmark.id === benchmarkId
      );

      expect(requestedBenchmarkRules.length).greaterThan(0);
      cspBenchmarkRules = requestedBenchmarkRules.map((item) => item.attributes);
    });
    return cspBenchmarkRules;
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
        await findingsIndex.deleteAll();
        await kibanaServer.savedObjects.clean({
          types: ['cloud-security-posture-settings'],
        });
        await waitForPluginInitialized({ retry, logger, supertest });
      });

      afterEach(async () => {
        await findingsIndex.deleteAll();
        await kibanaServer.savedObjects.clean({
          types: ['cloud-security-posture-settings'],
        });
      });

      it('Verify cspm benchmark score is updated when muting rules', async () => {
        const benchmark = 'cis_aws';
        const benchmarkRules = await getCspBenchmarkRules(benchmark);

        const cspmFinding = getMockFinding(benchmarkRules[0], 'passed');

        await findingsIndex.addBulk([cspmFinding]);

        const { body: benchmarksBeforeMute } = await supertest
          .get('/internal/cloud_security_posture/benchmarks')
          .set(ELASTIC_HTTP_VERSION_HEADER, '2')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const scoreBeforeMute = benchmarksBeforeMute.items.find(
          (item: { id: string }) => item.id === benchmark
        );

        expect(scoreBeforeMute.score.postureScore).to.equal(100);

        await supertest
          .post(`/internal/cloud_security_posture/rules/_bulk_action`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .set('kbn-xsrf', 'xxxx')
          .send({
            action: 'mute',
            rules: [
              {
                benchmark_id: cspmFinding.rule.benchmark.id,
                benchmark_version: cspmFinding.rule.benchmark.version,
                rule_number: cspmFinding.rule.benchmark.rule_number || '',
                rule_id: cspmFinding.rule.id,
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

        expect(scoreAfterMute.score.postureScore).to.equal(0);
      });

      it('Verify kspm benchmark score is updated when muting rules', async () => {
        const benchmark = 'cis_k8s';
        const benchmarkRules = await getCspBenchmarkRules(benchmark);

        const kspmFinding = getMockFinding(benchmarkRules[0], 'passed');

        await findingsIndex.addBulk([kspmFinding]);
        const { body: benchmarksBeforeMute } = await supertest
          .get('/internal/cloud_security_posture/benchmarks')
          .set(ELASTIC_HTTP_VERSION_HEADER, '2')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const scoreBeforeMute = benchmarksBeforeMute.items.find(
          (item: { id: string }) => item.id === benchmark
        );

        expect(scoreBeforeMute.score.postureScore).to.equal(100);

        await supertest
          .post(`/internal/cloud_security_posture/rules/_bulk_action`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .set('kbn-xsrf', 'xxxx')
          .send({
            action: 'mute',
            rules: [
              {
                benchmark_id: kspmFinding.rule.benchmark.id,
                benchmark_version: kspmFinding.rule.benchmark.version,
                rule_number: kspmFinding.rule.benchmark.rule_number || '',
                rule_id: kspmFinding.rule.id,
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

        expect(scoreAfterMute.score.postureScore).to.equal(0);
      });
    });

    describe('Get Benchmark API', async () => {
      beforeEach(async () => {
        await findingsIndex.deleteAll();
        await kibanaServer.savedObjects.clean({
          types: ['cloud-security-posture-settings'],
        });
        await waitForPluginInitialized({ retry, logger, supertest });
      });

      afterEach(async () => {
        await findingsIndex.deleteAll();
        await kibanaServer.savedObjects.clean({
          types: ['cloud-security-posture-settings'],
        });
      });

      it('Calling Benchmark API as User with no read access to Security', async () => {
        const benchmark = 'cis_aws';
        const benchmarkRules = await getCspBenchmarkRules(benchmark);

        const cspmFinding1 = getMockFinding(benchmarkRules[0], 'passed');

        await findingsIndex.addBulk([cspmFinding1]);

        const { body: benchmarksResult } = await supertestWithoutAuth
          .get('/internal/cloud_security_posture/benchmarks')
          .set(ELASTIC_HTTP_VERSION_HEADER, '2')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .set('kbn-xsrf', 'xxxx')
          .auth(
            'role_security_no_read_user',
            cspSecurity.getPasswordForUser('role_security_no_read_user')
          );

        expect(benchmarksResult.statusCode).to.equal(403);
      });

      // Blocked by https://github.com/elastic/kibana/issues/188059
      it.skip('Calling Benchmark API as User with read access to Security', async () => {
        const benchmark = 'cis_aws';
        const benchmarkRules = await getCspBenchmarkRules(benchmark);

        const cspmFinding1 = getMockFinding(benchmarkRules[0], 'passed');

        await findingsIndex.addBulk([cspmFinding1]);

        const { status } = await supertestWithoutAuth
          .get('/internal/cloud_security_posture/benchmarks')
          .set(ELASTIC_HTTP_VERSION_HEADER, '2')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .set('kbn-xsrf', 'xxxx')
          .auth(
            'role_security_read_user',
            cspSecurity.getPasswordForUser('role_security_read_user')
          );
        expect(status).to.equal(200);
      });
    });
  });
}
