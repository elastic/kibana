/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, loadTestFile }: FtrProviderContext) {
  const pageObjects = getPageObjects(['cspSecurity']);
  describe('Cloud Security Posture - Group 2', function () {
    let cspSecurity = pageObjects.cspSecurity;

    before(async () => {
      cspSecurity = pageObjects.cspSecurity;
      await cspSecurity.createRoles();
      await cspSecurity.createUsers();
    });

    loadTestFile(require.resolve('./vulnerability_dashboard'));
    loadTestFile(require.resolve('./cis_integrations/cnvm/cis_integration_cnvm'));
    loadTestFile(require.resolve('./cis_integrations/cspm/cis_integration_aws'));
    loadTestFile(require.resolve('./cis_integrations/cspm/cis_integration_gcp'));
    loadTestFile(require.resolve('./cis_integrations/cspm/cis_integration_azure'));
    loadTestFile(require.resolve('./cis_integrations/kspm/cis_integration_k8s'));
    loadTestFile(require.resolve('./cis_integrations/kspm/cis_integration_eks'));
  });
}
