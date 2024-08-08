/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { interceptRequest } from '../../common/intercept_request';
import { createAndLoginUserWithCustomRole, deleteAndLogoutUser } from './helpers';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'error', 'navigationalSearch', 'security']);
  const ui = getService('observabilityAIAssistantUI');
  const testSubjects = getService('testSubjects');
  const driver = getService('__webdriver__');
  const retry = getService('retry');
  const toasts = getService('toasts');

  describe('ai assistant management privileges', () => {
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
        const testLogsIndexPattern = 'my-logs-index-pattern';
        const logsIndexPatternInput = await testSubjects.find(
          ui.pages.settings.logsIndexPatternInput
        );
        await logsIndexPatternInput.clearValue();
        await logsIndexPatternInput.type(testLogsIndexPattern);
        const saveButton = await testSubjects.find(ui.pages.settings.saveButton);
        await saveButton.click();
        await browser.refresh();
        const logsIndexPatternInputValue = await logsIndexPatternInput.getAttribute('value');
        expect(logsIndexPatternInputValue).to.be(testLogsIndexPattern);
        // reset the value
        await logsIndexPatternInput.clearValue();
        await logsIndexPatternInput.type('logs-*');
        await saveButton.click();
      });
      it('displays failure toast on failed request', async () => {
        const logsIndexPatternInput = await testSubjects.find(
          ui.pages.settings.logsIndexPatternInput
        );
        // Wait until the input has the default value 'logs-*' to prevent flakiness
        await retry.waitFor('input field to have default value', async () => {
          const value = await logsIndexPatternInput.getAttribute('value');
          return value === 'logs-*';
        });
        await logsIndexPatternInput.clearValue();
        await logsIndexPatternInput.type('test');

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
        const logsIndexPatternInput = await testSubjects.find(
          ui.pages.settings.logsIndexPatternInput
        );
        expect(await logsIndexPatternInput.getAttribute('disabled')).to.be('true');
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
