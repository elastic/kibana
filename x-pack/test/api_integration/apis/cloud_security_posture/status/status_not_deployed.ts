/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { CspSetupStatus } from '@kbn/cloud-security-posture-plugin/common/types';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { createPackagePolicy } from '../helper';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('GET /internal/cloud_security_posture/status', () => {
    let agentPolicyId: string;

    describe('STATUS = NOT-DEPLOYED and STATUS = NOT-INSTALLED TEST', () => {
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
      it(`Should return not-deployed when installed kspm, no findings on either indices and no healthy agents`, async () => {
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

      it(`Should return not-deployed when installed cspm, no findings on either indices and no healthy agents`, async () => {
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

      it(`Should return not-deployed when installed cnvm, no findings on either indices and no healthy agents`, async () => {
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
  });
}
