/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, loadTestFile }: FtrProviderContext) {
  const pageObjects = getPageObjects(['cspSecurity']);
  describe('Cloud Security Posture - Group 4 (CIS Integrations - CNVM + CSPM)', function () {
    before(async () => {
      await pageObjects.cspSecurity.createRoles();
      await pageObjects.cspSecurity.createUsers();
    });

    loadTestFile(require.resolve('./pages/cis_integrations/cnvm/cis_integration_cnvm'));
    loadTestFile(require.resolve('./pages/cis_integrations/cspm/cis_integration_aws'));
    loadTestFile(require.resolve('./pages/cis_integrations/cspm/cis_integration_gcp'));
    loadTestFile(require.resolve('./pages/cis_integrations/cspm/cis_integration_azure'));
  });
}
