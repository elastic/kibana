/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION } from '../constants';
import type { FtrProviderContext } from '../ftr_provider_context';
// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects([
    'common',
    'cspSecurity',
    'security',
    'header',
    'cisAddIntegration',
  ]);

  const KSPM_RADIO_OPTION = 'policy-template-radio-button-kspm';
  const CSPM_RADIO_OPTION = 'policy-template-radio-button-cspm';
  const CNVM_RADIO_OPTION = 'policy-template-radio-button-vuln_mgmt';

  const POLICY_NAME_FIELD = 'createAgentPolicyNameField';

  describe('Agentless Security Posture Integration Options', function () {
    let cisIntegration: typeof pageObjects.cisAddIntegration;

    before(async () => {
      cisIntegration = pageObjects.cisAddIntegration;
    });

    after(async () => {
      await pageObjects.cspSecurity.logout();
    });

    it(`should show kspm without agentless option`, async () => {
      await cisIntegration.navigateToAddIntegrationWithVersionPage(
        AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION
      );
      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.clickOptionButton(KSPM_RADIO_OPTION);
      await pageObjects.header.waitUntilLoadingHasFinished();

      const hasSetupTechnologySelector = await testSubjects.exists(
        cisIntegration.testSubjectIds.SETUP_TECHNOLOGY_SELECTOR
      );
      const hasAgentBased = await testSubjects.exists(POLICY_NAME_FIELD);

      expect(hasSetupTechnologySelector).to.be(false);
      expect(hasAgentBased).to.be(true);
    });

    it(`should show cnvm without agentless option`, async () => {
      //   const integrationPolicyName = `cloud_security_posture-${new Date().toISOString()}`;
      await cisIntegration.navigateToAddIntegrationWithVersionPage(
        AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION
      );
      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.clickOptionButton(CNVM_RADIO_OPTION);
      await pageObjects.header.waitUntilLoadingHasFinished();

      const hasSetupTechnologySelector = await testSubjects.exists(
        cisIntegration.testSubjectIds.SETUP_TECHNOLOGY_SELECTOR
      );
      const hasAgentBased = await testSubjects.exists(POLICY_NAME_FIELD);

      expect(hasSetupTechnologySelector).to.be(false);
      expect(hasAgentBased).to.be(true);
    });

    it(`should show cspm with agentless option`, async () => {
      await cisIntegration.navigateToAddIntegrationWithVersionPage(
        AGENTLESS_SECURITY_POSTURE_PACKAGE_VERSION
      );
      await pageObjects.header.waitUntilLoadingHasFinished();

      await cisIntegration.clickOptionButton(CSPM_RADIO_OPTION);
      await pageObjects.header.waitUntilLoadingHasFinished();

      const hasSetupTechnologySelector = await testSubjects.exists(
        cisIntegration.testSubjectIds.SETUP_TECHNOLOGY_SELECTOR
      );
      const hasAgentBased = await testSubjects.exists(POLICY_NAME_FIELD);

      expect(hasSetupTechnologySelector).to.be(true);
      expect(hasAgentBased).to.be(false);
    });
  });
}
