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
    let notInstalledVulnerabilities: typeof findings.notInstalledVulnerabilities;
    let notInstalledCSP: typeof findings.notInstalledCSP;
    let thirdPartyIntegrationsNoMisconfigurationsFindingsPrompt: typeof findings.thirdPartyIntegrationsNoMisconfigurationsFindingsPrompt;
    let thirdPartyIntegrationsNoVulnerabilitiesFindingsPrompt: typeof findings.thirdPartyIntegrationsNoVulnerabilitiesFindingsPrompt;

    beforeEach(async () => {
      findings = PageObjects.findings;
      notInstalledVulnerabilities = findings.notInstalledVulnerabilities;
      notInstalledCSP = findings.notInstalledCSP;
      thirdPartyIntegrationsNoMisconfigurationsFindingsPrompt =
        findings.thirdPartyIntegrationsNoMisconfigurationsFindingsPrompt;
      thirdPartyIntegrationsNoVulnerabilitiesFindingsPrompt =
        findings.thirdPartyIntegrationsNoVulnerabilitiesFindingsPrompt;

      await findings.waitForPluginInitialized();
    });

    it('Vulnerabilities - clicking on the `No integrations installed` prompt action button - `install CNVM`: navigates to the CNVM integration installation page', async () => {
      await findings.navigateToLatestVulnerabilitiesPage();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const element = await notInstalledVulnerabilities.getElement();
      expect(element).to.not.be(null);

      await notInstalledVulnerabilities.navigateToAction('cnvm-not-installed-action');

      await PageObjects.common.waitUntilUrlIncludes('add-integration/vuln_mgmt');
    });

    it('Vulnerabilities - clicking on the `Third party integrations` prompt action button - `Wiz Integration`: navigates to the Wiz integration installation page', async () => {
      await findings.navigateToLatestVulnerabilitiesPage();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const element = await thirdPartyIntegrationsNoVulnerabilitiesFindingsPrompt.getElement();
      expect(element).to.not.be(null);

      await thirdPartyIntegrationsNoVulnerabilitiesFindingsPrompt.navigateToAction(
        '3p-no-vulnerabilities-findings-prompt-wiz-integration-button'
      );

      await PageObjects.common.waitUntilUrlIncludes('fleet/integrations/wiz/add-integration');
    });

    it('Misconfigurations - clicking on the `No integrations installed` prompt action button - `install cloud posture integration`: navigates to the CSPM integration installation page', async () => {
      await findings.navigateToMisconfigurations();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const element = await notInstalledCSP.getElement();
      expect(element).to.not.be(null);

      await notInstalledCSP.navigateToAction('cspm-not-installed-action');

      await PageObjects.common.waitUntilUrlIncludes('add-integration/cspm');
    });

    it('Misconfigurations - clicking on the `No integrations installed` prompt action button - `install kubernetes posture integration`: navigates to the KSPM integration installation page', async () => {
      await findings.navigateToMisconfigurations();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const element = await notInstalledCSP.getElement();
      expect(element).to.not.be(null);

      await notInstalledCSP.navigateToAction('kspm-not-installed-action');

      await PageObjects.common.waitUntilUrlIncludes('add-integration/kspm');
    });

    it('Misconfigurations - clicking on the `Third party integrations` prompt action button - `Wiz Integration`: navigates to the Wiz integration installation page', async () => {
      await findings.navigateToMisconfigurations();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const element = await thirdPartyIntegrationsNoMisconfigurationsFindingsPrompt.getElement();
      expect(element).to.not.be(null);

      await thirdPartyIntegrationsNoMisconfigurationsFindingsPrompt.navigateToAction(
        '3p-no-misconfigurations-findings-prompt-wiz-integration-button'
      );

      await PageObjects.common.waitUntilUrlIncludes('fleet/integrations/wiz/add-integration');
    });
  });
};
