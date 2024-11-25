/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';
// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const queryBar = getService('queryBar');
  const pageObjects = getPageObjects(['common', 'header', 'cisAddIntegration', 'findings']);

  describe('Agentless Cloud - Sanity Tests', function () {
    this.tags(['cloud_security_posture_ui_sanity']);

    it(`should have agentless agent findings for AWS provider`, async () => {
      const findings = pageObjects.findings;

      await findings.navigateToLatestFindingsPage();
      await pageObjects.header.waitUntilLoadingHasFinished();

      await queryBar.setQuery('agent.name: *agentless* and cloud.provider : "aws"');
      await queryBar.submitQuery();
      await pageObjects.header.waitUntilLoadingHasFinished();

      const agentlessFindingsRowsCount = await findings
        .createDataTableObject('latest_findings_table')
        .getRowsCount();

      expect(agentlessFindingsRowsCount).to.be.greaterThan(0);
    });

    it(`should have agentless agent findings for Azure provider`, async () => {
      const findings = pageObjects.findings;

      await findings.navigateToLatestFindingsPage();
      await pageObjects.header.waitUntilLoadingHasFinished();

      await queryBar.setQuery('agent.name: *agentless* and cloud.provider : "gcp"');
      await queryBar.submitQuery();
      await pageObjects.header.waitUntilLoadingHasFinished();

      const agentlessFindingsRowsCount = await findings
        .createDataTableObject('latest_findings_table')
        .getRowsCount();

      expect(agentlessFindingsRowsCount).to.be.greaterThan(0);
    });
  });
}
