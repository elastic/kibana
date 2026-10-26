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
  describe('Cloud Security Posture - Group 3 (Dashboards + Vulns)', function () {
    before(async () => {
      await pageObjects.cspSecurity.createRoles();
      await pageObjects.cspSecurity.createUsers();
    });

    loadTestFile(require.resolve('./pages/compliance_dashboard'));
    loadTestFile(require.resolve('./pages/vulnerability_dashboard'));
    loadTestFile(require.resolve('./pages/vulnerabilities'));
    loadTestFile(require.resolve('./pages/vulnerabilities_grouping'));
  });
}
