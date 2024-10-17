/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, loadTestFile }: FtrProviderContext) {
  const pageObjects = getPageObjects(['cspSecurity']);
  describe('Cloud Security Posture', function () {
    let cspSecurity = pageObjects.cspSecurity;

    before(async () => {
      cspSecurity = pageObjects.cspSecurity;
      await cspSecurity.createRoles();
      await cspSecurity.createUsers();
    });

    loadTestFile(require.resolve('./rules'));
    loadTestFile(require.resolve('./findings_onboarding'));
    loadTestFile(require.resolve('./findings'));
    loadTestFile(require.resolve('./findings_grouping'));
    loadTestFile(require.resolve('./findings_alerts'));
    loadTestFile(require.resolve('./compliance_dashboard'));
    loadTestFile(require.resolve('./vulnerability_dashboard'));
    loadTestFile(require.resolve('./cis_integrations/cnvm/cis_integration_cnvm'));
    loadTestFile(require.resolve('./cis_integrations/cspm/cis_integration_aws'));
    loadTestFile(require.resolve('./cis_integrations/cspm/cis_integration_gcp'));
    loadTestFile(require.resolve('./cis_integrations/cspm/cis_integration_azure'));
    loadTestFile(require.resolve('./cis_integrations/kspm/cis_integration_k8s'));
    loadTestFile(require.resolve('./cis_integrations/kspm/cis_integration_eks'));
    loadTestFile(require.resolve('./findings_old_data'));
    loadTestFile(require.resolve('./vulnerabilities'));
    loadTestFile(require.resolve('./vulnerabilities_grouping'));
    loadTestFile(require.resolve('./benchmark'));
    loadTestFile(require.resolve('./alerts_flyout'));
  });
}
