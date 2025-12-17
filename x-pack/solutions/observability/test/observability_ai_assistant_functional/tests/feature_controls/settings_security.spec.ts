/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { createAndLoginUserWithCustomRole, deleteAndLogoutUser } from './helpers';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'error', 'navigationalSearch', 'security']);
  const ui = getService('observabilityAIAssistantUI');
  const testSubjects = getService('testSubjects');

  describe('ai assistant management privileges', () => {
    describe('all privileges', () => {
      before(async () => {
        await createAndLoginUserWithCustomRole(getPageObjects, getService, {
          // Only need observabilityAIAssistant privilege to access settings
          observabilityAIAssistant: ['all'],
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

      it('redirects directly to observability ai assistant settings', async () => {
        await PageObjects.common.navigateToUrl('aiAssistantManagementSelection', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });

        await testSubjects.existOrFail(ui.pages.settings.settingsPage);
      });
    });
    describe('with advancedSettings read privilege', () => {
      before(async () => {
        await createAndLoginUserWithCustomRole(getPageObjects, getService, {
          observabilityAIAssistant: ['all'],
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

      it('redirects directly to observability ai assistant settings', async () => {
        await PageObjects.common.navigateToUrl('aiAssistantManagementSelection', '', {
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
    describe('without observabilityAIAssistant privilege', () => {
      before(async () => {
        await createAndLoginUserWithCustomRole(getPageObjects, getService, {
          // User has no AI Assistant privileges
          advancedSettings: ['all'],
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
