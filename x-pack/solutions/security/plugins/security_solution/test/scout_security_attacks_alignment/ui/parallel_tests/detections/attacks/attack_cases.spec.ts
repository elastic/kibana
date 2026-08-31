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
 *    case shows the attack card in the Activity log and an Attacks section in the consolidated
 *    Attachments tab.
 *  - The Activity log card reads like the Attacks page: the detected-on line, the clamped entity
 *    summary, the summary markdown, the Details section and the attack chain, all rendered as
 *    formatted markdown, and none of the Attacks page's calls to action.
 *  - The Attacks section renders as a data grid that reads as a sibling of the Alerts section
 *    above it: the default column set, the toolbar's column and sort selectors, the column
 *    picker and its persistence, and the two row actions.
 *  - The "Show attack details" affordance opens the attack flyout, both from the Activity log
 *    card and from the grid's row actions.
 *  - Removing the attack from the Attacks section, with the prompt's "also remove related
 *    alerts" checkbox ticked, takes the attack and the alerts it brought in off the case, both
 *    one row at a time and for a whole selection through the bulk action bar.
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
import { ATTACK_GRID_COLUMN_ID } from '../../../fixtures/page_objects/attack_cases_page';

const ENABLE_ALERTS_AND_ATTACKS_ALIGNMENT_SETTING =
  'securitySolution:enableAlertsAndAttacksAlignment';
const ENABLE_NEW_FLYOUT_SETTING = 'securitySolution:enableNewFlyout';

const CASE_DESCRIPTION = 'Created by the Scout attack case-attachment test';

// The narrative of the seeded attacks, from `apiServices.attackDiscovery.seedAttackData`. Both
// seeded attacks share these prefixes, so the assertions hold whichever group the table lists
// first, and the manual one only appends " (manual)".
const SEEDED_TITLE = 'Scout seeded attack discovery';
const SEEDED_SUMMARY = 'Seeded with synthetic alert IDs';
const SEEDED_DETAILS = 'Seeded by Scout attacks space setup';
const SEEDED_ENTITY_SUMMARY = 'Seeded entity summary';
// Every seeded attack carries two constituent alerts.
const SEEDED_ALERT_COUNT = '2';

// The shared placeholder a column renders when it has no value, from
// `public/common/components/empty_value` (`getEmptyValue`). Inlined rather than imported to keep
// the Kibana public bundle out of the Playwright process.
const EMPTY_VALUE = '—';

spaceTest.describe(
  'Attack case attachments',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await apiServices.attackDiscovery.seedAttackData();
    });

    spaceTest.beforeEach(async ({ apiServices, browserAuth, page, scoutSpace }) => {
      // The case view spends its width on the navigation and the case-settings panel, leaving the
      // attachment sections a narrow column. At Playwright's default 1280 the attacks grid is
      // narrower than its columns, and a data grid keeps only the columns it can show in the DOM —
      // so the rightmost ones would be unassertable for reasons of window size rather than of
      // behaviour.
      await page.setViewportSize({ width: 1920, height: 1080 });
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
      'attaches an attack to a new case and renders the preview card and Attacks grid',
      async ({ pageObjects }) => {
        const { detectionsAttackDiscoveryPage, attackCases } = pageObjects;
        const caseName = 'Scout attack attachment case – render';
        let caseId = '';

        await spaceTest.step('attach the first attack to a new case', async () => {
          await detectionsAttackDiscoveryPage.navigateToAttacksPage();
          await detectionsAttackDiscoveryPage.collapseKpisSection();
          await expect(detectionsAttackDiscoveryPage.attacksTableSection).toBeVisible();

          await attackCases.openFirstAttackTakeActionMenu();
          await attackCases.clickAddToNewCase();
          await attackCases.createCase(caseName, CASE_DESCRIPTION);
          await attackCases.clickCaseToastLink();

          caseId = await attackCases.getOpenCaseId();
        });

        await spaceTest.step(
          'the activity log renders the attack with the Attacks page sections',
          async () => {
            // Every section is rendered straight from the persisted metadata snapshot — the card
            // never queries the attack back.
            await expect(attackCases.activityAttackTitle).toBeVisible();
            await expect(attackCases.activityAttackDetectedOn).toBeVisible();
            await expect(attackCases.activityAttackAlertCount).toBeVisible();
            await expect(attackCases.activityAttackEntitySummary).toContainText(
              SEEDED_ENTITY_SUMMARY
            );
            await expect(attackCases.activityAttackSummaryContent).toContainText(SEEDED_SUMMARY);
            await expect(attackCases.activityAttackDetailsTitle).toBeVisible();
            await expect(attackCases.activityAttackDetailsContent).toContainText(SEEDED_DETAILS);
            // Both seeded attacks carry MITRE tactics, so the attack chain is always present here.
            await expect(attackCases.activityAttackChainTitle).toBeVisible();
            await expect(attackCases.showAttackButton).toBeVisible();
          }
        );

        await spaceTest.step('the narrative is rendered as formatted markdown', async () => {
          // The snapshot is de-anonymised at attach time and rendered by the markdown formatter,
          // so no field token syntax may reach the screen. The seeded narrative carries no
          // `{{ field value }}` tokens today, so this guards the wiring rather than the parser —
          // token resolution itself is covered by `attack_children.test.tsx`.
          expect(await attackCases.getActivityAttackCardText()).not.toContain('{{');
        });

        await spaceTest.step('the card renders none of the Attacks page CTAs', async () => {
          // "Add to chat" / "View in AI Assistant" and "Investigate in timeline" stay behind on the
          // Attacks page: the card is a read-only snapshot, and mounting the assistant button
          // registers a global prompt context per attachment.
          await expect(attackCases.activityAttackAiAssistantCta).toHaveCount(0);
          await expect(attackCases.activityAttackInvestigateInTimelineCta).toHaveCount(0);
        });

        await spaceTest.step(
          'the Attachments tab renders an Attacks grid distinct from Alerts',
          async () => {
            await attackCases.openAttachmentsTab();
            await expect(attackCases.attackAccordion).toBeVisible();
            await expect(attackCases.attackAccordionBadge).toHaveText('1');
            await expect(attackCases.attackGrid).toBeVisible();
            await expect(attackCases.attackGridRowTitles).toHaveCount(1);
          }
        );

        await spaceTest.step(
          'the grid toolbar offers the same controls as the Alerts section',
          async () => {
            await expect(attackCases.attackGridColumnSelectorButton).toBeVisible();
            await expect(attackCases.attackGridSortSelectorButton).toBeVisible();
            // Hidden for parity with the alerts grid. Grouping and CSV export are not data grid
            // controls at all, so there is nothing of theirs to assert absent.
            await expect(attackCases.attackGridFullScreenButton).toHaveCount(0);
          }
        );

        await spaceTest.step('the grid shows the default columns, in order', async () => {
          expect(await attackCases.getGridColumnIds()).toStrictEqual([
            ATTACK_GRID_COLUMN_ID.actions,
            ATTACK_GRID_COLUMN_ID.detectedOn,
            ATTACK_GRID_COLUMN_ID.title,
            ATTACK_GRID_COLUMN_ID.alerts,
            ATTACK_GRID_COLUMN_ID.summary,
          ]);
        });

        // The case holds a single attack, so each cell locator resolves to exactly one cell.
        await spaceTest.step('every default column shows the attack’s own value', async () => {
          // The attack's detection time, which the seed always sets — not the time it was
          // attached, and never the empty placeholder.
          await expect(attackCases.attackGridDetectedOnCells).not.toBeEmpty();
          await expect(attackCases.attackGridDetectedOnCells).not.toHaveText(EMPTY_VALUE);

          await expect(attackCases.attackGridTitleCells).toContainText(SEEDED_TITLE);
          await expect(attackCases.attackGridAlertsCells).toHaveText(SEEDED_ALERT_COUNT);

          await expect(attackCases.attackGridSummaryCells).toContainText(SEEDED_SUMMARY);
          // The cell renders de-anonymised plain text, so neither markdown syntax nor the
          // `{{ field value }}` token syntax may reach it.
          await expect(attackCases.attackGridSummaryCells).not.toContainText('{{');

          // Both row actions live in the single leading actions cell.
          await expect(attackCases.attackGridRowActions).toHaveCount(1);
          await expect(attackCases.attackGridShowButtons).toHaveCount(1);
          await expect(attackCases.removeAttackButtons).toHaveCount(1);
        });

        await spaceTest.step(
          'the column picker adds an optional column and remembers it',
          async () => {
            // "Attached by" is one of the four columns kept out of the default set. The grid's
            // header row lists every picked column, virtualization notwithstanding, so it is what
            // the picker's effect is read from.
            await attackCases.addGridColumn(ATTACK_GRID_COLUMN_ID.attachedBy);
            expect(await attackCases.getGridColumnIds()).toContain(
              ATTACK_GRID_COLUMN_ID.attachedBy
            );

            // The selection is persisted per user, so it survives leaving and re-opening the case.
            await attackCases.navigateToCase(caseId);
            await attackCases.openAttachmentsTab();
            expect(await attackCases.getGridColumnIds()).toContain(
              ATTACK_GRID_COLUMN_ID.attachedBy
            );
          }
        );
      }
    );

    spaceTest(
      'removes the attack and the alerts it brought in from the grid row action',
      async ({ pageObjects }) => {
        const { detectionsAttackDiscoveryPage, attackCases } = pageObjects;
        const caseName = 'Scout attack attachment case – removal';

        await spaceTest.step('attach the first attack to a new case', async () => {
          await detectionsAttackDiscoveryPage.navigateToAttacksPage();
          await detectionsAttackDiscoveryPage.collapseKpisSection();
          await expect(detectionsAttackDiscoveryPage.attacksTableSection).toBeVisible();

          await attackCases.openFirstAttackTakeActionMenu();
          await attackCases.clickAddToNewCase();
          await attackCases.createCase(caseName, CASE_DESCRIPTION);
          await attackCases.clickCaseToastLink();
        });

        await spaceTest.step(
          'the Attachments tab shows the attack and its constituent alerts',
          async () => {
            await attackCases.openAttachmentsTab();
            await expect(attackCases.attackAccordion).toBeVisible();
            await expect(attackCases.attackAccordionBadge).toHaveText('1');
            await expect(attackCases.attackGridRowTitles).toHaveCount(1);
            // The seeded attack carries two constituent alerts, attached alongside it.
            await expect(attackCases.alertAccordionBadge).toHaveText(SEEDED_ALERT_COUNT);
          }
        );

        await spaceTest.step('remove the attack, taking its related alerts', async () => {
          await attackCases.openRemoveAttackPrompt();
          await attackCases.confirmRemoveAttack({ withRelatedAlerts: true });
        });

        await spaceTest.step(
          'the case view drops both sections without a manual refresh',
          async () => {
            // An accordion only renders while the case still has an attachment of that type, so
            // both disappearing is the end state for an attack removed with all of its alerts.
            await expect(attackCases.attackAccordion).toBeHidden();
            await expect(attackCases.alertAccordion).toBeHidden();
            await expect(attackCases.activityAttackTitle).toBeHidden();
          }
        );
      }
    );

    spaceTest(
      'removes several attacks at once from the bulk action bar',
      async ({ pageObjects }) => {
        const { detectionsAttackDiscoveryPage, attackCases } = pageObjects;
        const caseName = 'Scout attack attachment case – bulk removal';
        let caseId = '';

        await spaceTest.step('attach the first attack to a new case', async () => {
          await detectionsAttackDiscoveryPage.navigateToAttacksPage();
          await detectionsAttackDiscoveryPage.collapseKpisSection();
          await expect(detectionsAttackDiscoveryPage.attacksTableSection).toBeVisible();

          await attackCases.openFirstAttackTakeActionMenu();
          await attackCases.clickAddToNewCase();
          await attackCases.createCase(caseName, CASE_DESCRIPTION);
          await attackCases.clickCaseToastLink();

          caseId = await attackCases.getOpenCaseId();
        });

        await spaceTest.step('attach the second attack to the same case', async () => {
          // The space is seeded with two attacks, one group per attack, and the case created
          // above is the only one in it — so "Add to existing case" has a single candidate.
          await detectionsAttackDiscoveryPage.navigateToAttacksPage();
          await detectionsAttackDiscoveryPage.collapseKpisSection();
          await expect(detectionsAttackDiscoveryPage.attacksTableSection).toBeVisible();

          await attackCases.openAttackTakeActionMenu(1);
          await attackCases.addToOnlyExistingCase();
        });

        await spaceTest.step('the grid lists both attacks', async () => {
          await attackCases.navigateToCase(caseId);
          await attackCases.openAttachmentsTab();
          await expect(attackCases.attackAccordionBadge).toHaveText('2');
          await expect(attackCases.attackGridRowTitles).toHaveCount(2);
        });

        await spaceTest.step('selecting every row reveals the bulk action bar', async () => {
          await expect(attackCases.attackGridBulkActions).toHaveCount(0);

          await attackCases.selectAllAttacks();

          await expect(attackCases.attackGridRowSelectCheckboxes).toHaveCount(2);
          await expect(attackCases.attackGridBulkActions).toBeVisible();
          await expect(attackCases.attackGridBulkRemoveButton).toBeVisible();
        });

        await spaceTest.step(
          'removing the selection takes both attacks and their alerts off the case',
          async () => {
            await attackCases.openBulkRemoveAttacksPrompt();
            await attackCases.confirmRemoveAttack({ withRelatedAlerts: true });

            await expect(attackCases.attackAccordion).toBeHidden();
            await expect(attackCases.alertAccordion).toBeHidden();
          }
        );
      }
    );

    spaceTest(
      'opens the attack flyout from the "Show attack details" action',
      async ({ pageObjects }) => {
        const { detectionsAttackDiscoveryPage, attackCases } = pageObjects;
        const caseName = 'Scout attack attachment case – navigation';
        let caseId = '';

        await spaceTest.step('attach the first attack to a new case', async () => {
          await detectionsAttackDiscoveryPage.navigateToAttacksPage();
          await detectionsAttackDiscoveryPage.collapseKpisSection();
          await expect(detectionsAttackDiscoveryPage.attacksTableSection).toBeVisible();

          await attackCases.openFirstAttackTakeActionMenu();
          await attackCases.clickAddToNewCase();
          await attackCases.createCase(caseName, CASE_DESCRIPTION);
          await attackCases.clickCaseToastLink();

          caseId = await attackCases.getOpenCaseId();
        });

        await spaceTest.step('the Activity log card opens the attack flyout', async () => {
          await attackCases.openAttackFlyoutFromActivity();
          await expect(attackCases.attackDetailsFlyoutBody).toBeVisible();
        });

        await spaceTest.step('the grid row action opens the attack flyout', async () => {
          // Navigated back to the case so the flyout the step above opened is closed, and this
          // assertion is about the grid's own action rather than leftover state.
          await attackCases.navigateToCase(caseId);
          await attackCases.openAttachmentsTab();
          await expect(attackCases.attackDetailsFlyoutBody).toBeHidden();

          await attackCases.openAttackFlyoutFromGrid();
          await expect(attackCases.attackDetailsFlyoutBody).toBeVisible();
        });
      }
    );
  }
);
