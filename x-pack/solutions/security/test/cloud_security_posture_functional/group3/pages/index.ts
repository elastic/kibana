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
  describe('Cloud Security Posture - Group 3', function () {
    let cspSecurity = pageObjects.cspSecurity;

    before(async () => {
      cspSecurity = pageObjects.cspSecurity;
      await cspSecurity.createRoles();
      await cspSecurity.createUsers();
    });

    loadTestFile(require.resolve('./findings_old_data'));
    loadTestFile(require.resolve('./vulnerabilities'));
    loadTestFile(require.resolve('./vulnerabilities_grouping'));
    loadTestFile(require.resolve('./benchmark'));
    loadTestFile(require.resolve('./alerts_flyout'));
    loadTestFile(require.resolve('./events_flyout'));
    loadTestFile(require.resolve('./entity_preview_flyout'));
  });
}
