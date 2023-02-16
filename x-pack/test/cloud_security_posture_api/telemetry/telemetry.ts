/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { data, MockTelemetryFindings } from './data';
import type { FtrProviderContext } from '../ftr_provider_context';

const FINDINGS_INDEX = 'logs-cloud_security_posture.findings_latest-default';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  /**
   * required before indexing findings
   */
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
    remove: () =>
      es.deleteByQuery({
        index: FINDINGS_INDEX,
        query: { match_all: {} },
        refresh: true,
      }),

    add: async (mockTelemetryFindings: MockTelemetryFindings[]) => {
      const operations = mockTelemetryFindings.flatMap((doc) => [
        { index: { _index: FINDINGS_INDEX } },
        doc,
      ]);

      const response = await es.bulk({ refresh: 'wait_for', index: FINDINGS_INDEX, operations });
      expect(response.errors).to.eql(false);
    },
  };

  describe('Verify cloud_security_posture telemetry payloads', async () => {
    before(async () => {
      await waitForPluginInitialized();
    });

    afterEach(async () => {
      await index.remove();
    });

    it('includes only KSPM findings', async () => {
      await index.add(data.kspmFindings);

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
          account_id: 'my-k8s-cluster-5555',
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
      ]);
      expect(apiResponse.stack_stats.kibana.plugins.cloud_security_posture.resources_stats).to.eql([
        {
          account_id: 'my-k8s-cluster-5555',
          resource_type: 'k8s_object',
          resource_type_doc_count: 1,
          resource_sub_type: 'ServiceAccount',
          resource_sub_type_doc_count: 1,
          passed_findings_count: 1,
          failed_findings_count: 0,
        },
        {
          account_id: 'my-k8s-cluster-5555',
          resource_type: 'process',
          resource_type_doc_count: 1,
          resource_sub_type: 'process',
          resource_sub_type_doc_count: 1,
          passed_findings_count: 1,
          failed_findings_count: 0,
        },
      ]);
    });

    it('includes only CSPM findings', async () => {
      await index.add(data.cspmFindings);

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
          account_id: 'my-aws-12345',
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
      ]);

      expect(apiResponse.stack_stats.kibana.plugins.cloud_security_posture.resources_stats).to.eql([
        {
          account_id: 'my-aws-12345',
          resource_type: 'identifyingType',
          resource_type_doc_count: 2,
          resource_sub_type: 'aws-password-policy',
          resource_sub_type_doc_count: 2,
          passed_findings_count: 1,
          failed_findings_count: 1,
        },
      ]);
    });

    it('includes CSPM and KSPM findings', async () => {
      await index.add(data.kspmFindings);
      await index.add(data.cspmFindings);

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
          account_id: 'my-aws-12345',
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
          account_id: 'my-k8s-cluster-5555',
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
      ]);

      expect(apiResponse.stack_stats.kibana.plugins.cloud_security_posture.resources_stats).to.eql([
        {
          account_id: 'my-aws-12345',
          resource_type: 'identifyingType',
          resource_type_doc_count: 2,
          resource_sub_type: 'aws-password-policy',
          resource_sub_type_doc_count: 2,
          passed_findings_count: 1,
          failed_findings_count: 1,
        },
        {
          account_id: 'my-k8s-cluster-5555',
          resource_type: 'k8s_object',
          resource_type_doc_count: 1,
          resource_sub_type: 'ServiceAccount',
          resource_sub_type_doc_count: 1,
          passed_findings_count: 1,
          failed_findings_count: 0,
        },
        {
          account_id: 'my-k8s-cluster-5555',
          resource_type: 'process',
          resource_type_doc_count: 1,
          resource_sub_type: 'process',
          resource_sub_type_doc_count: 1,
          passed_findings_count: 1,
          failed_findings_count: 0,
        },
      ]);
    });

    it('includes only KSPM findings without posture_type', async () => {
      await index.add(data.kspmFindingsNoPostureType);

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
          account_id: 'my-k8s-cluster-5555',
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
      ]);

      expect(apiResponse.stack_stats.kibana.plugins.cloud_security_posture.resources_stats).to.eql([
        {
          account_id: 'my-k8s-cluster-5555',
          resource_type: 'k8s_object',
          resource_type_doc_count: 1,
          resource_sub_type: 'ServiceAccount',
          resource_sub_type_doc_count: 1,
          passed_findings_count: 1,
          failed_findings_count: 0,
        },
        {
          account_id: 'my-k8s-cluster-5555',
          resource_type: 'process',
          resource_type_doc_count: 1,
          resource_sub_type: 'process',
          resource_sub_type_doc_count: 1,
          passed_findings_count: 1,
          failed_findings_count: 0,
        },
      ]);
    });

    it('includes KSPM findings without posture_type and CSPM findings as well', async () => {
      await index.add(data.kspmFindingsNoPostureType);
      await index.add(data.cspmFindings);

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
          account_id: 'my-aws-12345',
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
          account_id: 'my-k8s-cluster-5555',
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
      ]);

      expect(apiResponse.stack_stats.kibana.plugins.cloud_security_posture.resources_stats).to.eql([
        {
          account_id: 'my-aws-12345',
          resource_type: 'identifyingType',
          resource_type_doc_count: 2,
          resource_sub_type: 'aws-password-policy',
          resource_sub_type_doc_count: 2,
          passed_findings_count: 1,
          failed_findings_count: 1,
        },
        {
          account_id: 'my-k8s-cluster-5555',
          resource_type: 'k8s_object',
          resource_type_doc_count: 1,
          resource_sub_type: 'ServiceAccount',
          resource_sub_type_doc_count: 1,
          passed_findings_count: 1,
          failed_findings_count: 0,
        },
        {
          account_id: 'my-k8s-cluster-5555',
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
