/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import {
  data as telemetryMockData,
  MockTelemetryFindings,
} from '../../../../../test/cloud_security_posture_api/telemetry/data'; // eslint-disable-line @kbn/imports/no_boundary_crossing
import { createPackagePolicy } from '../../../../../test/api_integration/apis/cloud_security_posture/helper'; // eslint-disable-line @kbn/imports/no_boundary_crossing

const FINDINGS_INDEX = 'logs-cloud_security_posture.findings_latest-default';

export default function ({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  /**
   * required before indexing findings
   */
  const waitForPluginInitialized = (): Promise<void> =>
    retry.try(async () => {
      log.debug('Check CSP plugin is initialized');
      const response = await supertest
        .get('/internal/cloud_security_posture/status?check=init')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'xxx')
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

  describe('Verify cloud_security_posture telemetry payloads', function () {
    // security_exception: action [indices:admin/create] is unauthorized for user [elastic] with effective roles [superuser] on restricted indices [.fleet-actions-7], this action is granted by the index privileges [create_index,manage,all]
    this.tags(['failsOnMKI']);

    let agentPolicyId: string;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');

      const { body: agentPolicyResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy',
          namespace: 'default',
        });

      agentPolicyId = agentPolicyResponse.item.id;

      await createPackagePolicy(
        supertest,
        agentPolicyId,
        'cspm',
        'cloudbeat/cis_aws',
        'aws',
        'cspm',
        'CSPM-1'
      );
      await waitForPluginInitialized();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    afterEach(async () => {
      await index.remove();
    });

    it('includes only KSPM findings', async () => {
      await index.add(telemetryMockData.kspmFindings);

      const {
        body: [{ stats: apiResponse }],
      } = await supertest
        .post(`/internal/telemetry/clusters/_stats`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
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
          kubernetes_version: 'v1.23.0',
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
      await index.add(telemetryMockData.cspmFindings);

      const {
        body: [{ stats: apiResponse }],
      } = await supertest
        .post(`/internal/telemetry/clusters/_stats`)
        .set('kbn-xsrf', 'xxxx')
        .set(ELASTIC_HTTP_VERSION_HEADER, '2')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
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
          kubernetes_version: null,
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
      await index.add(telemetryMockData.kspmFindings);
      await index.add(telemetryMockData.cspmFindings);

      const {
        body: [{ stats: apiResponse }],
      } = await supertest
        .post(`/internal/telemetry/clusters/_stats`)
        .set('kbn-xsrf', 'xxxx')
        .set(ELASTIC_HTTP_VERSION_HEADER, '2')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
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
          kubernetes_version: null,
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
          kubernetes_version: 'v1.23.0',
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

    it(`'includes only KSPM findings without posture_type'`, async () => {
      await index.add(telemetryMockData.kspmFindingsNoPostureType);

      const {
        body: [{ stats: apiResponse }],
      } = await supertest
        .post(`/internal/telemetry/clusters/_stats`)
        .set('kbn-xsrf', 'xxxx')
        .set(ELASTIC_HTTP_VERSION_HEADER, '2')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
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
          kubernetes_version: 'v1.23.0',
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
      await index.add(telemetryMockData.kspmFindingsNoPostureType);
      await index.add(telemetryMockData.cspmFindings);

      const {
        body: [{ stats: apiResponse }],
      } = await supertest
        .post(`/internal/telemetry/clusters/_stats`)
        .set('kbn-xsrf', 'xxxx')
        .set(ELASTIC_HTTP_VERSION_HEADER, '2')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
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
          kubernetes_version: null,
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
          kubernetes_version: 'v1.23.0',
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
