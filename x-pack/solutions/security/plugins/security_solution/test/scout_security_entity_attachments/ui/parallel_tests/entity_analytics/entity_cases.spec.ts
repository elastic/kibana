/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Entity attachment cases E2E test.
 *
 * Runs against the `security_entity_attachments` Scout config set, which boots
 * Kibana with both `entityAttachmentsEnabled` (registers the `security.entity`
 * cases attachment type + flyout "Add to case" actions) and
 * `xpack.cases.attachments.enabled` (the Cases unified-attachments framework the
 * type depends on). The entity store is running by default, so the suite seeds a
 * host entry to give it a canonical `entity.id` (EUID); that lets the flyout
 * "Add to case" actions surface.
 *
 * The test drives the real user flow end to end: open the host entity flyout,
 * "Add to new case", create the case, then verify the attached entity renders in
 * it. Cases has no dedicated "Entities" tab — the `security.entity` attachment
 * renders as an inline card in the case Activity feed (entity name straight from
 * the persisted metadata). We assert that card because it's deterministic and
 * doesn't depend on the entity-store read privileges that gate the
 * Attachments-tab table.
 */

import {
  spaceTest,
  tags,
  ENTITY_CASE_HOST_ENTITY_ID,
  ENTITY_CASE_HOST_NAME,
} from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Entity attachment cases – flyout add-to-case and attached entity',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeAll(async ({ apiServices }) => {
      await apiServices.entityAnalytics.installEntityStoreV2(['host']);
      await apiServices.entityAnalytics.indexEntityStoreEntry(
        ENTITY_CASE_HOST_ENTITY_ID,
        ENTITY_CASE_HOST_NAME
      );
    });

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
      await apiServices.cases.cleanup.deleteAllCases(scoutSpace.id);
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices, scoutSpace }) => {
      await apiServices.cases.cleanup.deleteAllCases(scoutSpace.id);
      // Defensive catch-all after the domain-specific cleanup above: removes any
      // saved objects that helper doesn't cover, since leaked objects break parallel workers.
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest.afterAll(async ({ apiServices }) => {
      await apiServices.entityAnalytics.uninstallEntityStoreV2(['host']);
    });

    spaceTest(
      'adds a host entity to a new case and the case shows the attached entity',
      async ({ pageObjects, scoutSpace }) => {
        const { casesAttachmentPage, entityCasesTabPage } = pageObjects;
        const caseName = `Scout entity case – host – ${scoutSpace.id}`;

        await spaceTest.step('open host flyout and click Add to new case', async () => {
          await casesAttachmentPage.navigateToHostFlyout();
          await casesAttachmentPage.openTakeActionMenu();
          await casesAttachmentPage.clickAddToNewCase();
        });

        await spaceTest.step('create the case via the Cases flyout', async () => {
          await casesAttachmentPage.fillCaseName(caseName);
          await casesAttachmentPage.fillCaseDescription('Created by Scout entity attachment test');
          await casesAttachmentPage.submitNewCase();
        });

        await spaceTest.step('navigate to the new case and check the attached entity', async () => {
          await casesAttachmentPage.clickCaseToastLink();

          // The attachment card in the Activity feed renders the seeded entity's
          // name, proving the flyout -> attach -> render round-trip.
          await expect(entityCasesTabPage.entityNameCell(ENTITY_CASE_HOST_NAME)).toBeVisible();
        });
      }
    );
  }
);
