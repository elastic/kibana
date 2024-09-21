/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN } from '@kbn/cloud-security-posture-common';
import type { CspSetupStatus } from '@kbn/cloud-security-posture-common';
import {
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  FINDINGS_INDEX_PATTERN,
} from '@kbn/cloud-security-posture-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';
import {
  createPackagePolicy,
  createUser,
  createCSPOnlyRole,
  deleteRole,
  deleteUser,
  deleteIndex,
  assertIndexStatus,
} from '../helper';

const UNPRIVILEGED_ROLE = 'unprivileged_test_role';
const UNPRIVILEGED_USERNAME = 'unprivileged_test_user';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
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
          .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
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
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'xxxx')
          .auth(UNPRIVILEGED_USERNAME, 'changeme')
          .expect(200);

        expect(res.kspm.status).to.eql(
          'unprivileged',
          `expected unprivileged but got ${res.kspm.status} instead`
        );
        expect(res.cspm.status).to.eql(
          'unprivileged',
          `expected unprivileged but got ${res.cspm.status} instead`
        );
        expect(res.vuln_mgmt.status).to.eql(
          'unprivileged',
          `expected unprivileged but got ${res.vuln_mgmt.status} instead`
        );
      });
    });

    describe('status = unprivileged test indices', () => {
      beforeEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');

        const { body: agentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
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
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'xxxx')
          .auth(UNPRIVILEGED_USERNAME, 'changeme')
          .expect(200);

        expect(res.kspm.status).to.eql(
          'unprivileged',
          `expected unprivileged but got ${res.kspm.status} instead`
        );
        expect(res.cspm.status).to.eql(
          'unprivileged',
          `expected unprivileged but got ${res.cspm.status} instead`
        );
        expect(res.vuln_mgmt.status).to.eql(
          'unprivileged',
          `expected unprivileged but got ${res.vuln_mgmt.status} instead`
        );

        assertIndexStatus(res.indicesDetails, LATEST_FINDINGS_INDEX_DEFAULT_NS, 'empty');
        assertIndexStatus(res.indicesDetails, FINDINGS_INDEX_PATTERN, 'empty');
        assertIndexStatus(res.indicesDetails, BENCHMARK_SCORE_INDEX_DEFAULT_NS, 'unprivileged');
        assertIndexStatus(
          res.indicesDetails,
          CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
          'unprivileged'
        );
      });

      it(`Return unprivileged when missing access to score index`, async () => {
        await deleteIndex(es, [BENCHMARK_SCORE_INDEX_DEFAULT_NS]);
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
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'xxxx')
          .auth(UNPRIVILEGED_USERNAME, 'changeme')
          .expect(200);

        expect(res.kspm.status).to.eql(
          'unprivileged',
          `expected unprivileged but got ${res.kspm.status} instead`
        );
        expect(res.cspm.status).to.eql(
          'unprivileged',
          `expected unprivileged but got ${res.cspm.status} instead`
        );
        expect(res.vuln_mgmt.status).to.eql(
          'unprivileged',
          `expected unprivileged but got ${res.vuln_mgmt.status} instead`
        );

        assertIndexStatus(res.indicesDetails, LATEST_FINDINGS_INDEX_DEFAULT_NS, 'unprivileged');
        assertIndexStatus(res.indicesDetails, FINDINGS_INDEX_PATTERN, 'empty');
        assertIndexStatus(res.indicesDetails, BENCHMARK_SCORE_INDEX_DEFAULT_NS, 'empty');
        assertIndexStatus(
          res.indicesDetails,
          CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
          'unprivileged'
        );
      });

      it(`Return unprivileged when missing access to vulnerabilities_latest index`, async () => {
        await createCSPOnlyRole(
          security,
          UNPRIVILEGED_ROLE,
          CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN
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
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'xxxx')
          .auth(UNPRIVILEGED_USERNAME, 'changeme')
          .expect(200);

        expect(res.kspm.status).to.eql(
          'unprivileged',
          `expected unprivileged but got ${res.kspm.status} instead`
        );
        expect(res.cspm.status).to.eql(
          'unprivileged',
          `expected unprivileged but got ${res.cspm.status} instead`
        );
        expect(res.vuln_mgmt.status).to.eql(
          'unprivileged',
          `expected unprivileged but got ${res.vuln_mgmt.status} instead`
        );

        assertIndexStatus(res.indicesDetails, LATEST_FINDINGS_INDEX_DEFAULT_NS, 'unprivileged');
        assertIndexStatus(res.indicesDetails, FINDINGS_INDEX_PATTERN, 'empty');
        assertIndexStatus(res.indicesDetails, BENCHMARK_SCORE_INDEX_DEFAULT_NS, 'unprivileged');
        assertIndexStatus(
          res.indicesDetails,
          CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
          'empty'
        );
      });
    });
  });
}
