/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import Chance from 'chance';
import type { CspSetupStatus } from '@kbn/cloud-security-posture-plugin/common/types';
import {
  FINDINGS_INDEX_DEFAULT_NS,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
  VULNERABILITIES_INDEX_DEFAULT_NS,
} from '@kbn/cloud-security-posture-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { deleteIndex, addIndex, createPackagePolicy } from '../helper';

const INDEX_ARRAY = [
  FINDINGS_INDEX_DEFAULT_NS,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
  VULNERABILITIES_INDEX_DEFAULT_NS,
];

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const chance = new Chance();

  const findingsMockData = [
    {
      resource: { id: chance.guid(), name: `kubelet`, sub_type: 'lower case sub type' },
      result: { evaluation: chance.integer() % 2 === 0 ? 'passed' : 'failed' },
      rule: {
        name: 'Upper case rule name',
        section: 'Upper case section',
        benchmark: {
          id: 'cis_k8s',
          posture_type: 'kspm',
          name: 'CIS Kubernetes V1.23',
          version: 'v1.0.0',
        },
        type: 'process',
      },
      cluster_id: 'Upper case cluster id',
    },
    {
      resource: { id: chance.guid(), name: `Pod`, sub_type: 'Upper case sub type' },
      result: { evaluation: chance.integer() % 2 === 0 ? 'passed' : 'failed' },
      rule: {
        name: 'lower case rule name',
        section: 'Another upper case section',
        benchmark: {
          id: 'cis_aws',
          posture_type: 'cspm',
          name: 'CIS Kubernetes V1.23',
          version: 'v1.0.0',
        },
        type: 'process',
      },
      cluster_id: 'Another Upper case cluster id',
    },
  ];

  const vulnerabilityMockData = [
    {
      resource: {
        name: 'NameNama',
        id: '12345',
      },
      vulnerability: {
        severity: 'MEDIUM',
        package: {
          name: 'github.com/aws/aws-sdk-go',
          version: 'v1.42.30',
        },
      },
      cvss: {
        redhat: {
          V3Vector: 'CVSS:3.1/AV:L/AC:H/PR:L/UI:N/S:C/C:H/I:N/A:N',
          V3Score: 5.6,
        },
      },
    },
  ];

  describe('GET /internal/cloud_security_posture/status', () => {
    let agentPolicyId: string;

    describe('status = indexing test', () => {
      beforeEach(async () => {
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
        await deleteIndex(es, INDEX_ARRAY);
        await addIndex(es, findingsMockData, FINDINGS_INDEX_DEFAULT_NS);
        await addIndex(es, vulnerabilityMockData, VULNERABILITIES_INDEX_DEFAULT_NS);
      });

      afterEach(async () => {
        await deleteIndex(es, INDEX_ARRAY);
        await kibanaServer.savedObjects.cleanStandardList();
        await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      });

      it(`Return kspm status indexing when logs-cloud_security_posture.findings_latest-default doesn't contain new kspm documents, but has newly connected agents`, async () => {
        await createPackagePolicy(
          supertest,
          agentPolicyId,
          'kspm',
          'cloudbeat/cis_k8s',
          'vanilla',
          'kspm'
        );

        const { body: res }: { body: CspSetupStatus } = await supertest
          .get(`/internal/cloud_security_posture/status`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(res.kspm.status).to.be('indexing');
      });

      it(`Return cspm status indexing when logs-cloud_security_posture.findings_latest-default doesn't contain new cspm documents, but has newly connected agents  `, async () => {
        await createPackagePolicy(
          supertest,
          agentPolicyId,
          'cspm',
          'cloudbeat/cis_aws',
          'aws',
          'cspm'
        );

        const { body: res }: { body: CspSetupStatus } = await supertest
          .get(`/internal/cloud_security_posture/status`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(res.cspm.status).to.be('indexing');
      });

      it(`Return vuln status indexing when logs-cloud_security_posture.vulnerabilities_latest-default doesn't contain vuln new documents, but has newly connected agents`, async () => {
        await createPackagePolicy(
          supertest,
          agentPolicyId,
          'vuln_mgmt',
          'cloudbeat/vuln_mgmt_aws',
          'aws',
          'vuln_mgmt'
        );

        const { body: res }: { body: CspSetupStatus } = await supertest
          .get(`/internal/cloud_security_posture/status`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(res.vuln_mgmt.status).to.be('indexing');
      });
    });
  });
}
