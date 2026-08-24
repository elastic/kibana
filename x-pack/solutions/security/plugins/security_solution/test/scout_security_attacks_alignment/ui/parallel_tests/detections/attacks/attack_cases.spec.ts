/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * End-to-end coverage for attaching an attack to a case as a first-class
 * `security.attack` attachment.
 *
 * Covers:
 *  - "Add to new case" on the Attacks page take-action menu creates the attachment, and the
 *    case shows the attack preview card in the Activity log and an Attacks section in the
 *    consolidated Attachments tab.
 *  - The "Show attack details" affordance on the preview card opens the attack flyout.
 *
 * The `security.attack` type is registered only when `attackAttachmentsEnabled` is on; the
 * attacks-alignment Scout config boots with it (see
 * `kbn-scout/src/servers/configs/config_sets/security_attacks_alignment/shared.ts`).
 *
 * To run locally:
 *
 *   node scripts/scout.js run-tests --arch stateful --domain classic \
 *     --config x-pack/solutions/security/plugins/security_solution/test/scout_security_attacks_alignment/ui/parallel.playwright.config.ts
 */

import { expect } from '@kbn/scout-security/ui';
import { spaceTest, tags } from '../../../fixtures';

const ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING =
  'securitySolution:enableAlertsAndAttacksAlignment';
const ENABLE_NEW_FLYOUT_SETTING = 'securitySolution:enableNewFlyout';

const CASE_DESCRIPTION = 'Created by the Scout attack case-attachment test';

spaceTest.describe(
  'Attack case attachments',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await apiServices.attackDiscovery.seedAttackData();
    });

    spaceTest.beforeEach(async ({ apiServices, browserAuth, scoutSpace }) => {
      await apiServices.cases.cleanup.deleteAllCases(scoutSpace.id);
      await scoutSpace.uiSettings.set({
        [ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING]: true,
        // The attack attachment's navigation button supports both flyouts; pin the legacy one
        // so this suite asserts the same flyout body as the rest of the attacks specs.
        [ENABLE_NEW_FLYOUT_SETTING]: false,
      });
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices, scoutSpace }) => {
      await apiServices.cases.cleanup.deleteAllCases(scoutSpace.id);
      await scoutSpace.uiSettings.unset(ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING);
      await scoutSpace.uiSettings.unset(ENABLE_NEW_FLYOUT_SETTING);
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'attaches an attack to a new case and renders the preview card and Attacks section',
      async ({ pageObjects }) => {
        const { detectionsAttackDiscoveryPage, attackCases } = pageObjects;
        const caseName = 'Scout attack attachment case – render';

        await spaceTest.step('attach the first attack to a new case', async () => {
          await detectionsAttackDiscoveryPage.navigateToAttacksPage();
          await detectionsAttackDiscoveryPage.collapseKpisSection();
          await expect(detectionsAttackDiscoveryPage.attacksTableSection).toBeVisible();

          await attackCases.openFirstAttackTakeActionMenu();
          await attackCases.clickAddToNewCase();
          await attackCases.createCase(caseName, CASE_DESCRIPTION);
          await attackCases.clickCaseToastLink();
        });

        await spaceTest.step('the activity log renders the attack preview card', async () => {
          await expect(attackCases.activityAttackTitle).toBeVisible();
          // Rendered straight from the persisted metadata snapshot — no follow-up query.
          await expect(attackCases.activityAttackAlertCount).toBeVisible();
          await expect(attackCases.showAttackButton).toBeVisible();
        });

        await spaceTest.step(
          'the Attachments tab renders an Attacks section distinct from Alerts',
          async () => {
            await attackCases.openAttachmentsTab();
            await expect(attackCases.attackAccordion).toBeVisible();
            await expect(attackCases.attackAccordionBadge).toHaveText('1');
            await expect(attackCases.attackTable).toBeVisible();
            await expect(attackCases.attackTableRowTitles).toHaveCount(1);
          }
        );
      }
    );

    spaceTest(
      'opens the attack flyout from the attachment "Show attack details" action',
      async ({ pageObjects }) => {
        const { detectionsAttackDiscoveryPage, attackCases } = pageObjects;
        const caseName = 'Scout attack attachment case – navigation';

        await spaceTest.step('attach the first attack to a new case', async () => {
          await detectionsAttackDiscoveryPage.navigateToAttacksPage();
          await detectionsAttackDiscoveryPage.collapseKpisSection();
          await expect(detectionsAttackDiscoveryPage.attacksTableSection).toBeVisible();

          await attackCases.openFirstAttackTakeActionMenu();
          await attackCases.clickAddToNewCase();
          await attackCases.createCase(caseName, CASE_DESCRIPTION);
          await attackCases.clickCaseToastLink();
        });

        await spaceTest.step('clicking Show attack details opens the attack flyout', async () => {
          await attackCases.openAttackFlyoutFromActivity();
          await expect(attackCases.attackDetailsFlyoutBody).toBeVisible();
        });
      }
    );
  }
);
