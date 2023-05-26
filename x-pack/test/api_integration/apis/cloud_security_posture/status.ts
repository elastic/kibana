/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import Chance from 'chance';
import type { CspSetupStatus } from '@kbn/cloud-security-posture-plugin/common/types';
import type { SuperTest, Test } from 'supertest';
import { FtrProviderContext } from '../../ftr_provider_context';
import { deleteIndex, addIndex } from './helper';

const FINDINGS_INDEX = 'logs-cloud_security_posture.findings-default';
const FINDINGS_LATEST_INDEX = 'logs-cloud_security_posture.findings_latest-default';
const VULN_LATEST_INDEX = 'logs-cloud_security_posture.vulnerabilities_latest-default';
const VULN_INDEX = 'logs-cloud_security_posture.vulnerabilities-default';
const INDEX_ARRAY = [FINDINGS_INDEX, FINDINGS_LATEST_INDEX, VULN_LATEST_INDEX, VULN_INDEX];

const UNPRIVILEGED_ROLE = 'unprivileged_test_role';
const UNPRIVILEGED_USERNAME = 'unprivileged_test_user';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
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
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    describe('status = not-deployed & status = not-installed test', () => {
      it(`Should return not-deployed when installed kspm`, async () => {
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

        expect(res.kspm.status).to.be('not-deployed');
        expect(res.cspm.status).to.be('not-installed');
        expect(res.vuln_mgmt.status).to.be('not-installed');
        expect(res.kspm.healthyAgents).to.be(0);
        expect(res.kspm.installedPackagePolicies).to.be(1);
      });

      it(`Should return not-deployed when installed cspm`, async () => {
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

        expect(res.cspm.status).to.be('not-deployed');
        expect(res.kspm.status).to.be('not-installed');
        expect(res.vuln_mgmt.status).to.be('not-installed');
        expect(res.cspm.healthyAgents).to.be(0);
        expect(res.cspm.installedPackagePolicies).to.be(1);
      });

      it(`Should return not-deployed when vuln_mgmt is not installed`, async () => {
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

        expect(res.cspm.status).to.be('not-installed');
        expect(res.kspm.status).to.be('not-installed');
        expect(res.vuln_mgmt.status).to.be('not-deployed');
        expect(res.vuln_mgmt.healthyAgents).to.be(0);
        expect(res.vuln_mgmt.installedPackagePolicies).to.be(1);
      });
    });

    describe('status = indexed test', () => {
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
        await addIndex(es, findingsMockData, FINDINGS_LATEST_INDEX);
        await addIndex(es, vulnerabilityMockData, VULN_LATEST_INDEX);
      });

      afterEach(async () => {
        await deleteIndex(es, INDEX_ARRAY);
        await kibanaServer.savedObjects.cleanStandardList();
        await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      });

      it(`Kspm should return indexed have data on index findings latest`, async () => {
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

        expect(res.kspm.status).to.be('indexed');
      });

      it(`Cspm should return indexed have data on index findings latest`, async () => {
        await createPackagePolicy(
          supertest,
          agentPolicyId,
          'cspm',
          'cloudbeat/cis_aws',
          'aws',
          'cspm'
        );

        //         const { body: res2 } = await supertest
        //         .post('/_transform/logs-cloud_security_posture.findings_latest-default/_stop')
        //         .set('kbn-xsrf', 'xxxx')
        //         .expect(200);
        // console.log(res2)

        const { body: res }: { body: CspSetupStatus } = await supertest
          .get(`/internal/cloud_security_posture/status`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(res.cspm.status).to.be('indexed');
      });

      it(`Cnvm should return indexed have data on index findings`, async () => {
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

        expect(res.vuln_mgmt.status).to.be('indexed');
      });
    });

    describe('status = unprivileged test', () => {
      const createUnprivilegedUser = async () => {
        await security.user.create(UNPRIVILEGED_USERNAME, {
          password: 'changeme',
          roles: [UNPRIVILEGED_ROLE],
          full_name: 'a reporting user',
        });
      };

      const createUnprivilegedRole = async () => {
        await security.role.create(UNPRIVILEGED_ROLE, {
          kibana: [
            {
              feature: { siem: ['read'], fleetv2: ['all'], fleet: ['read'] },
              spaces: ['*'],
            },
          ],
        });
      };

      const deleteUnprivilegedRole = async () => {
        await security.role.delete(UNPRIVILEGED_ROLE);
      };

      const deleteUnprivilegedUser = async () => {
        await security.user.delete(UNPRIVILEGED_USERNAME);
      };

      before(async () => {
        await createUnprivilegedRole();
        await createUnprivilegedUser();
      });

      after(async () => {
        await deleteUnprivilegedUser();
        await deleteUnprivilegedRole();
      });

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
      });

      afterEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      });

      it(`status should return unprivileged when users don't have enough permission`, async () => {
        await createPackagePolicy(
          supertest,
          agentPolicyId,
          'kspm',
          'cloudbeat/cis_k8s',
          'vanilla',
          'kspm'
        );

        const { body: res }: { body: CspSetupStatus } = await supertestWithoutAuth
          .get(`/internal/cloud_security_posture/status`)
          .set('kbn-xsrf', 'xxxx')
          .auth(UNPRIVILEGED_USERNAME, 'changeme')
          .expect(200);

        expect(res.kspm.status).to.be('unprivileged');
        expect(res.cspm.status).to.be('unprivileged');
        expect(res.vuln_mgmt.status).to.be('unprivileged');
      });
    });

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
        await addIndex(es, findingsMockData, FINDINGS_INDEX);
        await addIndex(es, vulnerabilityMockData, VULN_INDEX);
      });

      afterEach(async () => {
        await deleteIndex(es, INDEX_ARRAY);
        await kibanaServer.savedObjects.cleanStandardList();
        await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      });

      it(`Kspm should return indexed have data on index findings`, async () => {
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

      it(`Cspm should return indexed have data on index findings latest`, async () => {
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

      it(`Cnvm should return indexing have data on index findings`, async () => {
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

export async function createPackagePolicy(
  supertest: SuperTest<Test>,
  agentPolicyId: string,
  policyTemplate: string,
  input: string,
  deployment: string,
  posture: string
) {
  const version = posture === 'kspm' || posture === 'cspm' ? '1.2.8' : '1.3.0-preview2';
  const title = 'Security Posture Management';
  const streams = [
    {
      enabled: false,
      data_stream: {
        type: 'logs',
        dataset: 'cloud_security_posture.vulnerabilities',
      },
    },
  ];

  const inputTemplate = {
    enabled: true,
    type: input,
    policy_template: policyTemplate,
  };

  const inputs = posture === 'vuln_mgmt' ? { ...inputTemplate, streams } : { ...inputTemplate };

  const { body: postPackageResponse } = await supertest
    .post(`/api/fleet/package_policies`)
    .set('kbn-xsrf', 'xxxx')
    .send({
      force: true,
      name: 'cloud_security_posture-1',
      description: '',
      namespace: 'default',
      policy_id: agentPolicyId,
      enabled: true,
      inputs: [inputs],
      package: {
        name: 'cloud_security_posture',
        title,
        version,
      },
      vars: {
        deployment: {
          value: deployment,
          type: 'text',
        },
        posture: {
          value: posture,
          type: 'text',
        },
      },
    })
    .expect(200);

  return postPackageResponse.item;
}
