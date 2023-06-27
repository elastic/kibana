/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { CspSetupStatus } from '@kbn/cloud-security-posture-plugin/common/types';
import {
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
} from '@kbn/cloud-security-posture-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';
import {
  createPackagePolicy,
  createUser,
  createCSPOnlyRole,
  deleteRole,
  deleteUser,
} from '../helper';

const UNPRIVILEGED_ROLE = 'unprivileged_test_role';
const UNPRIVILEGED_USERNAME = 'unprivileged_test_user';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');

  describe('GET /internal/cloud_security_posture/status', () => {
    let agentPolicyId: string;

    describe('STATUS = UNPRIVILEGED TEST', () => {
      before(async () => {
        await createCSPOnlyRole(security, UNPRIVILEGED_ROLE, '');
        await createUser(security, UNPRIVILEGED_USERNAME, UNPRIVILEGED_ROLE);
      });

      after(async () => {
        await deleteUser(security, UNPRIVILEGED_USERNAME);
        await deleteRole(security, UNPRIVILEGED_ROLE);
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
        await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
        await kibanaServer.savedObjects.cleanStandardList();
      });

      it(`Return unprivileged for cspm, kspm, vuln_mgmt when users don't have enough for permission for the role they are assigned`, async () => {
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

    describe('status = unprivileged test indices', () => {
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
        await deleteUser(security, UNPRIVILEGED_USERNAME);
        await deleteRole(security, UNPRIVILEGED_ROLE);
        await kibanaServer.savedObjects.cleanStandardList();
        await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      });

      it(`Return unprivileged when missing access to findings_latest index`, async () => {
        await createCSPOnlyRole(security, UNPRIVILEGED_ROLE, LATEST_FINDINGS_INDEX_DEFAULT_NS);
        await createUser(security, UNPRIVILEGED_USERNAME, UNPRIVILEGED_ROLE);

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

        expect(res.indicesDetails[0].status).to.be('empty');
        expect(res.indicesDetails[1].status).to.be('empty');
        expect(res.indicesDetails[2].status).to.be('unprivileged');
        expect(res.indicesDetails[3].status).to.be('unprivileged');
      });

      it(`Return unprivileged when missing access to score index`, async () => {
        await createCSPOnlyRole(security, UNPRIVILEGED_ROLE, BENCHMARK_SCORE_INDEX_DEFAULT_NS);
        await createUser(security, UNPRIVILEGED_USERNAME, UNPRIVILEGED_ROLE);

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

        expect(res.indicesDetails[0].status).to.be('unprivileged');
        expect(res.indicesDetails[3].status).to.be('unprivileged');
      });

      it(`Return unprivileged when missing access to vulnerabilities_latest index`, async () => {
        await createCSPOnlyRole(
          security,
          UNPRIVILEGED_ROLE,
          LATEST_VULNERABILITIES_INDEX_DEFAULT_NS
        );
        await createUser(security, UNPRIVILEGED_USERNAME, UNPRIVILEGED_ROLE);

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
        expect(res.vuln_mgmt.status).to.be('not-installed');

        expect(res.indicesDetails[0].status).to.be('unprivileged');
        expect(res.indicesDetails[2].status).to.be('unprivileged');
      });
    });
  });
}
