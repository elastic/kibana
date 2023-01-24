/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

const FINDINGS_INDEX = 'logs-cloud_security_posture.findings_latest-default';

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// TODO: update mapping for new fields

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  //   /**
  //    * required before indexing findings
  //    */
  const waitForPluginInitialized = (): Promise<void> =>
    retry.try(async () => {
      log.debug('Check CSP plugin is initialized');
      const response = await supertest
        .get('/internal/cloud_security_posture/status?check=init')
        .expect(200);
      expect(response.body).to.eql({ isPluginInitialized: true });
      log.debug('CSP plugin is initialized');
    });

  const index = {
    // remove: () => await es.indices.delete({ index: FINDINGS_INDEX, ignore_unavailable: true });
    add: async <T>(findingsMock: T[]) => {
      //   await waitForPluginInitialized();
      return await Promise.all(
        findingsMock.map((finding) => {
          es.index({
            index: FINDINGS_INDEX,
            body: finding,
          });
        })
      );
    },
  };

  describe('cloud_security_posture telemetry', async () => {
    beforeEach(async () => {
      await waitForPluginInitialized();

      await es.index({
        index: FINDINGS_INDEX,
        body: { cluster_id: '55' },
      });

      await es.deleteByQuery({ index: FINDINGS_INDEX, body: { query: { match_all: {} } } });

      await es.indices.putMapping({
        index: FINDINGS_INDEX,
        properties: {
          'rule.benchmark.posture_type': {
            type: 'keyword',
          },
          'cloud.account.id': {
            type: 'keyword',
          },
        },
      });
    });

    afterEach(async () => {
      await es.indices.delete({ index: FINDINGS_INDEX, ignore_unavailable: true });
    });

    it('should return the correct payload when there is only CSPM data', async () => {
      await index.add(onlyCspm);

      await sleep(1000);
      const {
        body: [{ stats: apiResponse }],
      } = await supertest
        .post(`/api/telemetry/v2/clusters/_stats`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          unencrypted: true,
          refreshCache: true,
        })
        .expect(200);

      expect(apiResponse.stack_stats.kibana.plugins.cloud_security_posture.accounts_stats).to.eql([
        {
          account_id: 'my_aws_account',
          latest_findings_doc_count: 2,
          posture_score: 50,
          passed_findings_count: 1,
          failed_findings_count: 1,
          benchmark_name: 'CIS Amazon Web Services Foundations',
          benchmark_id: 'cis_aws',
          benchmark_version: 'v1.5.0',
          agents_count: 1,
          nodes_count: 1,
          pods_count: 0,
        },
        {
          account_id: '55',
          latest_findings_doc_count: 1,
          posture_score: null,
          passed_findings_count: 0,
          failed_findings_count: 0,
          benchmark_name: null,
          benchmark_id: null,
          benchmark_version: null,
          agents_count: 0,
          nodes_count: 0,
          pods_count: 0,
        },
      ]);

      expect(apiResponse.stack_stats.kibana.plugins.cloud_security_posture.resources_stats).to.eql([
        {
          account_id: 'my_aws_account',
          resource_type: 'identifyingType',
          resource_type_doc_count: 2,
          resource_sub_type: 'aws-password-policy',
          resource_sub_type_doc_count: 2,
          passed_findings_count: 1,
          failed_findings_count: 1,
        },
      ]);
    });

    it('only kspm, no posture_type field exists', async () => {
      await index.add(onlyKspmNoPostureType);

      await sleep(1000);
      const {
        body: [{ stats: apiResponse }],
      } = await supertest
        .post(`/api/telemetry/v2/clusters/_stats`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          unencrypted: true,
          refreshCache: true,
        })
        .expect(200);

      console.log(apiResponse.stack_stats.kibana.plugins.cloud_security_posture.accounts_stats);

      console.log(apiResponse.stack_stats.kibana.plugins.cloud_security_posture.resources_stats);

      expect(apiResponse.stack_stats.kibana.plugins.cloud_security_posture.accounts_stats).to.eql([
        {
          account_id: 'my_cluster_id',
          latest_findings_doc_count: 2,
          posture_score: 100,
          passed_findings_count: 2,
          failed_findings_count: 0,
          benchmark_name: 'CIS Kubernetes V1.23',
          benchmark_id: 'cis_k8s',
          benchmark_version: 'v1.0.0',
          agents_count: 2,
          nodes_count: 2,
          pods_count: 0,
        },
        {
          account_id: '55',
          latest_findings_doc_count: 1,
          posture_score: null,
          passed_findings_count: 0,
          failed_findings_count: 0,
          benchmark_name: null,
          benchmark_id: null,
          benchmark_version: null,
          agents_count: 0,
          nodes_count: 0,
          pods_count: 0,
        },
      ]);

      expect(apiResponse.stack_stats.kibana.plugins.cloud_security_posture.resources_stats).to.eql([
        {
          account_id: 'my_cluster_id',
          resource_type: 'k8s_object',
          resource_type_doc_count: 1,
          resource_sub_type: 'ServiceAccount',
          resource_sub_type_doc_count: 1,
          passed_findings_count: 1,
          failed_findings_count: 0,
        },
        {
          account_id: 'my_cluster_id',
          resource_type: 'process',
          resource_type_doc_count: 1,
          resource_sub_type: 'process',
          resource_sub_type_doc_count: 1,
          passed_findings_count: 1,
          failed_findings_count: 0,
        },
      ]);
    });
  });
}

const onlyCspm = [
  {
    rule: {
      benchmark: {
        id: 'cis_aws',
        posture_type: 'cspm',
        version: 'v1.5.0',
        name: 'CIS Amazon Web Services Foundations',
      },
    },
    resource: {
      type: 'identifyingType',
      sub_type: 'aws-password-policy',
      id: '15e450b7-8980-5bca-ade2-a0c795f9ea9d',
    },
    agent: { id: '07bd3686-98ef-4b23-99cb-9ff544b25ae2' },
    result: { evaluation: 'failed' },
    cloud: { account: { id: 'my_aws_account' } },
    host: { name: 'docker-fleet-agent' },
  },
  {
    rule: {
      benchmark: {
        id: 'cis_aws',
        posture_type: 'cspm',
        version: 'v1.5.0',
        name: 'CIS Amazon Web Services Foundations',
      },
    },
    resource: {
      type: 'identifyingType',
      sub_type: 'aws-password-policy',
      id: '15e450b7-8980-5bca-ade2-a0c795f9ea99',
    },
    agent: { id: '07bd3686-98ef-4b23-99cb-9ff544b25ae2' },
    result: { evaluation: 'passed' },
    cloud: { account: { id: 'my_aws_account' } },
    host: { name: 'docker-fleet-agent' },
  },
];

const onlyKspmNoPostureType = [
  {
    cluster_id: 'my_cluster_id',
    rule: {
      benchmark: {
        id: 'cis_k8s',
        version: 'v1.0.0',
        name: 'CIS Kubernetes V1.23',
      },
    },
    resource: {
      type: 'k8s_object',
      sub_type: 'ServiceAccount',
      id: 1111,
    },
    agent: { id: '07bd3686-98ef-4b23-99cb-9ff544b25ae2' },
    result: { evaluation: 'passed' },
    host: { name: 'docker-fleet-agent' },
  },
  {
    cluster_id: 'my_cluster_id',
    rule: {
      benchmark: {
        id: 'cis_k8s',
        version: 'v1.0.0',
        name: 'CIS Kubernetes V1.23',
      },
    },
    resource: {
      type: 'process',
      sub_type: 'process',
      id: 1111,
    },
    agent: { id: '07bd3686-98ef-4b23-99cb-9ff544b25ae3' },
    result: { evaluation: 'passed' },
    host: { name: 'control-plane' },
  },
];
