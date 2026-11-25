/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { expect } from '@kbn/scout-security/ui';
import { spaceTest, tags } from '../fixtures';
import { setManifestVersion, setProtectionUpdatesNote } from '../fixtures/protection_updates_data';

const NOTE = 'test note';
// 0 means the wait has no own timer; it is bounded by the test timeout.
const NO_OWN_TIMEOUT_MS = 0;
// Starts only once the tab is ready, so it never spends the cold navigation's budget; the lookup
// is sent while the tab loads, so its answer is normally already there by then.
const NOTE_LOOKUP_DEADLINE_MS = 30_000;

spaceTest.describe(
  'Policy details - protection updates (read only)',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      // Has policy management read but not write.
      await browserAuth.loginAsSecurityRole('t3_analyst');
    });

    spaceTest('with note', async ({ kbnClient, scoutSpace, pageObjects, endpointPolicy }) => {
      const { protectionUpdates } = pageObjects;
      const oneWeekAgo = moment.utc().subtract(7, 'days');
      await setManifestVersion(
        kbnClient,
        scoutSpace.id,
        endpointPolicy.id,
        oneWeekAgo.format('YYYY-MM-DD')
      );
      await setProtectionUpdatesNote(kbnClient, scoutSpace.id, endpointPolicy.id, NOTE);

      await protectionUpdates.goto(endpointPolicy.id);
      await expect(protectionUpdates.automaticUpdatesViewMode).toBeVisible();
      await expect(protectionUpdates.automaticUpdatesSwitch).toBeHidden();
      await expect(protectionUpdates.deployedVersionTitle).toBeVisible();
      await expect(protectionUpdates.deployedVersion).toHaveText(
        oneWeekAgo.format('MMMM DD, YYYY')
      );
      await expect(protectionUpdates.versionToDeployTitle).toBeVisible();
      await expect(protectionUpdates.versionToDeployViewMode).toBeVisible();
      await expect(protectionUpdates.versionToDeployPicker).toBeHidden();
      await expect(protectionUpdates.noteTitle).toBeVisible();
      await expect(protectionUpdates.noteViewMode).toHaveText(NOTE);
      await expect(protectionUpdates.note).toBeHidden();
      await expect(protectionUpdates.saveButton).toBeDisabled();
    });

    spaceTest(
      'without note',
      async ({ page, kbnClient, scoutSpace, pageObjects, endpointPolicy }) => {
        const { protectionUpdates } = pageObjects;
        const oneWeekAgo = moment.utc().subtract(7, 'days');
        await setManifestVersion(
          kbnClient,
          scoutSpace.id,
          endpointPolicy.id,
          oneWeekAgo.format('YYYY-MM-DD')
        );

        // The page has no UI signal for "no note found", so wait for the lookup itself. It is armed
        // before the page loads so the response cannot be missed.
        const noteLookup = page.waitForResponse(
          (response) =>
            response.request().method() === 'GET' &&
            response.url().includes(`/api/endpoint/protection_updates_note/${endpointPolicy.id}`),
          { timeout: NO_OWN_TIMEOUT_MS }
        );
        // Keeps the promise from rejecting unobserved if a step before the await below throws.
        noteLookup.catch(() => {});

        await protectionUpdates.goto(endpointPolicy.id);
        await expect(protectionUpdates.automaticUpdatesViewMode).toBeVisible();
        await expect(protectionUpdates.automaticUpdatesSwitch).toBeHidden();
        await expect(protectionUpdates.deployedVersionTitle).toBeVisible();
        await expect(protectionUpdates.deployedVersion).toHaveText(
          oneWeekAgo.format('MMMM DD, YYYY')
        );
        await expect(protectionUpdates.versionToDeployTitle).toBeVisible();
        await expect(protectionUpdates.versionToDeployViewMode).toBeVisible();
        await expect(protectionUpdates.versionToDeployPicker).toBeHidden();
        await expect(protectionUpdates.saveButton).toBeDisabled();
        // Awaited only once the tab is ready: the lookup has no own timer, so a cold load cannot
        // expire it; the deadline below starts now and gives a missing answer a clear failure.
        let deadline: ReturnType<typeof setTimeout> | undefined;
        try {
          const noteResponse = await Promise.race([
            noteLookup,
            new Promise<never>((_, reject) => {
              deadline = setTimeout(
                () => reject(new Error('The note lookup for the policy never answered')),
                NOTE_LOOKUP_DEADLINE_MS
              );
            }),
          ]);
          expect(noteResponse.status()).toBe(404);
        } finally {
          clearTimeout(deadline);
        }
        // With no note to show, a read-only user gets no note section at all.
        await expect(protectionUpdates.noteTitle).toBeHidden();
        await expect(protectionUpdates.noteViewMode).toBeHidden();
        await expect(protectionUpdates.note).toBeHidden();
      }
    );
  }
);
