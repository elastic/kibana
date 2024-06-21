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
import type { ApiIntegrationFtrProviderContext } from '../../common/ftr_provider_context';
import { MockTelemetryFindings, telemetryFindingsMock } from '../mocks/telemetry_findings_mock';
import { deleteExistingIndexByQuery } from '../../common/utils/index_api_helpers';
import { FINDINGS_LATEST_INDEX } from '../../common/utils/indices';
import { setupCSPPackage } from '../../common/utils/csp_package_helpers';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: ApiIntegrationFtrProviderContext) {
  const retry = getService('retry');
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  const addTelemetryIndexBulkDocs = async (mockTelemetryFindings: MockTelemetryFindings[]) => {
    const operations = mockTelemetryFindings.flatMap((doc) => [
      { index: { _index: FINDINGS_LATEST_INDEX } },
      doc,
    ]);

    const response = await es.bulk({
      refresh: 'wait_for',
      index: FINDINGS_LATEST_INDEX,
      operations,
    });
    expect(response.errors).to.eql(false);
  };

  describe('Verify cloud_security_posture telemetry payloads', async () => {
    before(async () => {
      /**
       * required before indexing findings
       */
      await setupCSPPackage(retry, log, supertest);
    });

    afterEach(async () => {
      await deleteExistingIndexByQuery(es, FINDINGS_LATEST_INDEX);
    });

    it('includes only KSPM findings', async () => {
      await addTelemetryIndexBulkDocs(telemetryFindingsMock.kspmFindings);

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
      await addTelemetryIndexBulkDocs(telemetryFindingsMock.cspmFindings);

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
      await addTelemetryIndexBulkDocs(telemetryFindingsMock.kspmFindings);
      await addTelemetryIndexBulkDocs(telemetryFindingsMock.cspmFindings);

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
      await addTelemetryIndexBulkDocs(telemetryFindingsMock.kspmFindingsNoPostureType);

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
      await addTelemetryIndexBulkDocs(telemetryFindingsMock.kspmFindingsNoPostureType);
      await addTelemetryIndexBulkDocs(telemetryFindingsMock.cspmFindings);

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
