/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '@kbn/cloud-security-posture-plugin/common/constants';
import { createPackagePolicy } from '@kbn/cloud-security-posture-common/test_helper';
import type { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * FTR (L4): schema-contract test for the status route. Asserts ONLY the
 * runtime fields the team's util layer (`getCspPackagePolicies`,
 * `getInstalledPolicyTemplates`, `getCspAgentPolicies`,
 * `packageService.asInternalUser.getInstallation`) consumes from real Fleet.
 *
 * Rationale: asserting the full Fleet response shape is an anti-pattern —
 * it generates noise on every benign Fleet change. The fields below are the
 * minimum the orchestration depends on; if Fleet drops or renames any of
 * them, this file fails — and that is exactly the regression a runtime
 * contract test exists to catch.
 */
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  const PACKAGE_POLICIES_LIST = '/api/fleet/package_policies';
  const CSP_FLEET_PACKAGE_KUERY = `ingest-package-policies.package.name:${CLOUD_SECURITY_POSTURE_PACKAGE_NAME}`;
  const CSP_FLEET_PACKAGE_KUERY_QUOTED = `ingest-package-policies.package.name:"${CLOUD_SECURITY_POSTURE_PACKAGE_NAME}"`;

  describe('GET Fleet package_policies — CSP runtime contract', () => {
    let agentPolicyId: string;

    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    beforeEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();

      await supertest
        .post(`/api/fleet/setup`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      const { body: agentPolicyResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'csp-contract-policy',
          namespace: 'default',
        });

      agentPolicyId = agentPolicyResponse.item.id;
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    it('Fleet list response exposes the fields getCspPackagePolicies and getInstalledPolicyTemplates consume', async () => {
      await createPackagePolicy(
        supertest,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm'
      );

      const { body: listBody } = await supertest
        .get(PACKAGE_POLICIES_LIST)
        .query({ kuery: CSP_FLEET_PACKAGE_KUERY_QUOTED, perPage: 10000 })
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      // ListResult envelope — getCspStatus consumes `items` and `total`.
      expect(listBody).to.have.property('items');
      expect(Array.isArray(listBody.items)).to.eql(true);
      expect(listBody.items.length).to.be.greaterThan(0);
      expect(typeof listBody.total).to.eql('number');

      const [policy] = listBody.items;

      // policy_ids[] — getCspAgentPolicies consumes this via
      // `flatMap(packagePolicies, 'policy_ids')`.
      expect(Array.isArray(policy.policy_ids)).to.eql(true);
      expect(policy.policy_ids.length).to.be.greaterThan(0);
      policy.policy_ids.forEach((id: unknown) => expect(typeof id).to.eql('string'));

      // inputs[].enabled / inputs[].policy_template — getInstalledPolicyTemplates
      // consumes both via `policy.inputs.find(input => input.enabled)?.policy_template`.
      expect(Array.isArray(policy.inputs)).to.eql(true);
      expect(policy.inputs.length).to.be.greaterThan(0);
      const enabledInput = policy.inputs.find((input: { enabled?: boolean }) => input.enabled);
      expect(enabledInput).to.not.be(undefined);
      expect(typeof enabledInput.enabled).to.eql('boolean');
      expect(typeof enabledInput.policy_template).to.eql('string');
    });

    it('Fleet list responds to the unquoted kuery shape getInstalledPolicyTemplates uses', async () => {
      await createPackagePolicy(
        supertest,
        agentPolicyId,
        'cspm',
        'cloudbeat/cis_aws',
        'aws',
        'cspm'
      );

      const { body: listBody } = await supertest
        .get(PACKAGE_POLICIES_LIST)
        .query({ kuery: CSP_FLEET_PACKAGE_KUERY, perPage: 1000 })
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      // Same minimal field set; the second kuery shape is the one
      // `getInstalledPolicyTemplates` uses.
      expect(listBody.items.length).to.be.greaterThan(0);
      const [policy] = listBody.items;
      const enabledInput = policy.inputs.find((input: { enabled?: boolean }) => input.enabled);
      expect(enabledInput).to.not.be(undefined);
      expect(typeof enabledInput.policy_template).to.eql('string');
    });

    it('Fleet EPM package response exposes the install fields getCspStatus consumes', async () => {
      await createPackagePolicy(
        supertest,
        agentPolicyId,
        'kspm',
        'cloudbeat/cis_k8s',
        'vanilla',
        'kspm'
      );

      const { body: pkgBody } = await supertest
        .get(`/api/fleet/epm/packages/${CLOUD_SECURITY_POSTURE_PACKAGE_NAME}`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      const installation = pkgBody.item.savedObject?.attributes ?? pkgBody.item.installationInfo;

      // `installation` may resolve from either `savedObject.attributes`
      // (typed as the full `Installation`, but deprecated) or
      // `installationInfo` (typed as `InstallationInfo`, which *omits*
      // `install_version` and `install_started_at` from `Installation` by
      // design — see `x-pack/platform/plugins/shared/fleet/common/types/
      // models/epm.ts`). `getCspStatus` reads both of those fields through
      // optional chaining + a `MIN_DATE` / undefined fallback
      // (`installation?.install_started_at || MIN_DATE` and
      // `installation?.install_version`), so the consumed contract is
      // "may be undefined, must be string when present" — not
      // "must be present and string". Asserting the strict shape would
      // generate noise on benign Fleet changes and fail for the wrong
      // reason. `install_status` is not read by `getCspStatus` at all and
      // is therefore not part of the consumed contract.
      expect(installation).to.not.be(undefined);

      if (installation.install_started_at !== undefined) {
        expect(typeof installation.install_started_at).to.eql('string');
      }
      if (installation.install_version !== undefined) {
        expect(typeof installation.install_version).to.eql('string');
      }

      // `latestVersion ?? version` is *not* read through `?.` at the call
      // site, so it remains a hard required-string contract.
      expect(typeof (pkgBody.item.latestVersion ?? pkgBody.item.version)).to.eql('string');
    });
  });
}
