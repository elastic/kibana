/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { spaceTest, tags } from '../fixtures';

spaceTest.describe(
  'Policy details - policy settings unsaved changes',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsSecurityRole('endpoint_operations_analyst');
    });

    spaceTest('unsaved changes guard', async ({ page, pageObjects, endpointPolicy }) => {
      const { policySettings, policyDetailsUnsavedChangesModal, protectionUpdates } = pageObjects;
      let initialMalwareState = '';

      await spaceTest.step('a change to the form enables the save button', async () => {
        await policySettings.goto(endpointPolicy.id);
        await expect(policySettings.saveButton).toBeDisabled();
        await expect(policySettings.protectionUpdatesTab).toBeVisible();
        initialMalwareState =
          (await policySettings.malwareProtectionSwitch.getAttribute('aria-checked')) ?? '';
        expect(['true', 'false']).toContain(initialMalwareState);

        await policySettings.toggleMalwareProtection();
        await expect(policySettings.malwareProtectionSwitch).toHaveAttribute(
          'aria-checked',
          initialMalwareState === 'true' ? 'false' : 'true'
        );
        await expect(policySettings.saveButton).toBeEnabled();
      });

      await spaceTest.step('Back keeps the user and the change on the tab', async () => {
        await policySettings.openProtectionUpdatesTab();
        await expect(policyDetailsUnsavedChangesModal.modal).toBeVisible();
        await policyDetailsUnsavedChangesModal.back();
        await expect(page).toHaveURL(/\/settings/);
        await expect(policySettings.saveButton).toBeEnabled();
      });

      await spaceTest.step('Continue without saving opens the protection updates tab', async () => {
        await policySettings.openProtectionUpdatesTab();
        await expect(policyDetailsUnsavedChangesModal.modal).toBeVisible();
        await policyDetailsUnsavedChangesModal.continueWithoutSaving();
        await expect(page).toHaveURL(/\/protectionUpdates/);
        await expect(protectionUpdates.title).toBeVisible();
      });

      await spaceTest.step('the discarded change is gone on the settings tab', async () => {
        await protectionUpdates.openSettingsTab();
        await expect(page).toHaveURL(/\/settings/);
        await expect(policySettings.malwareProtectionSwitch).toHaveAttribute(
          'aria-checked',
          initialMalwareState
        );
        await expect(policySettings.saveButton).toBeDisabled();
      });
    });
  }
);
