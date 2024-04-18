/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'indexManagement', 'header']);
  const toasts = getService('toasts');
  const log = getService('log');
  const browser = getService('browser');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const es = getService('es');

  const ENRICH_INDEX_NAME = 'test-policy-1';
  const ENRICH_POLICY_NAME = 'test-policy-1';

  // FLAKY: https://github.com/elastic/kibana/issues/178962
  describe.skip('Enrich policies tab', function () {
    before(async () => {
      await log.debug('Creating required index and enrich policy');
      try {
        await es.indices.create({
          index: ENRICH_INDEX_NAME,
          body: {
            mappings: {
              properties: {
                name: {
                  type: 'text',
                },
              },
            },
          },
        });

        await es.enrich.putPolicy({
          name: ENRICH_POLICY_NAME,
          match: {
            indices: ENRICH_INDEX_NAME,
            match_field: 'name',
            enrich_fields: ['name'],
          },
        });
      } catch (e) {
        log.debug('[Setup error] Error creating test policy');
        throw e;
      }

      await log.debug('Navigating to the enrich policies tab');
      await security.testUser.setRoles(['index_management_user']);
      await pageObjects.common.navigateToApp('indexManagement');
      // Navigate to the enrich policies tab
      await pageObjects.indexManagement.changeTabs('enrich_policiesTab');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await log.debug('Cleaning up created index and policy');

      try {
        await es.indices.delete({ index: ENRICH_INDEX_NAME });
      } catch (e) {
        log.debug('[Teardown error] Error deleting test policy');
        throw e;
      }
    });

    it('shows enrich policies page and docs link', async () => {
      expect(await testSubjects.exists('enrichPoliciesList')).to.be(true);
      expect(await testSubjects.exists('enrichPoliciesLearnMoreLink')).to.be(true);
    });

    it('shows the details flyout when clicking on a policy name', async () => {
      // Open details flyout
      await pageObjects.indexManagement.clickEnrichPolicyAt(0);
      // Verify url is stateful
      const url = await browser.getCurrentUrl();
      expect(url).to.contain('/enrich_policies?policy=');
      // Assert that flyout is opened
      expect(await testSubjects.exists('policyDetailsFlyout')).to.be(true);
      // Close flyout
      await testSubjects.click('closeFlyoutButton');
    });

    it('can execute a policy', async () => {
      await pageObjects.indexManagement.clickExecuteEnrichPolicyAt(0);
      await pageObjects.indexManagement.clickConfirmModalButton();

      const successToast = await toasts.getElementByIndex(1);
      expect(await successToast.getVisibleText()).to.contain(`Executed ${ENRICH_POLICY_NAME}`);
    });

    it('can delete a policy', async () => {
      await pageObjects.indexManagement.clickDeleteEnrichPolicyAt(0);
      await pageObjects.indexManagement.clickConfirmModalButton();

      const successToast = await toasts.getElementByIndex(2);
      expect(await successToast.getVisibleText()).to.contain(`Deleted ${ENRICH_POLICY_NAME}`);
    });
  });
};
