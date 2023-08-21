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

  // Failing: See https://github.com/elastic/kibana/issues/163950
  describe.skip('Findings Page onboarding', function () {
    this.tags(['cloud_security_posture_findings_onboarding']);
    let findings: typeof PageObjects.findings;
    let notInstalledVulnerabilities: typeof findings.notInstalledVulnerabilities;
    let notInstalledCSP: typeof findings.notInstalledCSP;

    beforeEach(async () => {
      findings = PageObjects.findings;
      notInstalledVulnerabilities = findings.notInstalledVulnerabilities;
      notInstalledCSP = findings.notInstalledCSP;

      await findings.waitForPluginInitialized();
    });

    it('clicking on the `No integrations installed` prompt action button - `install CNVM`: navigates to the CNVM integration installation page', async () => {
      await findings.navigateToVulnerabilities();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const element = await notInstalledVulnerabilities.getElement();
      expect(element).to.not.be(null);

      await notInstalledVulnerabilities.navigateToAction('cnvm-not-installed-action');
      await PageObjects.common.waitUntilUrlIncludes('add-integration/vuln_mgmt');
    });

    it('clicking on the `No integrations installed` prompt action button - `install cloud posture intergation`: navigates to the CSPM integration installation page', async () => {
      await findings.navigateToMisconfigurations();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const element = await notInstalledCSP.getElement();
      expect(element).to.not.be(null);

      await notInstalledCSP.navigateToAction('cspm-not-installed-action');
      await PageObjects.common.waitUntilUrlIncludes('add-integration/cspm');
    });

    it('clicking on the `No integrations installed` prompt action button - `install kubernetes posture intergation`: navigates to the KSPM integration installation page', async () => {
      await findings.navigateToMisconfigurations();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const element = await notInstalledCSP.getElement();
      expect(element).to.not.be(null);

      await notInstalledCSP.navigateToAction('kspm-not-installed-action');
      await PageObjects.common.waitUntilUrlIncludes('add-integration/kspm');
    });
  });
};
