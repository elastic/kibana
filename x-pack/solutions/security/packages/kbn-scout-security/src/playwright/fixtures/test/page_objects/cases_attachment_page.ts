/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

// Values below mirror common/cases/attachments/entity/test_ids.ts in
// @kbn/security-solution-plugin. Cannot import directly to avoid a cross-package dependency.
const ADD_TO_NEW_CASE_TEST_ID = 'eaCasesAddToNewCase' as const;
const ADD_TO_EXISTING_CASE_TEST_ID = 'eaCasesAddToExistingCase' as const;

// Host entity seeded into the entity store by the test, then referenced by the
// rison flyout param below. The right panel resolves this record from the store,
// and its `entity.id` + name are exactly what enable the flyout "Add to case"
// actions (see useEntityCaseTakeActionItems).
export const ENTITY_CASE_HOST_ENTITY_ID = 'scout-entity-cases-host';
export const ENTITY_CASE_HOST_NAME = 'scout-entity-cases-host-name';

/**
 * Rison-encoded flyout URL param that opens the host entity right panel directly.
 *
 * We deliberately do NOT open the flyout by clicking the host link in the alerts
 * data grid: `host.name` sits behind a wide `reason` column, so EUI virtualizes it
 * out of the DOM until horizontally scrolled and the link is not reliably
 * clickable. Navigating with this param is deterministic and needs no alert/rule.
 */
export const HOST_RIGHT_PANEL_FLYOUT_PARAM =
  `(preview:!(),right:(id:host-panel,params:(contextID:host-panel,` +
  `entityId:${ENTITY_CASE_HOST_ENTITY_ID},hostName:${ENTITY_CASE_HOST_NAME},` +
  `isPreviewMode:!f,scopeId:alerts-page)))`;

/**
 * Page object for the Cases "add attachment" surfaces reached from an Entity Analytics
 * entity flyout:
 * - opening the host entity right-panel flyout,
 * - the flyout "Take action" popover (Add to new / existing case),
 * - the Cases new-case creation flyout,
 * - the case-created success toast link.
 *
 * Kept separate from {@link EntityCasesTabPage} so each class owns a single UI surface
 * and stays reusable as the attach flows grow (bulk attach, existing-case flow, etc.).
 */
export class CasesAttachmentPage {
  // Host right panel header — rendered whenever the host panel is open; page-ready signal
  public readonly hostPanelHeader: Locator;

  // Entity flyout - Take action popover
  public readonly takeActionButton: Locator;
  public readonly addToNewCaseItem: Locator;
  public readonly addToExistingCaseItem: Locator;

  // New-case creation flyout (rendered by the Cases plugin)
  public readonly createCaseNameInput: Locator;
  public readonly createCaseDescriptionInput: Locator;
  public readonly createCaseSubmitButton: Locator;

  // Toast link that navigates to the newly created case
  public readonly caseToastLink: Locator;

  constructor(private readonly page: ScoutPage) {
    this.hostPanelHeader = page.testSubj.locator('host-panel-header');

    this.takeActionButton = page.testSubj.locator('take-action-button');
    this.addToNewCaseItem = page.testSubj.locator(ADD_TO_NEW_CASE_TEST_ID);
    this.addToExistingCaseItem = page.testSubj.locator(ADD_TO_EXISTING_CASE_TEST_ID);

    // Scope to the Cases plugin's stable `caseTitle` form row, then the single
    // `<input>` within it - avoids matching stray `data-test-subj="input"` fields
    // elsewhere on the page and survives aria-label/copy changes.
    this.createCaseNameInput = page.testSubj.locator('caseTitle').locator('input');
    // Description is a required field (submit is blocked without it). It's an
    // EuiMarkdownEditor, so target its textarea inside the `caseDescription` row.
    this.createCaseDescriptionInput = page.testSubj
      .locator('caseDescription')
      .getByTestId('euiMarkdownEditorTextArea');
    this.createCaseSubmitButton = page.testSubj.locator('create-case-submit');

    // Exact plugin-owned test-subj for the "View case" link in the case-created
    // success toast - avoids a brittle `*=toastLink` substring match. Each test
    // creates a single case in its own space, so only one such toast is present;
    // if two ever stacked, Playwright strict mode surfaces it rather than
    // silently clicking the wrong one.
    this.caseToastLink = page.testSubj.locator('toaster-content-case-view-link');
  }

  /**
   * Opens the host entity right-panel flyout for the seeded host via a rison URL
   * param and waits for the panel header, confirming the flyout has rendered.
   */
  async navigateToHostFlyout() {
    await this.page.gotoApp('security/entity_analytics_home_page', {
      params: { flyout: HOST_RIGHT_PANEL_FLYOUT_PARAM },
    });
    await this.hostPanelHeader.waitFor({ state: 'visible', timeout: 30000 });
  }

  async openTakeActionMenu() {
    await this.takeActionButton.waitFor();
    await this.takeActionButton.click();
  }

  /**
   * Clicks "Add to new case". The item only surfaces once the flyout footer has
   * resolved the entity from the store (id + name); the popover re-renders its
   * items reactively, so Playwright's auto-wait covers that resolution.
   */
  async clickAddToNewCase() {
    await this.addToNewCaseItem.click();
  }

  async clickAddToExistingCase() {
    await this.addToExistingCaseItem.click();
  }

  async fillCaseName(name: string) {
    await this.createCaseNameInput.waitFor();
    await this.createCaseNameInput.fill(name);
  }

  async fillCaseDescription(description: string) {
    await this.createCaseDescriptionInput.waitFor();
    await this.createCaseDescriptionInput.fill(description);
  }

  async submitNewCase() {
    await this.createCaseSubmitButton.click();
  }

  async clickCaseToastLink() {
    await this.caseToastLink.click();
  }
}
