/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';
import { data } from './data';
const FINDINGS_INDEX = 'logs-cloud_security_posture.findings_latest-default';
const mappingComponentTemplate = 'logs-cloud_security_posture.findings@package';

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
    remove: () => es.indices.delete({ index: FINDINGS_INDEX, ignore_unavailable: true }),

    add: async <T>(findingsMock: T[]) => {
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

  // The new mappings will be available in the one of our next package version - once those two task will be merged,
  // meanwhile the telemetry code already support those new fields, so we need to update the mappings manually.
  // https://github.com/elastic/integrations/pull/5035
  // https://github.com/elastic/cloudbeat/issues/650
  const updateMappings = async () => {
    const { body } = await supertest
      .get(`/api/index_management/component_templates/${mappingComponentTemplate}`)
      .set('kbn-xsrf', 'xxx')
      .expect(200);

    const currentMappings = body.template.mappings.properties;

    await supertest
      .put(`/api/index_management/component_templates/${mappingComponentTemplate}`)
      .set('kbn-xsrf', 'xxx')
      .send({
        template: {
          settings: {
            index: {
              number_of_shards: 1,
            },
          },
          mappings: {
            properties: {
              ...currentMappings,
              'rule.benchmark.posture_type': {
                type: 'keyword',
              },
              'cloud.account.id': {
                type: 'keyword',
              },
            },
          },
        },
        name: mappingComponentTemplate,
        version: 1,
        _kbnMeta: {
          usedBy: [],
          isManaged: false,
        },
      })
      .expect(200);
  };

  describe('Verify cloud_security_posture telemetry payloads', async () => {
    before(async () => {
      await waitForPluginInitialized();
      await updateMappings();
    });

    afterEach(async () => {
      await es.indices.delete({ index: FINDINGS_INDEX, ignore_unavailable: true });

      //   await index.remove();
    });

    it('includes only KSPM findings', async () => {
      await index.add(data.kspmFindings);
      //   await sleep(3000);
      retry.try(async () => {
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

        expect(apiResponse.stack_stats.kibana.plugins.cloud_security_posture.accounts_stats).to.eql(
          [
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
          ]
        );
        expect(
          apiResponse.stack_stats.kibana.plugins.cloud_security_posture.resources_stats
        ).to.eql([
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

    it('includes only CSPM findings', async () => {
      await index.add(data.cspmFindings);

      //   await sleep(3000);
      retry.try(async () => {
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

        expect(apiResponse.stack_stats.kibana.plugins.cloud_security_posture.accounts_stats).to.eql(
          [
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
          ]
        );

        expect(
          apiResponse.stack_stats.kibana.plugins.cloud_security_posture.resources_stats
        ).to.eql([
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
    });

    it('includes CSPM and KSPM findings', async () => {
      await index.add(data.kspmFindings);
      await index.add(data.kspmFindings);

      retry.try(async () => {
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

        expect(apiResponse.stack_stats.kibana.plugins.cloud_security_posture.accounts_stats).to.eql(
          [
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
          ]
        );

        expect(
          apiResponse.stack_stats.kibana.plugins.cloud_security_posture.resources_stats
        ).to.eql([
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

    it('includes only old version KSPM findings (no posture_type field)', async () => {
      await index.add(data.kspmFindingsNoPostureType);

      //   await sleep(3000);
      retry.try(async () => {
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

        expect(apiResponse.stack_stats.kibana.plugins.cloud_security_posture.accounts_stats).to.eql(
          [
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
          ]
        );

        expect(
          apiResponse.stack_stats.kibana.plugins.cloud_security_posture.resources_stats
        ).to.eql([
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

    it('includes CSPM findings and old version of KSPM findings (no posture_type field)', async () => {
      await index.add(data.kspmFindingsNoPostureType);
      await index.add(data.cspmFindings);

      //   await sleep(3000);
      retry.try(async () => {
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

        expect(apiResponse.stack_stats.kibana.plugins.cloud_security_posture.accounts_stats).to.eql(
          [
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
          ]
        );

        expect(
          apiResponse.stack_stats.kibana.plugins.cloud_security_posture.resources_stats
        ).to.eql([
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
  });
}
