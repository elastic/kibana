/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const retry = getService('retry');
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

  describe('Verify csp rules template find api', async () => {
    before(async () => {
      await waitForPluginInitialized();
    });

    it('verify that rules exists after KSPM integration was installed', async () => {
      const {
        body: [{ stats: apiResponse }],
      } = await supertest
        .post(`internal/cloud_security_posture/rules/_find`)
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
  });
}
