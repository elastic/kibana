/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * FTR (L4): privilege-axis test for the status route. Covers two axes that
 * cannot be faithfully mocked, so they stay at L4:
 *  - Kibana feature privilege: a role lacking `cloud-security-posture-read`
 *    gets a 403 from the route's `requiredPrivileges` gate.
 *  - ES index ACLs: a CSP-read role missing index access gets a 200 with a
 *    per-integration `unprivileged` status.
 * The cap is one file; it may grow horizontally per role / ACL combination.
 *
 * Sibling coverage:
 * - State machine: server/routes/status/status.test.ts
 * - Orchestration: server/routes/status/status.handler.test.ts
 * - Happy-path smoke: status_smoke.ts
 * - Fleet schema: status_contract.ts
 */
import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import {
  CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS,
  CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
  FINDINGS_INDEX_PATTERN,
} from '@kbn/cloud-security-posture-common';
import type { CspSetupStatus } from '@kbn/cloud-security-posture-common';
import { BENCHMARK_SCORE_INDEX_DEFAULT_NS } from '@kbn/cloud-security-posture-plugin/common/constants';
import { find, without } from 'lodash';
import { createPackagePolicy } from '@kbn/cloud-security-posture-common/test_helper';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import {
  createUser,
  createCSPRole,
  createRoleWithoutCspRead,
  deleteRole,
  deleteUser,
} from '../helper';

const UNPRIVILEGED_ROLE = 'unprivileged_test_role';
const UNPRIVILEGED_USERNAME = 'unprivileged_test_user';
const NO_CSP_READ_ROLE = 'no_csp_read_test_role';
const NO_CSP_READ_USERNAME = 'no_csp_read_test_user';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const retry = getService('retry');

  const allIndices = [
    CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS,
    FINDINGS_INDEX_PATTERN,
    BENCHMARK_SCORE_INDEX_DEFAULT_NS,
    CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
  ];

  describe('GET /internal/cloud_security_posture/status', () => {
    let agentPolicyId: string;

    // Robust setup that survives the flaky-runner's cold/contended boots.
    //
    // This is the first file loaded by the CSP API config, so it absorbs the
    // cold start. The previous approach ran `cleanStandardList()` + `fleet/setup`
    // in every `beforeEach`: the clean deletes the preconfigured CSP package's
    // saved objects, which forced `fleet/setup` to do a full cold package
    // reinstall on every test. On a contended CI box that reinstall blows past
    // Kibana's 120s socket timeout and surfaces as `socket hang up` — and
    // retrying it only burns the retry budget on the same stuck call.
    //
    // Instead we lean on the package being preconfigured in config.ts (installed
    // and archive-cached at startup): wait once for that install to finish, set
    // up Fleet once, and never wipe saved objects. Each test gets an isolated
    // agent policy that is torn down in `afterEach` (deleting an agent policy
    // cascades to its package policies), so state stays clean without ever
    // reinstalling the package. Mirrors the stable cloud_security_posture_api
    // suite.
    before(async () => {
      // Wait for the preconfigured CSP package install (kicked off at startup)
      // to finish before any test touches Fleet. This is a lightweight status
      // poll — it neither holds the Fleet setup lock nor reinstalls anything, so
      // it cannot hang past the socket timeout the way `fleet/setup` can.
      await retry.try(async () => {
        const { body } = await supertest
          .get(`/internal/cloud_security_posture/status?check=init`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .expect(200);
        expect(body).to.eql({ isPluginInitialized: true });
      });

      // Idempotent and fast here: the package is already installed and we never
      // wiped it, so this verifies Fleet setup rather than reinstalling.
      await retry.try(async () => {
        await supertest
          .post(`/api/fleet/setup`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      });
    });

    const createAgentPolicy = async () => {
      const { body: agentPolicyResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `Test policy ${Date.now()}`,
          namespace: 'default',
        });

      return agentPolicyResponse.item.id;
    };

    const deleteAgentPolicy = async (policyId: string) => {
      if (!policyId) {
        return;
      }
      await supertest
        .post(`/api/fleet/agent_policies/delete`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .set('kbn-xsrf', 'xxxx')
        .send({ agentPolicyId: policyId });
    };

    describe('STATUS = UNPRIVILEGED TEST', () => {
      before(async () => {
        await createCSPRole(security, UNPRIVILEGED_ROLE);
        await createUser(security, UNPRIVILEGED_USERNAME, UNPRIVILEGED_ROLE);
        await esArchiver.loadIfNeeded(
          'x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server'
        );
      });

      after(async () => {
        await deleteUser(security, UNPRIVILEGED_USERNAME);
        await deleteRole(security, UNPRIVILEGED_ROLE);
        await esArchiver.unload(
          'x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server'
        );
      });

      beforeEach(async () => {
        agentPolicyId = await createAgentPolicy();
      });

      afterEach(async () => {
        await deleteAgentPolicy(agentPolicyId);
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

    describe('STATUS = MISSING KIBANA PRIVILEGE (cloud-security-posture-read)', () => {
      before(async () => {
        await createRoleWithoutCspRead(security, NO_CSP_READ_ROLE);
        await createUser(security, NO_CSP_READ_USERNAME, NO_CSP_READ_ROLE);
      });

      after(async () => {
        await deleteUser(security, NO_CSP_READ_USERNAME);
        await deleteRole(security, NO_CSP_READ_ROLE);
      });

      it('Return 403 when the assigned role lacks the cloud-security-posture-read Kibana privilege', async () => {
        const { body } = await supertestWithoutAuth
          .get(`/internal/cloud_security_posture/status`)
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .set('kbn-xsrf', 'xxxx')
          .auth(NO_CSP_READ_USERNAME, 'changeme')
          .expect(403);

        // Kibana feature-privilege gate (route `requiredPrivileges:
        // ['cloud-security-posture-read']`), enforced by core API authorization
        // before the handler runs — distinct from the ES index-ACL `unprivileged`
        // status (200) the cases below assert. Core returns a typed 403 naming
        // the missing privilege.
        expect(body.statusCode).to.eql(403);
        expect(body.error).to.eql('Forbidden');
        expect(body.message).to.contain('is unauthorized for user');
        expect(body.message).to.contain('cloud-security-posture-read');
      });
    });

    describe('status = unprivileged test indices', () => {
      before(async () => {
        await esArchiver.loadIfNeeded(
          'x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server'
        );
      });

      beforeEach(async () => {
        agentPolicyId = await createAgentPolicy();
      });

      afterEach(async () => {
        await deleteUser(security, UNPRIVILEGED_USERNAME);
        await deleteRole(security, UNPRIVILEGED_ROLE);
        await deleteAgentPolicy(agentPolicyId);
      });

      it(`Return unprivileged when missing access to findings_latest index`, async () => {
        const privilegedIndices = without(
          allIndices,
          CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS
        );
        await createCSPRole(security, UNPRIVILEGED_ROLE, privilegedIndices);
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
          `kspm status expected unprivileged but got ${res.kspm.status} instead`
        );
        expect(res.cspm.status).to.eql(
          'unprivileged',
          `cspm status expected unprivileged but got ${res.cspm.status} instead`
        );
        expect(res.vuln_mgmt.status).to.eql(
          'not-installed',
          `cnvm status expected not_installed but got ${res.vuln_mgmt.status} instead`
        );

        expect(res).to.have.property('indicesDetails');
        expect(
          find(res.indicesDetails, { index: CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_ALIAS })
            ?.status
        ).eql('unprivileged');

        privilegedIndices.forEach((index) => {
          expect(find(res.indicesDetails, { index })?.status).not.eql('unprivileged');
        });
      });

      it(`Return unprivileged when missing access to score index`, async () => {
        const privilegedIndices = without(allIndices, BENCHMARK_SCORE_INDEX_DEFAULT_NS);
        await createCSPRole(security, UNPRIVILEGED_ROLE, privilegedIndices);
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
          `kspm status expected unprivileged but got ${res.kspm.status} instead`
        );
        expect(res.cspm.status).to.eql(
          'unprivileged',
          `cspm status expected unprivileged but got ${res.cspm.status} instead`
        );
        expect(res.vuln_mgmt.status).to.eql(
          'unprivileged',
          `cnvm status expected unprivileged but got ${res.vuln_mgmt.status} instead`
        );

        expect(res).to.have.property('indicesDetails');
        expect(find(res.indicesDetails, { index: BENCHMARK_SCORE_INDEX_DEFAULT_NS })?.status).eql(
          'unprivileged'
        );

        privilegedIndices.forEach((index) => {
          expect(find(res.indicesDetails, { index })?.status).not.eql('unprivileged');
        });
      });

      it(`Return unprivileged when missing access to vulnerabilities_latest index`, async () => {
        const privilegedIndices = without(
          allIndices,
          CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN
        );
        await createCSPRole(security, UNPRIVILEGED_ROLE, privilegedIndices);
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
          'not-deployed',
          `kspm status expected unprivileged but got ${res.kspm.status} instead`
        );
        expect(res.cspm.status).to.eql(
          'not-installed',
          `cspm status expected unprivileged but got ${res.cspm.status} instead`
        );
        expect(res.vuln_mgmt.status).to.eql(
          'unprivileged',
          `cnvm status expected unprivileged but got ${res.vuln_mgmt.status} instead`
        );

        expect(res).to.have.property('indicesDetails');
        expect(
          find(res.indicesDetails, { index: CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN })
            ?.status
        ).eql('unprivileged');

        privilegedIndices.forEach((index) => {
          expect(find(res.indicesDetails, { index })?.status).not.eql('unprivileged');
        });
      });
    });
  });
}
