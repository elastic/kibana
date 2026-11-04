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
 *    picker and its persistence, and the three row actions — expand, investigate in timeline and
 *    an overflow carrying the attack take-action menu.
 *  - The "Show attack details" affordance opens the attack flyout, both from the Activity log
 *    card and from the grid's row actions.
 *  - Selecting rows raises a bulk action bar carrying those same take-action verbs across the
 *    selection, plus "Remove from case".
 *  - Removing an attack from its grid row's "Remove from case" item takes the attack and the
 *    alerts no other attached attack still claims off the case, and that "Remove attack only"
 *    leaves the alerts on the case.
 *
 * Attaching a `security.attack` requires the `attackAttachments` experimental flag, which is on
 * by default.
 *
 * To run locally:
 *
 *   node scripts/scout.js run-tests --arch stateful --domain classic \
 *     --config x-pack/solutions/security/plugins/security_solution/test/scout_security_attacks_alignment/ui/parallel.playwright.config.ts
 */

import { expect } from '@kbn/scout-security/ui';
import type { EsClient, KbnClient, Locator } from '@kbn/scout-security';
import {
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ATTACK_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common';
import { tags } from '@kbn/scout-security';
import { spaceTest } from '../../../fixtures';
import {
  ATTACK_GRID_COLUMN_ID,
  ATTACK_TAKE_ACTION_ITEM_TEST_ID,
} from '../../../fixtures/page_objects/attack_cases_page';

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

/**
 * The seeded attacks and the synthetic alerts they comprise, from
 * `apiServices.attackDiscovery.seedAttackData`. The manual attack is the one whose title carries
 * the suffix, and it is the one the shared-alert test re-points at {@link SHARED_ALERT_ID} so the
 * two attacks overlap — the seed leaves their alert sets disjoint, which cannot exercise the rule
 * that an alert claimed by another attached attack is never removed.
 */
const MANUAL_TITLE_SUFFIX = '(Manual)';
const SCHEDULED_ONLY_ALERT_ID = 'seed-alert-1';
const SHARED_ALERT_ID = 'seed-alert-2';
const MANUAL_ONLY_ALERT_ID = 'seed-alert-3';
/** The attack document field the alert set is read from, live, at removal time. */
const ALERT_IDS_FIELD = 'kibana.alert.attack_discovery.alert_ids';

/** One seeded attack, from the attack discovery find API. */
interface FoundAttack {
  id: string;
  index: string;
  title: string;
  alertIds: string[];
}

/** One case attachment, as the Cases find-attachments endpoint returns it. */
interface FoundCaseAttachment {
  id: string;
  type: string;
  attachmentId?: string | string[];
  metadata?: { title?: string } | null;
}

// The shared placeholder a column renders when it has no value, from
// `public/common/components/empty_value` (`getEmptyValue`). Inlined rather than imported to keep
// the Kibana public bundle out of the Playwright process.
const EMPTY_VALUE = '—';

const buildSpacePath = (spaceId: string, path: string): string =>
  spaceId === 'default' ? path : `/s/${spaceId}${path}`;

/** The seeded attacks, read back live so the shared-alert setup can address their documents. */
const findSeededAttacks = async (kbnClient: KbnClient, spaceId: string): Promise<FoundAttack[]> => {
  const response = await kbnClient.request({
    method: 'GET',
    path: buildSpacePath(spaceId, '/api/attack_discovery/_find'),
    // No `scheduled` filter: it would return scheduled discoveries alone, and the seed's
    // second attack is ad hoc, which the shared-alert removal test addresses by title.
    query: { per_page: 10, search: SEEDED_TITLE, shared: true },
  });

  const { data } = response.data as {
    data: Array<Omit<FoundAttack, 'alertIds'> & { alert_ids: string[] }>;
  };

  return data.map(({ alert_ids: alertIds, ...attack }) => ({ ...attack, alertIds }));
};

/** Re-points one attack's constituent alerts, so two attached attacks can overlap on one alert. */
const setAttackAlertIds = async (
  esClient: EsClient,
  { attack, alertIds }: { attack: FoundAttack; alertIds: string[] }
): Promise<void> => {
  await esClient.update({
    index: attack.index,
    id: attack.id,
    refresh: true,
    doc: { [ALERT_IDS_FIELD]: alertIds },
  });
};

/**
 * The case's attachments, in the unified shape, read from the same endpoint the case view reads
 * them from. Read directly rather than through the UI because the seeded alerts are synthetic ids
 * with no documents behind them, so the Alerts section can only show how many are attached, never
 * which. The public find-attachments endpoint is no use here: it returns user comments alone.
 */
const findCaseAttachments = async (
  kbnClient: KbnClient,
  spaceId: string,
  caseId: string
): Promise<FoundCaseAttachment[]> => {
  const response = await kbnClient.request({
    method: 'GET',
    path: buildSpacePath(spaceId, `/api/cases/${caseId}/resolve`),
    query: { includeComments: true },
  });

  return (response.data as { case: { comments: FoundCaseAttachment[] } }).case.comments;
};

/** The de-anonymised alert ids the case's `security.alert` attachments reference, sorted. */
const getAttachedAlertIds = (attachments: readonly FoundCaseAttachment[]): string[] =>
  attachments
    .filter(({ type }) => type === SECURITY_ALERT_ATTACHMENT_TYPE)
    .flatMap(({ attachmentId }) =>
      typeof attachmentId === 'string' ? [attachmentId] : attachmentId ?? []
    )
    .sort();

/** The case's `security.attack` attachments, keyed by the attack title each snapshotted. */
const getAttackAttachments = (attachments: readonly FoundCaseAttachment[]): FoundCaseAttachment[] =>
  attachments.filter(({ type }) => type === SECURITY_ATTACK_ATTACHMENT_TYPE);

spaceTest.describe(
  'Attack case attachments',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    /**
     * The seeded attack whose alert set a test re-pointed, and the set to put back. Held across
     * hooks so the seeded data is restored even when the test that changed it fails.
     */
    let seededAttackToRestore: { attack: FoundAttack; alertIds: string[] } | undefined;

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
        // The attack attachment's navigation button supports both flyouts; pin the legacy one
        // so this suite asserts the same flyout body as the rest of the attacks specs.
        [ENABLE_NEW_FLYOUT_SETTING]: false,
      });
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices, esClient, scoutSpace }) => {
      const seededAttack = seededAttackToRestore;
      seededAttackToRestore = undefined;

      if (seededAttack != null) {
        await setAttackAlertIds(esClient, seededAttack);
      }

      await apiServices.cases.cleanup.deleteAllCases(scoutSpace.id);
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
        });

        await spaceTest.step(
          'the row offers expand, investigate in timeline and more actions',
          async () => {
            // All three live in the single leading actions cell, matching the alerts row above.
            await expect(attackCases.attackGridRowActions).toHaveCount(1);
            await expect(attackCases.attackGridShowButtons).toHaveCount(1);
            await expect(attackCases.attackGridInvestigateInTimelineButtons).toHaveCount(1);
            await expect(attackCases.attackGridMoreActionsButtons).toHaveCount(1);
            expect(await attackCases.getRowActionCount()).toBe(3);
          }
        );

        await spaceTest.step('the row overflow opens the attack take-action menu', async () => {
          await attackCases.openRowMoreActionsMenu();

          await expect(
            attackCases.rowMoreActionsMenuItem(ATTACK_TAKE_ACTION_ITEM_TEST_ID.addToCase)
          ).toBeVisible();
          await expect(
            attackCases.rowMoreActionsMenuItem(ATTACK_TAKE_ACTION_ITEM_TEST_ID.markAcknowledged)
          ).toBeVisible();
          await expect(
            attackCases.rowMoreActionsMenuItem(ATTACK_TAKE_ACTION_ITEM_TEST_ID.manageTags)
          ).toBeVisible();
          await expect(
            attackCases.rowMoreActionsMenuItem(ATTACK_TAKE_ACTION_ITEM_TEST_ID.manageAssignees)
          ).toBeVisible();

          // The row's own timeline icon button already offers this, so the menu does not repeat
          // it — and the assistant item is suppressed here as it is in the flyout footer.
          await expect(
            attackCases.rowMoreActionsMenuItem(
              ATTACK_TAKE_ACTION_ITEM_TEST_ID.investigateInTimeline
            )
          ).toHaveCount(0);
          await expect(
            attackCases.rowMoreActionsMenuItem(ATTACK_TAKE_ACTION_ITEM_TEST_ID.viewInAiAssistant)
          ).toHaveCount(0);

          await attackCases.closeRowMoreActionsMenu();
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
      'removes an attack from the Attacks grid, keeping the alerts another attack claims',
      async ({ esClient, kbnClient, page, pageObjects, scoutSpace }) => {
        const { detectionsAttackDiscoveryPage, attackCases } = pageObjects;
        const caseName = 'Scout attack attachment case – removal';
        let caseId = '';
        let scheduledAttachmentId = '';

        await spaceTest.step('make the two seeded attacks share an alert', async () => {
          // The seed leaves the two attacks' alert sets disjoint, which cannot exercise the rule
          // that an alert claimed by another attached attack is never removed. Re-point the manual
          // attack's alert set so it overlaps the scheduled one on a single alert; the afterEach
          // puts it back, so the other specs sharing this space see the seeded attacks unchanged.
          const attacks = await findSeededAttacks(kbnClient, scoutSpace.id);
          const manualAttack = attacks.find(({ title }) => title.endsWith(MANUAL_TITLE_SUFFIX));

          if (manualAttack == null) {
            throw new Error('The seeded manual attack was not found');
          }

          seededAttackToRestore = { attack: manualAttack, alertIds: manualAttack.alertIds };

          await setAttackAlertIds(esClient, {
            attack: manualAttack,
            alertIds: [SHARED_ALERT_ID, MANUAL_ONLY_ALERT_ID],
          });
        });

        await spaceTest.step('attach both attacks to one case', async () => {
          // Cases drops the ids already on the case, so the shared alert lands in whichever attack
          // is attached first and the second attack's attachment holds only its own. This test
          // removes the first-attached attack, whose attachment has to be shrunk rather than
          // deleted, so the attach order is pinned. Filtering by type ties each attach to a known
          // attack instead of to whatever the table happens to sort first.
          const showOnlyAttacksOfType = async (select: Locator, unselect?: Locator) => {
            await detectionsAttackDiscoveryPage.navigateToAttacksPage();
            await detectionsAttackDiscoveryPage.collapseKpisSection();
            await expect(detectionsAttackDiscoveryPage.attacksTableSection).toBeVisible();

            await detectionsAttackDiscoveryPage.typeFilterButton.click();
            // The filter is persisted per user and survives the navigation, so the previous
            // type has to come off or both would be back in the table.
            await unselect?.click();
            await select.click();
            await page.keyboard.press('Escape');

            await expect(detectionsAttackDiscoveryPage.tableExpandAttackDetailsButtons).toHaveCount(
              1
            );
          };

          await showOnlyAttacksOfType(detectionsAttackDiscoveryPage.typeFilterOptionScheduled);

          await attackCases.openFirstAttackTakeActionMenu();
          await attackCases.clickAddToNewCase();
          await attackCases.createCase(caseName, CASE_DESCRIPTION);
          await attackCases.clickCaseToastLink();

          caseId = await attackCases.getOpenCaseId();

          await showOnlyAttacksOfType(
            detectionsAttackDiscoveryPage.typeFilterOptionManuallyGenerated,
            detectionsAttackDiscoveryPage.typeFilterOptionScheduled
          );
          await expect(detectionsAttackDiscoveryPage.manualAttackSubtitle).toBeVisible();

          // The case created above is the only one in the space, so "Add to existing case" has a
          // single candidate.
          await attackCases.openFirstAttackTakeActionMenu();
          await attackCases.addToOnlyExistingCase();
        });

        await spaceTest.step(
          'the case holds both attacks and the three alerts they comprise',
          async () => {
            const attachments = await findCaseAttachments(kbnClient, scoutSpace.id, caseId);
            const attackAttachments = getAttackAttachments(attachments);

            expect(attackAttachments).toHaveLength(2);
            // The scheduled attack is attached first, so it is the one that brings the shared
            // alert in; the manual attack's own attachment holds only its exclusive alert.
            expect(getAttachedAlertIds(attachments)).toStrictEqual(
              [SCHEDULED_ONLY_ALERT_ID, SHARED_ALERT_ID, MANUAL_ONLY_ALERT_ID].sort()
            );

            const scheduledAttachment = attackAttachments.find(
              ({ metadata }) => !metadata?.title?.endsWith(MANUAL_TITLE_SUFFIX)
            );

            if (scheduledAttachment == null) {
              throw new Error('The scheduled attack was not attached to the case');
            }

            scheduledAttachmentId = scheduledAttachment.id;

            await attackCases.navigateToCase(caseId);
            await attackCases.openAttachmentsTab();
            await expect(attackCases.attackAccordionBadge).toHaveText('2');
            await expect(attackCases.alertAccordionBadge).toHaveText('3');
            await expect(attackCases.attackGridRowTitles).toHaveCount(2);
          }
        );

        await spaceTest.step(
          'selecting every row raises a bulk bar of the take-action verbs',
          async () => {
            await expect(attackCases.attackGridBulkActions).toHaveCount(0);

            await attackCases.selectAllAttacks();

            await expect(attackCases.attackGridRowSelectCheckboxes).toHaveCount(2);
            await expect(attackCases.attackGridBulkActions).toBeVisible();

            await attackCases.openBulkTakeActionMenu();

            await expect(
              attackCases.bulkActionsMenuItem(ATTACK_TAKE_ACTION_ITEM_TEST_ID.addToCase)
            ).toBeVisible();
            await expect(
              attackCases.bulkActionsMenuItem(ATTACK_TAKE_ACTION_ITEM_TEST_ID.markAcknowledged)
            ).toBeVisible();
            await expect(
              attackCases.bulkActionsMenuItem(ATTACK_TAKE_ACTION_ITEM_TEST_ID.manageTags)
            ).toBeVisible();
            await expect(
              attackCases.bulkActionsMenuItem(ATTACK_TAKE_ACTION_ITEM_TEST_ID.manageAssignees)
            ).toBeVisible();
            // Unlike the row's overflow, the bar carries the timeline item: a selection has no
            // icon button of its own for it to duplicate.
            await expect(
              attackCases.bulkActionsMenuItem(ATTACK_TAKE_ACTION_ITEM_TEST_ID.investigateInTimeline)
            ).toBeVisible();
            await expect(
              attackCases.bulkActionsMenuItem(ATTACK_TAKE_ACTION_ITEM_TEST_ID.removeFromCase)
            ).toBeVisible();

            await attackCases.closeBulkTakeActionMenu();
          }
        );

        await spaceTest.step(
          'the grid removes the attack and only the alerts it alone brought in',
          async () => {
            await attackCases.removeAttackFromGrid(scheduledAttachmentId);

            // The case view refreshes itself once the removal lands, so the remaining row is the
            // signal that the delete has been written — no manual refresh, and no polling.
            await expect(attackCases.attackGridRowTitles).toHaveCount(1);

            const attachments = await findCaseAttachments(kbnClient, scoutSpace.id, caseId);

            expect(getAttackAttachments(attachments)).toHaveLength(1);
            // The scheduled attack's own alert goes with it. The shared alert sat in the same
            // attachment, but the manual attack still claims it, so it stays alongside the manual
            // attack's own.
            expect(getAttachedAlertIds(attachments)).toStrictEqual(
              [SHARED_ALERT_ID, MANUAL_ONLY_ALERT_ID].sort()
            );
          }
        );

        await spaceTest.step(
          'the Attachments tab drops the removed attack and its alert',
          async () => {
            await expect(attackCases.attackAccordionBadge).toHaveText('1');
            await expect(attackCases.alertAccordionBadge).toHaveText('2');
            await expect(attackCases.attackGridRowTitles).toHaveCount(1);
          }
        );

        await spaceTest.step(
          '"Remove attack only" removes the last attack and keeps its alerts',
          async () => {
            const [manualAttachment] = getAttackAttachments(
              await findCaseAttachments(kbnClient, scoutSpace.id, caseId)
            );

            if (manualAttachment == null) {
              throw new Error('The manual attack is no longer attached to the case');
            }

            await attackCases.removeAttackFromGrid(manualAttachment.id, { includeRelated: false });

            await expect(attackCases.attackGridRowTitles).toHaveCount(0);

            const attachments = await findCaseAttachments(kbnClient, scoutSpace.id, caseId);

            expect(getAttackAttachments(attachments)).toHaveLength(0);
            expect(getAttachedAlertIds(attachments)).toStrictEqual(
              [SHARED_ALERT_ID, MANUAL_ONLY_ALERT_ID].sort()
            );
            await expect(attackCases.alertAccordionBadge).toHaveText('2');
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
