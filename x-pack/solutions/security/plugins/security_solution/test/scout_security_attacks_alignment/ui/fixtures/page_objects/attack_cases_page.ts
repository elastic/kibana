/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import {
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ATTACK_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common';
import {
  ATTACK_CARD_TEST_ID,
  ATTACK_TITLE_TEST_ID,
  ATTACK_ALERT_COUNT_TEST_ID,
  ATTACK_TAB_ROW_TITLE_TEST_ID,
  ATTACK_TAB_TABLE_TEST_ID,
  REMOVE_ATTACK_ALERTS_CHECKBOX_TEST_ID,
  REMOVE_ATTACK_BUTTON_TEST_ID,
  REMOVE_ATTACK_MODAL_TEST_ID,
  SHOW_ATTACK_BUTTON_TEST_ID,
} from '../../../../../common/cases/attachments/attack/test_ids';

/**
 * The card body is built from the presentational components the Detections → Attacks page uses,
 * so these ids belong to those components rather than to the case attachment. They are inlined
 * because importing them would pull React, EUI and Emotion into the Playwright process; keep them
 * in step with the exports named in the comments.
 */
// public/attack_discovery/components/attack_detected_on
const ATTACK_DETECTED_ON_TEST_ID = 'attackDetectedOn';
// public/attack_discovery/components/attack_entity_summary
const ATTACK_ENTITY_SUMMARY_TEST_ID = 'attack-subtitle-summary-text';
// public/attack_discovery/components/attack_summary_sections
const SUMMARY_CONTENT_TEST_ID = 'summaryContent';
const DETAILS_TITLE_TEST_ID = 'detailsTitle';
const DETAILS_CONTENT_TEST_ID = 'detailsContent';
const ATTACK_CHAIN_TITLE_TEST_ID = 'attackChainTitle';

/**
 * The calls to action the Attacks page renders under its summary, which the case card must not.
 * `newAgentBuilderAttachment` and `viewInAiAssistant` are the two variants of the assistant CTA —
 * which one the page renders depends on whether the agent builder chat experience is enabled.
 */
// public/detections/components/attacks/table/attack_details/attack_ai_assistant_button
const AI_ASSISTANT_CTA_TEST_IDS = ['newAgentBuilderAttachment', 'viewInAiAssistant'] as const;
// public/detections/components/attacks/table/attack_details/summary_tab
const INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID = 'investigateInTimelineButton';

/**
 * Page object for the attack case-attachment flow:
 * - the Attacks page table "Take action" popover (Add to new/existing case)
 * - the Cases new-case creation flyout
 * - the case view: the attack preview card in the Activity log, and the Attacks
 *   section inside the consolidated Attachments tab
 *
 * The unified attachment framework renders no per-type tab: attacks render as an
 * accordion (`case-view-attachment-accordion-security.attack`) inside the single
 * Attachments tab, and that accordion only exists when the case has at least one
 * `security.attack` attachment.
 */
export class AttackCasesPage {
  // Attacks page – table group "Take action" popover
  public readonly takeActionButtons: Locator;
  public readonly addToNewCaseItem: Locator;
  public readonly addToExistingCaseItem: Locator;

  // New-case creation flyout (rendered by the Cases plugin)
  public readonly createCaseNameInput: Locator;
  public readonly createCaseDescriptionInput: Locator;
  public readonly createCaseSubmitButton: Locator;
  public readonly caseToastLink: Locator;

  // Case view – Activity log attack card. The card is rendered from the persisted metadata
  // snapshot with the same components as the Attacks page, minus that page's calls to action.
  public readonly activityAttackCard: Locator;
  public readonly activityAttackTitle: Locator;
  public readonly activityAttackDetectedOn: Locator;
  public readonly activityAttackAlertCount: Locator;
  public readonly activityAttackEntitySummary: Locator;
  public readonly activityAttackSummaryContent: Locator;
  public readonly activityAttackDetailsTitle: Locator;
  public readonly activityAttackDetailsContent: Locator;
  public readonly activityAttackChainTitle: Locator;
  public readonly activityAttackAiAssistantCta: Locator;
  public readonly activityAttackInvestigateInTimelineCta: Locator;
  public readonly showAttackButton: Locator;

  // Case view – Attachments tab + Attacks accordion
  public readonly attachmentsTab: Locator;
  public readonly attachmentsContainer: Locator;
  public readonly attackAccordion: Locator;
  public readonly attackAccordionBadge: Locator;
  public readonly attackTable: Locator;
  public readonly attackTableRowTitles: Locator;
  public readonly alertAccordion: Locator;
  public readonly alertAccordionBadge: Locator;

  // Case view – attack removal prompt
  public readonly removeAttackButtons: Locator;
  public readonly removeAttackModal: Locator;
  public readonly removeAttackAlertsCheckbox: Locator;
  public readonly removeAttackConfirmButton: Locator;

  // Attack details flyout (legacy expandable flyout, i.e. `enableNewFlyout: false`)
  public readonly attackDetailsFlyoutBody: Locator;

  constructor(private readonly page: ScoutPage) {
    this.takeActionButtons = page.testSubj.locator('take-action-button');
    this.addToNewCaseItem = page.testSubj.locator('attack-add-to-new-case');
    this.addToExistingCaseItem = page.testSubj.locator('attack-add-to-existing-case');

    // Scope to the Cases plugin's stable form rows, then the single control within each —
    // avoids matching stray generic inputs elsewhere on the page.
    this.createCaseNameInput = page.testSubj.locator('caseTitle').locator('input');
    this.createCaseDescriptionInput = page.testSubj.locator('caseDescription').locator('textarea');
    this.createCaseSubmitButton = page.testSubj.locator('create-case-submit');
    this.caseToastLink = page.testSubj.locator('toaster-content-case-view-link');

    this.activityAttackCard = page.testSubj.locator(ATTACK_CARD_TEST_ID);
    this.activityAttackTitle = page.testSubj.locator(ATTACK_TITLE_TEST_ID);
    this.activityAttackAlertCount = page.testSubj.locator(ATTACK_ALERT_COUNT_TEST_ID);
    // The section ids are shared with the Attacks page, so scope them to the card rather than to
    // the page: nothing else in the case view may satisfy these assertions.
    this.activityAttackDetectedOn = this.cardSection(ATTACK_DETECTED_ON_TEST_ID);
    this.activityAttackEntitySummary = this.cardSection(ATTACK_ENTITY_SUMMARY_TEST_ID);
    this.activityAttackSummaryContent = this.cardSection(SUMMARY_CONTENT_TEST_ID);
    this.activityAttackDetailsTitle = this.cardSection(DETAILS_TITLE_TEST_ID);
    this.activityAttackDetailsContent = this.cardSection(DETAILS_CONTENT_TEST_ID);
    this.activityAttackChainTitle = this.cardSection(ATTACK_CHAIN_TITLE_TEST_ID);
    this.activityAttackAiAssistantCta = this.cardSection(...AI_ASSISTANT_CTA_TEST_IDS);
    this.activityAttackInvestigateInTimelineCta = this.cardSection(
      INVESTIGATE_IN_TIMELINE_BUTTON_TEST_ID
    );
    // The button's test subject is suffixed with the attachment saved object id, which is
    // generated server-side, so match on the stable prefix.
    this.showAttackButton = page.locator(`[data-test-subj^="${SHOW_ATTACK_BUTTON_TEST_ID}-"]`);

    this.attachmentsTab = page.testSubj.locator('case-view-tab-title-attachments');
    this.attachmentsContainer = page.testSubj.locator('case-view-attachments');
    this.attackAccordion = page.testSubj.locator(
      `case-view-attachment-accordion-${SECURITY_ATTACK_ATTACHMENT_TYPE}`
    );
    this.attackAccordionBadge = page.testSubj.locator(
      `case-view-attachment-badge-${SECURITY_ATTACK_ATTACHMENT_TYPE}`
    );
    this.attackTable = page.testSubj.locator(ATTACK_TAB_TABLE_TEST_ID);
    this.attackTableRowTitles = page.testSubj.locator(ATTACK_TAB_ROW_TITLE_TEST_ID);
    this.alertAccordion = page.testSubj.locator(
      `case-view-attachment-accordion-${SECURITY_ALERT_ATTACHMENT_TYPE}`
    );
    this.alertAccordionBadge = page.testSubj.locator(
      `case-view-attachment-badge-${SECURITY_ALERT_ATTACHMENT_TYPE}`
    );

    // Suffixed with the attachment saved object id, generated server-side — match the prefix.
    this.removeAttackButtons = page.locator(`[data-test-subj^="${REMOVE_ATTACK_BUTTON_TEST_ID}-"]`);
    this.removeAttackModal = page.testSubj.locator(REMOVE_ATTACK_MODAL_TEST_ID);
    this.removeAttackAlertsCheckbox = page.testSubj.locator(REMOVE_ATTACK_ALERTS_CHECKBOX_TEST_ID);
    this.removeAttackConfirmButton = page.testSubj.locator('confirmModalConfirmButton');

    this.attackDetailsFlyoutBody = page.testSubj.locator('attack-details-flyout-body');
  }

  /**
   * The attack card's visible text, used to assert that the narrative is rendered as formatted
   * markdown rather than as the raw `{{ field value }}` token syntax.
   */
  async getActivityAttackCardText(): Promise<string> {
    await this.activityAttackCard.waitFor({ state: 'visible', timeout: 30_000 });

    return this.activityAttackCard.innerText();
  }

  /**
   * Resolves the first element a locator matches, once at least one has rendered. Both the
   * attacks table and the case's Attacks section list several rows, so a strict-mode
   * single-element locator will not do; waiting on the count first keeps the resolution from
   * racing the render, which `all()` on its own does not.
   */
  private async resolveFirst(locator: Locator, notFoundMessage: string): Promise<Locator> {
    await expect(locator).not.toHaveCount(0, { timeout: 30_000 });

    const [first] = await locator.all();

    if (!first) {
      throw new Error(notFoundMessage);
    }

    return first;
  }

  /** Resolves one or more test subjects within the activity log's attack card. */
  private cardSection(...testSubjects: readonly string[]): Locator {
    const selector = testSubjects.map((subject) => `[data-test-subj="${subject}"]`).join(', ');

    return this.activityAttackCard.locator(selector);
  }

  /** Opens the "Take action" popover on the first attack group in the Attacks table. */
  async openFirstAttackTakeActionMenu() {
    const firstTakeActionButton = await this.resolveFirst(
      this.takeActionButtons,
      'No take action button found in the attacks table'
    );

    await firstTakeActionButton.click();
    await this.addToNewCaseItem.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async clickAddToNewCase() {
    await this.addToNewCaseItem.click();
  }

  async createCase(name: string, description: string) {
    await this.createCaseNameInput.waitFor({ state: 'visible', timeout: 30_000 });
    await this.createCaseNameInput.fill(name);
    await this.createCaseDescriptionInput.fill(description);
    await this.createCaseSubmitButton.click();
  }

  /** Follows the "View case" link in the case-created success toast. */
  async clickCaseToastLink() {
    await this.caseToastLink.waitFor({ state: 'visible', timeout: 30_000 });
    await this.caseToastLink.click();
    await this.waitForCaseView();
  }

  async navigateToCase(caseId: string) {
    await this.page.gotoApp(`security/cases/${caseId}`);
    await this.waitForCaseView();
  }

  /**
   * A cold navigation lands on the case-view spinner; `case-view-tabs` is the tab bar the
   * cases framework renders only once the case fetch resolves, so waiting on it keeps
   * downstream tab clicks from racing the fetch.
   */
  async waitForCaseView() {
    await this.page.testSubj
      .locator('case-view-tabs')
      .waitFor({ state: 'visible', timeout: 30_000 });
  }

  /** The case view lands on Activity; the Attacks accordion lives in the Attachments tab. */
  async openAttachmentsTab() {
    await this.attachmentsTab.waitFor({ state: 'visible', timeout: 30_000 });
    await this.attachmentsTab.click();
    await this.attachmentsContainer.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async openAttackFlyoutFromActivity() {
    await this.showAttackButton.waitFor({ state: 'visible', timeout: 30_000 });
    await this.showAttackButton.click();
  }

  /** Opens the removal prompt for the first row of the Attacks section. */
  async openRemoveAttackPrompt() {
    const firstRemoveButton = await this.resolveFirst(
      this.removeAttackButtons,
      'No remove attack button found in the attacks section'
    );

    await firstRemoveButton.click();
    await this.removeAttackModal.waitFor({ state: 'visible', timeout: 30_000 });
  }

  /**
   * Confirms the removal prompt. Tick `withRelatedAlerts` to take the attack's alerts with it —
   * the checkbox only enables once the attack's alert set has been resolved, so wait for that
   * rather than racing the request.
   */
  async confirmRemoveAttack({ withRelatedAlerts }: { withRelatedAlerts: boolean }) {
    if (withRelatedAlerts) {
      await this.removeAttackAlertsCheckbox.waitFor({ state: 'visible', timeout: 30_000 });
      await expect(this.removeAttackAlertsCheckbox).toBeEnabled({ timeout: 30_000 });
      await this.removeAttackAlertsCheckbox.check();
    }

    await this.removeAttackConfirmButton.click();
    await this.removeAttackModal.waitFor({ state: 'hidden', timeout: 30_000 });
  }
}
