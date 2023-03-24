/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { CspSetupStatus } from '@kbn/cloud-security-posture-plugin/common/types';
import type { SuperTest, Test } from 'supertest';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

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
      expect(res.cspm.healthyAgents).to.be(0);
      expect(res.cspm.installedPackagePolicies).to.be(1);
    });
  });
}

async function createPackagePolicy(
  supertest: SuperTest<Test>,
  agentPolicyId: string,
  policyTemplate: string,
  input: string,
  deployment: string,
  posture: string
) {
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
      inputs: [
        {
          enabled: true,
          type: input,
          policy_template: policyTemplate,
        },
      ],
      package: {
        name: 'cloud_security_posture',
        title: 'Kubernetes Security Posture Management',
        version: '1.2.8',
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
