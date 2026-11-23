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

    spaceTest('without note', async ({ kbnClient, scoutSpace, pageObjects, endpointPolicy }) => {
      const { protectionUpdates } = pageObjects;
      const oneWeekAgo = moment.utc().subtract(7, 'days');
      await setManifestVersion(
        kbnClient,
        scoutSpace.id,
        endpointPolicy.id,
        oneWeekAgo.format('YYYY-MM-DD')
      );

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
      // With no note to show, a read-only user gets no note section at all.
      await expect(protectionUpdates.noteTitle).toBeHidden();
      await expect(protectionUpdates.noteViewMode).toBeHidden();
      await expect(protectionUpdates.note).toBeHidden();
    });
  }
);
