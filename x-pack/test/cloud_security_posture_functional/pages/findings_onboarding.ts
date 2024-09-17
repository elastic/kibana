/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const PageObjects = getPageObjects(['common', 'findings', 'header']);
  const testSubjects = getService('testSubjects');

  describe('Findings Page onboarding', function () {
    this.tags(['cloud_security_posture_findings_onboarding']);
    let findings: typeof PageObjects.findings;
    let notInstalledVulnerabilities: typeof findings.notInstalledVulnerabilities;
    let notInstalledCSP: typeof findings.notInstalledCSP;
    let thirdPartyIntegrationsNoFindingsPrompt: typeof findings.thirdPartyIntegrationsNoFindingsPrompt;

    beforeEach(async () => {
      findings = PageObjects.findings;
      notInstalledVulnerabilities = findings.notInstalledVulnerabilities;
      notInstalledCSP = findings.notInstalledCSP;
      thirdPartyIntegrationsNoFindingsPrompt = findings.thirdPartyIntegrationsNoFindingsPrompt;

      await findings.waitForPluginInitialized();
    });

    it('clicking on the `No integrations installed` prompt action button - `install CNVM`: navigates to the CNVM integration installation page', async () => {
      await findings.navigateToLatestVulnerabilitiesPage();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const element = await notInstalledVulnerabilities.getElement();
      expect(element).to.not.be(null);

      await notInstalledVulnerabilities.navigateToAction('cnvm-not-installed-action');
      const createPackageHeaderElementExists = await testSubjects.exists(
        'createPackagePolicy_pageTitle'
      );

      if (!createPackageHeaderElementExists) {
        throw new Error('Integration installation page not found');
      }

      await PageObjects.common.waitUntilUrlIncludes('add-integration/vuln_mgmt');
    });

    it('clicking on the `No integrations installed` prompt action button - `install cloud posture intergation`: navigates to the CSPM integration installation page', async () => {
      await findings.navigateToMisconfigurations();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const element = await notInstalledCSP.getElement();
      expect(element).to.not.be(null);

      await notInstalledCSP.navigateToAction('cspm-not-installed-action');
      const createPackageHeaderElementExists = await testSubjects.exists(
        'createPackagePolicy_pageTitle'
      );

      if (!createPackageHeaderElementExists) {
        throw new Error('Integration installation page not found');
      }

      await PageObjects.common.waitUntilUrlIncludes('add-integration/cspm');
    });

    it('clicking on the `No integrations installed` prompt action button - `install kubernetes posture intergation`: navigates to the KSPM integration installation page', async () => {
      await findings.navigateToMisconfigurations();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const element = await notInstalledCSP.getElement();
      expect(element).to.not.be(null);

      await notInstalledCSP.navigateToAction('kspm-not-installed-action');
      const createPackageHeaderElementExists = await testSubjects.exists(
        'createPackagePolicy_pageTitle'
      );

      if (!createPackageHeaderElementExists) {
        throw new Error('Integration installation page not found');
      }

      await PageObjects.common.waitUntilUrlIncludes('add-integration/kspm');
    });

    it('clicking on the `Third party integrations` prompt action button - `Wiz Integration`: navigates to the Wiz integration overview page', async () => {
      await findings.navigateToMisconfigurations();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const element = await thirdPartyIntegrationsNoFindingsPrompt.getElement();
      expect(element).to.not.be(null);

      await thirdPartyIntegrationsNoFindingsPrompt.navigateToAction(
        '3p-no-findings-prompt-wiz-integration-button'
      );
      const integrationPageHeaderElementExists = await testSubjects.exists('headerLeft');

      if (!integrationPageHeaderElementExists) {
        throw new Error('Integration overview page not found');
      }

      await PageObjects.common.waitUntilUrlIncludes('wiz/overview');
    });
  });
};
