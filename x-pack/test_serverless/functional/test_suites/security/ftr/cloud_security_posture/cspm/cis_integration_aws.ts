/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const CIS_AWS_OPTION_TEST_ID = 'cisAwsTestId';
const AWS_CREDENTIAL_SELECTOR = 'aws-credentials-type-selector';
const SETUP_TECHNOLOGY = 'setup-technology-selector';
const SETUP_TECHNOLOGY_SELECTOR_ACCORDION_TEST_SUBJ = 'setup-technology-selector-accordion';

const AWS_SINGLE_ACCOUNT_TEST_ID = 'awsSingleTestId';

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'settings',
    'common',
    'svlCommonPage',
    'cisAddIntegration',
    'header',
  ]);

  describe('CIS Integration Page', function () {
    // TODO: we need to check if the tests are running on MKI. There is a suspicion that installing csp package via Kibana server args is not working on MKI.
    this.tags(['skipMKI', 'cloud_security_posture_cis_integration']);
    let cisIntegration: typeof pageObjects.cisAddIntegration;
    let cisIntegrationAws: typeof pageObjects.cisAddIntegration.cisAws;
    before(async () => {
      await pageObjects.svlCommonPage.login();

      cisIntegration = pageObjects.cisAddIntegration;
      cisIntegrationAws = pageObjects.cisAddIntegration.cisAws;

      await pageObjects.common.navigateToUrl(
        'fleet',
        'integrations/cloud_security_posture/add-integration/cspm',
        {
          shouldUseHashForSubUrl: false,
        }
      );
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
    });

    describe('CIS_AWS Single Account Launch Cloud formation', () => {
      it('should show CIS_AWS Launch Cloud formation button when setup technology selector is Agentless and credentials selector is direct access keys', async () => {
        await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegration.clickAccordianButton(SETUP_TECHNOLOGY_SELECTOR_ACCORDION_TEST_SUBJ);
        await cisIntegration.clickOptionButton(SETUP_TECHNOLOGY);
        await cisIntegration.selectValue(SETUP_TECHNOLOGY, 'Agentless');
        await cisIntegration.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
        await cisIntegration.selectValue(AWS_CREDENTIAL_SELECTOR, 'direct_access_keys');

        pageObjects.header.waitUntilLoadingHasFinished();

        expect(
          (await cisIntegrationAws.getLaunchCloudFormationAgentlessButton()) !== undefined
        ).to.be(true);
      });

      it('should hide CIS_AWS Launch Cloud formation button when setup technology selector is Agentless and credentials selector is temporary_keys ', async () => {
        await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(AWS_SINGLE_ACCOUNT_TEST_ID);
        await cisIntegration.clickAccordianButton(SETUP_TECHNOLOGY_SELECTOR_ACCORDION_TEST_SUBJ);
        await cisIntegration.clickOptionButton(SETUP_TECHNOLOGY);
        await cisIntegration.selectValue(SETUP_TECHNOLOGY, 'Agent-based');
        await cisIntegration.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
        await cisIntegration.selectValue(AWS_CREDENTIAL_SELECTOR, 'temporary-keys');

        pageObjects.header.waitUntilLoadingHasFinished();

        expect(
          (await cisIntegrationAws.getLaunchCloudFormationAgentlessButton()) !== undefined
        ).to.be(false);
      });
    });

    describe('CIS_AWS ORG Account Launch Cloud formation', () => {
      it('should show CIS_AWS Launch Cloud formation button when setup technology selector is Agentless and credentials selector is direct access keys', async () => {
        await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.clickAccordianButton(SETUP_TECHNOLOGY_SELECTOR_ACCORDION_TEST_SUBJ);
        await cisIntegration.clickOptionButton(SETUP_TECHNOLOGY);
        await cisIntegration.selectValue(SETUP_TECHNOLOGY, 'Agentless');
        await cisIntegration.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
        await cisIntegration.selectValue(AWS_CREDENTIAL_SELECTOR, 'direct_access_keys');

        pageObjects.header.waitUntilLoadingHasFinished();

        expect(
          (await cisIntegrationAws.getLaunchCloudFormationAgentlessButton()) !== undefined
        ).to.be(true);
      });

      it('should hide CIS_AWS Launch Cloud formation button when setup technology selector is Agent-based and credentials selector is direct access keys', async () => {
        await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(SETUP_TECHNOLOGY);
        await cisIntegration.selectValue(SETUP_TECHNOLOGY, 'Agent-based');
        await cisIntegration.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
        await cisIntegration.selectValue(AWS_CREDENTIAL_SELECTOR, 'temporary_keys');

        pageObjects.header.waitUntilLoadingHasFinished();

        expect(
          (await cisIntegrationAws.getLaunchCloudFormationAgentlessButton()) !== undefined
        ).to.be(false);
      });

      it('should hide CIS_AWS Launch Cloud formation button when setup technology selector is Agentless and credentials selector is temporary access', async () => {
        await cisIntegration.clickOptionButton(CIS_AWS_OPTION_TEST_ID);
        await cisIntegration.clickOptionButton(SETUP_TECHNOLOGY);
        await cisIntegration.selectValue(SETUP_TECHNOLOGY, 'Agentless');
        await cisIntegration.clickOptionButton(AWS_CREDENTIAL_SELECTOR);
        await cisIntegration.selectValue(AWS_CREDENTIAL_SELECTOR, 'temporary_keys');

        pageObjects.header.waitUntilLoadingHasFinished();

        expect(
          (await cisIntegrationAws.getLaunchCloudFormationAgentlessButton()) !== undefined
        ).to.be(false);
      });
    });
  });
}
