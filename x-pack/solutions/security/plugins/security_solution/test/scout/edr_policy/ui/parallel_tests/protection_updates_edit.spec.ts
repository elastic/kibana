/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { expect } from '@kbn/scout-security/ui';
import { spaceTest, tags } from '../fixtures';
import {
  getNoteWriterAuthHeaders,
  NOTE_WRITER_ROLE,
  setManifestVersion,
  setProtectionUpdatesNote,
} from '../fixtures/protection_updates_data';

const DISPLAY_DATE_FORMAT = 'MMMM DD, YYYY';
const MANIFEST_DATE_FORMAT = 'YYYY-MM-DD';
const NOTE = 'test note';
const UPDATED_NOTE = 'updated test note';

const daysAgo = (days: number) => moment.utc().subtract(days, 'days');

spaceTest.describe(
  'Policy details - protection updates (edit)',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      // The note writer, so that seeding the note on stateful keeps the worker's custom role as is.
      await browserAuth.loginAsSecurityRole(NOTE_WRITER_ROLE);
    });

    spaceTest('renders tab content', async ({ page, pageObjects, endpointPolicy }) => {
      const { protectionUpdates } = pageObjects;
      // Noon UTC keeps the page's "yesterday" and the expected date on the same side of midnight.
      const clockStart = moment.utc().startOf('day').add(12, 'hours');

      await spaceTest.step('automatic updates are on by default', async () => {
        await page.clock.install({ time: clockStart.toDate() });
        await protectionUpdates.goto(endpointPolicy.id);
        await expect(protectionUpdates.warningCallout).toBeVisible();
        await expect(protectionUpdates.automaticUpdatesEnabledCallout).toBeVisible();
        await expect(protectionUpdates.automaticUpdatesSwitch).toBeVisible();
        await expect(protectionUpdates.title).toBeVisible();
        await expect(protectionUpdates.saveButton).toBeDisabled();
      });

      await spaceTest.step('turning them off shows the manual version form', async () => {
        // The page picks yesterday, by the browser clock, as the default version when it loads.
        const defaultDate = clockStart.clone().subtract(1, 'days').format(DISPLAY_DATE_FORMAT);
        await protectionUpdates.toggleAutomaticUpdates();
        await expect(protectionUpdates.deployedVersionTitle).toBeVisible();
        await expect(protectionUpdates.deployedVersion).toHaveText('latest');
        await expect(protectionUpdates.versionToDeployTitle).toBeVisible();
        await expect(protectionUpdates.versionToDeployInput).toHaveValue(defaultDate);
        await expect(protectionUpdates.noteTitle).toBeVisible();
        await expect(protectionUpdates.note).toBeVisible();
        await expect(protectionUpdates.saveButton).toBeEnabled();
      });
    });

    spaceTest('unsaved changes guard', async ({ page, pageObjects, endpointPolicy }) => {
      const { protectionUpdates, policyDetailsUnsavedChangesModal } = pageObjects;

      await spaceTest.step('Back keeps the user and the change on the tab', async () => {
        await protectionUpdates.goto(endpointPolicy.id);
        await protectionUpdates.toggleAutomaticUpdates();
        await protectionUpdates.openSettingsTab();
        await expect(policyDetailsUnsavedChangesModal.modal).toBeVisible();
        await policyDetailsUnsavedChangesModal.back();
        await expect(page).toHaveURL(/\/protectionUpdates/);
        await expect(protectionUpdates.saveButton).toBeEnabled();
      });

      await spaceTest.step('Continue without saving opens the settings tab', async () => {
        await protectionUpdates.openSettingsTab();
        await expect(policyDetailsUnsavedChangesModal.modal).toBeVisible();
        await policyDetailsUnsavedChangesModal.continueWithoutSaving();
        await expect(page).toHaveURL(/\/settings/);
      });
    });

    spaceTest('custom date', async ({ pageObjects, endpointPolicy }) => {
      const { protectionUpdates } = pageObjects;
      const customDate = daysAgo(2).format(DISPLAY_DATE_FORMAT);

      await spaceTest.step('choose a date and a note, then save', async () => {
        await protectionUpdates.goto(endpointPolicy.id);
        await expect(protectionUpdates.saveButton).toBeDisabled();
        await protectionUpdates.toggleAutomaticUpdates();
        await protectionUpdates.replaceNote(NOTE);
        await protectionUpdates.setVersionToDeploy(customDate);
        await expect(protectionUpdates.versionToDeployInput).toHaveValue(customDate);
        await protectionUpdates.save();
        await expect(protectionUpdates.successToast).toBeVisible();
        await expect(protectionUpdates.deployedVersion).toHaveText(customDate);
        await expect(protectionUpdates.note).toHaveValue(NOTE);
        await expect(protectionUpdates.saveButton).toBeDisabled();
      });

      await spaceTest.step('the date and the note persist after a reload', async () => {
        await protectionUpdates.goto(endpointPolicy.id);
        await expect(protectionUpdates.deployedVersion).toHaveText(customDate);
        await expect(protectionUpdates.note).toHaveValue(NOTE);
        // The picker starts at yesterday again, which differs from the deployed version.
        await expect(protectionUpdates.saveButton).toBeEnabled();
        await protectionUpdates.save();
        await expect(protectionUpdates.successToast).toBeVisible();
        await expect(protectionUpdates.saveButton).toBeDisabled();
      });
    });

    spaceTest(
      'no modal on custom date',
      async ({ page, kbnClient, scoutSpace, pageObjects, endpointPolicy }) => {
        const { protectionUpdates, policyDetailsUnsavedChangesModal } = pageObjects;
        await setManifestVersion(
          kbnClient,
          scoutSpace.id,
          endpointPolicy.id,
          daysAgo(7).format(MANIFEST_DATE_FORMAT)
        );

        await protectionUpdates.goto(endpointPolicy.id);
        // Save is enabled because the picker starts at yesterday, not at the deployed date.
        await expect(protectionUpdates.saveButton).toBeEnabled();
        await protectionUpdates.openSettingsTab();
        await expect(page).toHaveURL(/\/settings/);
        await expect(policyDetailsUnsavedChangesModal.modal).toBeHidden();
      }
    );

    spaceTest('back to latest', async ({ kbnClient, scoutSpace, pageObjects, endpointPolicy }) => {
      const { protectionUpdates } = pageObjects;
      await setManifestVersion(
        kbnClient,
        scoutSpace.id,
        endpointPolicy.id,
        daysAgo(7).format(MANIFEST_DATE_FORMAT)
      );

      await spaceTest.step('turn automatic updates back on and save', async () => {
        await protectionUpdates.goto(endpointPolicy.id);
        await expect(protectionUpdates.saveButton).toBeEnabled();
        await protectionUpdates.toggleAutomaticUpdates();
        await protectionUpdates.save();
        await expect(protectionUpdates.successToast).toBeVisible();
        await expect(protectionUpdates.automaticUpdatesEnabledCallout).toBeVisible();
        await expect(protectionUpdates.saveButton).toBeDisabled();
      });

      await spaceTest.step('automatic updates stay on after a reload', async () => {
        await protectionUpdates.goto(endpointPolicy.id);
        await expect(protectionUpdates.automaticUpdatesEnabledCallout).toBeVisible();
        await expect(protectionUpdates.saveButton).toBeDisabled();
      });
    });

    spaceTest(
      'update note',
      async ({
        kbnClient,
        samlAuth,
        config,
        endpointManagementApi,
        scoutSpace,
        pageObjects,
        endpointPolicy,
      }) => {
        const { protectionUpdates } = pageObjects;
        await setManifestVersion(
          kbnClient,
          scoutSpace.id,
          endpointPolicy.id,
          daysAgo(7).format(MANIFEST_DATE_FORMAT)
        );
        await setProtectionUpdatesNote({
          endpointManagementApi,
          authHeaders: await getNoteWriterAuthHeaders(samlAuth, config),
          spaceId: scoutSpace.id,
          policyId: endpointPolicy.id,
          note: NOTE,
        });

        await spaceTest.step('replace the note and save', async () => {
          await protectionUpdates.goto(endpointPolicy.id);
          await expect(protectionUpdates.saveButton).toBeEnabled();
          await expect(protectionUpdates.note).toHaveValue(NOTE);
          await protectionUpdates.replaceNote(UPDATED_NOTE);
          await protectionUpdates.save();
          await expect(protectionUpdates.successToast).toBeVisible();
          await expect(protectionUpdates.note).toHaveValue(UPDATED_NOTE);
          await expect(protectionUpdates.saveButton).toBeDisabled();
        });

        await spaceTest.step('the new note persists after a reload', async () => {
          await protectionUpdates.goto(endpointPolicy.id);
          await expect(protectionUpdates.note).toHaveValue(UPDATED_NOTE);
        });
      }
    );
  }
);
