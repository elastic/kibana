/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getPageObjects }: FtrProviderContext) => {
  const PageObjects = getPageObjects(['common', 'findings', 'header']);

  describe('Findings Page onboarding', function () {
    this.tags(['cloud_security_posture_findings_onboarding']);
    let findings: typeof PageObjects.findings;
    let noFindingsVulnerabilities: typeof findings.notInstalledVulnerabilities;

    it('clicking on the `No integrations installed` prompt action button - `install CNVM`: navigates to the CNVM integration installation page', async () => {
      findings = PageObjects.findings;
      noFindingsVulnerabilities = findings.notInstalledVulnerabilities;

      await findings.waitForPluginInitialized();

      await findings.navigateToVulnerabilities();
      const element = await noFindingsVulnerabilities.getElement();
      expect(element).to.not.be(null);

      await noFindingsVulnerabilities.navigateToAction();
      await PageObjects.common.waitUntilUrlIncludes('integrations/cloud_security_posture');
    });
  });
};
