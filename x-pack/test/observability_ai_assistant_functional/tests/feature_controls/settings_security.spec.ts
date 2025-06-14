/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { createAndLoginUserWithCustomRole, deleteAndLogoutUser } from './helpers';
import { interceptRequest } from '../../common/intercept_request';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'error', 'navigationalSearch', 'security']);
  const ui = getService('observabilityAIAssistantUI');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const toasts = getService('toasts');
  const driver = getService('__webdriver__');

  // Failing: See https://github.com/elastic/kibana/issues/191707
  describe.skip('ai assistant management privileges', () => {
    describe('all privileges', () => {
      before(async () => {
        await createAndLoginUserWithCustomRole(getPageObjects, getService, {
          // we need all these privileges to view and modify Obs AI Assistant settings view
          observabilityAIAssistant: ['all'],
          // aiAssistantManagementSelection determines link visibility in stack management and navigating to the page
          // but not whether you can read/write the settings
          aiAssistantManagementSelection: ['all'],
          // advancedSettings determines whether user can read/write the settings
          advancedSettings: ['all'],
        });
      });

      after(async () => {
        await deleteAndLogoutUser(getService, getPageObjects);
      });

      it('shows AI Assistant settings link in solution nav', async () => {
        await PageObjects.common.navigateToUrl('management', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });
        await testSubjects.existOrFail(ui.pages.settings.managementLink);
      });

      it('allows access to ai assistant settings landing page', async () => {
        await PageObjects.common.navigateToUrl('aiAssistantManagementSelection', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });
      });
      it('allows access to obs ai assistant settings view', async () => {
        await PageObjects.common.navigateToUrl('obsAIAssistantManagement', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });
        await testSubjects.existOrFail(ui.pages.settings.settingsPage);
      });
      it('allows updating of an advanced setting', async () => {
        await PageObjects.common.navigateToUrl('obsAIAssistantManagement', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });
        const testSearchConnectorIndexPattern = 'my-search-index-pattern';
        const searchConnectorIndexPatternInput = await testSubjects.find(
          ui.pages.settings.searchConnectorIndexPatternInput
        );
        // make sure the input is empty (default value)
        await searchConnectorIndexPatternInput.clearValue();
        await searchConnectorIndexPatternInput.type(testSearchConnectorIndexPattern);
        const saveButton = await testSubjects.find(ui.pages.settings.saveButton);
        await saveButton.click();
        // wait for page to refrsh
        await testSubjects.missingOrFail(ui.pages.settings.searchConnectorIndexPatternInput, {
          timeout: 2000,
        });
        // wait for the new page to fully load
        await testSubjects.existOrFail(ui.pages.settings.searchConnectorIndexPatternInput, {
          timeout: 2000,
        });
        expect(await searchConnectorIndexPatternInput.getAttribute('value')).to.be(
          testSearchConnectorIndexPattern
        );
        // reset the value back to default
        const resetToDefaultLink = await testSubjects.find(ui.pages.settings.resetToDefaultLink);
        await resetToDefaultLink.click();

        expect(await searchConnectorIndexPatternInput.getAttribute('value')).to.be('');
        await saveButton.click();
        await testSubjects.missingOrFail(ui.pages.settings.searchConnectorIndexPatternInput, {
          timeout: 2000,
        });
        // wait for the new page to fully load
        await testSubjects.existOrFail(ui.pages.settings.searchConnectorIndexPatternInput, {
          timeout: 2000,
        });
        expect(await searchConnectorIndexPatternInput.getAttribute('value')).to.be('');
      });
      it('displays failure toast on failed request', async () => {
        const searchConnectorIndexPatternInput = await testSubjects.find(
          ui.pages.settings.searchConnectorIndexPatternInput
        );
        await searchConnectorIndexPatternInput.clearValue();
        await searchConnectorIndexPatternInput.type('test');

        await interceptRequest(
          driver.driver,
          '*kibana\\/settings*',
          (responseFactory) => {
            return responseFactory.fail();
          },
          async () => {
            await testSubjects.click(ui.pages.settings.saveButton);
          }
        );

        await retry.waitFor('Error saving settings toast', async () => {
          const count = await toasts.getCount();
          return count > 0;
        });
      });
    });
    describe('with advancedSettings read privilege', () => {
      before(async () => {
        await createAndLoginUserWithCustomRole(getPageObjects, getService, {
          observabilityAIAssistant: ['all'],
          aiAssistantManagementSelection: ['all'],
          advancedSettings: ['read'],
        });
      });

      after(async () => {
        await deleteAndLogoutUser(getService, getPageObjects);
      });

      it('shows AI Assistant settings link in solution nav', async () => {
        await PageObjects.common.navigateToUrl('management', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });
        await testSubjects.existOrFail(ui.pages.settings.managementLink);
      });

      it('allows access to ai assistant settings landing page', async () => {
        await PageObjects.common.navigateToUrl('aiAssistantManagementSelection', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });
        await testSubjects.existOrFail(ui.pages.settings.aiAssistantCard);
      });
      it('allows access to obs ai assistant settings page', async () => {
        await PageObjects.common.navigateToUrl('obsAIAssistantManagement', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });
        await testSubjects.existOrFail(ui.pages.settings.settingsPage);
      });
      it('has disabled inputs', async () => {
        const searchConnectorIndexPatternInput = await testSubjects.find(
          ui.pages.settings.searchConnectorIndexPatternInput
        );
        expect(await searchConnectorIndexPatternInput.getAttribute('disabled')).to.be('true');
      });
    });
    describe('observabilityAIAssistant privilege with no aiAssistantManagementSelection privilege', () => {
      before(async () => {
        await createAndLoginUserWithCustomRole(getPageObjects, getService, {
          // we need at least one feature available to login
          observabilityAIAssistant: ['all'],
        });
      });

      after(async () => {
        await deleteAndLogoutUser(getService, getPageObjects);
      });

      it('does not show AI Assistant settings link in solution nav', async () => {
        await PageObjects.common.navigateToUrl('management', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });
        await testSubjects.missingOrFail(ui.pages.settings.managementLink);
      });

      it('does not allow access to ai assistant settings landing page', async () => {
        await PageObjects.common.navigateToUrl('aiAssistantManagementSelection', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });
        await testSubjects.missingOrFail(ui.pages.settings.aiAssistantCard);
      });
      it('allows access to obs ai assistant settings page', async () => {
        await PageObjects.common.navigateToUrl('obsAIAssistantManagement', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });
        await testSubjects.missingOrFail(ui.pages.settings.settingsPage);
      });
    });
    describe('aiAssistantManagementSelection privilege with no observabilityAIAssistant privilege', () => {
      before(async () => {
        await createAndLoginUserWithCustomRole(getPageObjects, getService, {
          aiAssistantManagementSelection: ['all'],
          advancedSettings: ['all'],
        });
      });

      after(async () => {
        await deleteAndLogoutUser(getService, getPageObjects);
      });

      it('shows AI Assistant settings link in solution nav', async () => {
        await PageObjects.common.navigateToUrl('management', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });
        await testSubjects.existOrFail(ui.pages.settings.managementLink);
      });

      it('allows access to ai assistant settings landing page', async () => {
        await PageObjects.common.navigateToUrl('aiAssistantManagementSelection', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });
        await testSubjects.existOrFail(ui.pages.settings.aiAssistantCard);
      });
      it('does not allow access to obs ai assistant settings page', async () => {
        await PageObjects.common.navigateToUrl('obsAIAssistantManagement', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });
        await testSubjects.missingOrFail(ui.pages.settings.settingsPage);
      });
    });
  });
}
