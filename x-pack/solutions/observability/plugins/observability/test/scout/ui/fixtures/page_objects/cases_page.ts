/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-oblt';

/**
 * Drives the Observability Cases app (`/app/observability/cases`).
 *
 * Ported from the FTR `observability` page object cases helpers
 * (x-pack/solutions/observability/test/functional/page_objects/observability_page.ts)
 * and the `cases` functional service. Page objects only drive the UI and expose
 * locators/state; assertions live in the specs.
 */
export class CasesPage {
  // Cases list / landing
  public readonly listTitle: Locator;
  public readonly createCaseButton: Locator;
  // Create-case form (shown after clicking the create button)
  public readonly createCaseForm: Locator;
  // Comment editor textarea inside the create/edit forms
  public readonly commentTextArea: Locator;
  // Read-only chrome badge (rendered for users without write privileges)
  public readonly readOnlyBadge: Locator;
  // "Kibana feature privileges required" page rendered when the user has no
  // cases privileges at all.
  public readonly noFeaturePermissions: Locator;
  // In-app "Privileges required" prompt rendered in place (not a redirect) when
  // a user lacks the privilege for a specific cases route such as create. This
  // is distinct from `noFeaturePermissions`, which is the Kibana 403 page shown
  // when the user has no cases feature privilege at all.
  public readonly noPrivilegesPrompt: Locator;
  // Single case view
  public readonly caseViewTitle: Locator;
  public readonly addCommentInput: Locator;
  public readonly submitCommentButton: Locator;
  // Alert attachment rule link inside a case (navigates to the rule details page)
  public readonly alertRuleLink: Locator;

  constructor(private readonly page: ScoutPage) {
    // Titles resolve to the legacy `HeaderPage` subject or the redesign app header
    // (`appHeaderTitle`) so the page object works whether the `casesRedesign` flags are on or off.
    // Only one of the two is present at a time on a given page.
    this.listTitle = this.page.locator(
      '[data-test-subj="cases-all-title"],[data-test-subj="appHeaderTitle"]'
    );
    this.createCaseButton = this.page.testSubj.locator('createNewCaseBtn');
    this.createCaseForm = this.page.testSubj.locator('case-creation-form-steps');
    this.readOnlyBadge = this.page.testSubj.locator('headerBadge');
    this.noFeaturePermissions = this.page.testSubj.locator('noFeaturePermissions');
    this.noPrivilegesPrompt = this.page.getByRole('heading', { name: 'Privileges required' });
    this.caseViewTitle = this.page.locator(
      '[data-test-subj="case-view-title"],[data-test-subj="appHeaderTitle"]'
    );
    this.addCommentInput = this.page.testSubj.locator('add-comment');
    this.commentTextArea = this.page.testSubj.locator('add-comment').locator('textarea');
    this.submitCommentButton = this.page.testSubj.locator('submit-comment');
    // The rule link test subject is suffixed with the rule id (e.g.
    // `alert-rule-link-<uuid>`), so match by prefix rather than an exact id.
    this.alertRuleLink = this.page.locator('[data-test-subj*="alert-rule-link"]');
  }

  async gotoCasesList() {
    await this.page.gotoApp('observability/cases');
  }

  async gotoCreateCase() {
    await this.page.gotoApp('observability/cases/create');
  }

  async gotoCase(caseId: string) {
    await this.page.gotoApp(`observability/cases/${caseId}`);
  }

  async clickCreateCase() {
    await this.createCaseButton.click();
  }

  /**
   * Types a comment into the single-case-view markdown editor so the
   * "Add comment" submit button becomes enabled (it is disabled while empty).
   */
  async typeComment(text: string) {
    await this.commentTextArea.fill(text);
  }

  async clickAlertRuleLink() {
    await this.alertRuleLink.click();
  }
}
