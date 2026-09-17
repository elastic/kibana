/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '../../../../../ui';
import { APP_LOAD_TIMEOUT_MS } from '../../../constants/timeouts';

/**
 * Coverage Overview dashboard page — the MITRE ATT&CK matrix showing rule coverage.
 * Navigates to `/app/security/rules_coverage_overview`.
 */
export class CoverageOverviewPage {
  /** Locator for the error callout shown when the MITRE data fetch fails. */
  readonly errorCallout: Locator;
  /** Locator for the loading spinner shown while the matrix is initialising. */
  readonly loadingSpinner: Locator;
  /** Locator for the rule activity filter button that opens the activity popover. */
  readonly activityFilterButton: Locator;
  /** Locator for the selectable option list inside the activity filter popover. */
  readonly activityFilterList: Locator;
  /** Locator for all tactic header panels, in DOM (position) order. */
  readonly tacticPanels: Locator;

  constructor(private readonly page: ScoutPage) {
    this.errorCallout = this.page.testSubj.locator('coverageOverviewMitreErrorCallout');
    this.loadingSpinner = this.page.testSubj.locator('coverageOverviewLoadingSpinner');
    this.activityFilterButton = this.page.testSubj.locator(
      'coverageOverviewRuleActivityFilterButton'
    );
    this.activityFilterList = this.page.testSubj.locator('coverageOverviewFilterList');
    this.tacticPanels = this.page.testSubj.locator('coverageOverviewTacticPanel');
  }

  /** Navigates to the coverage overview page and waits for the matrix to load. */
  async navigate(): Promise<void> {
    await this.page.gotoApp('security/rules_coverage_overview');
    await this.waitForMatrixLoaded();
  }

  /**
   * Waits until the matrix has actually rendered.
   *
   * Waiting only for the spinner to detach is not sufficient: before the
   * dashboard mounts, neither the spinner nor the matrix elements exist, so a
   * detached-spinner check resolves immediately against a blank page. The
   * positive assertion on `tacticPanels` guarantees the matrix DOM is present
   * before any further assertions run.
   *
   * spinner / error callout / matrix are mutually exclusive render branches in
   * coverage_overview_dashboard.tsx, so the spinner-detach wait is redundant
   * once `tacticPanels` have appeared. Racing against `errorCallout` lets a
   * failed MITRE fetch fail fast with a diagnostic instead of timing out for
   * the full APP_LOAD_TIMEOUT_MS.
   */
  async waitForMatrixLoaded(): Promise<void> {
    await expect(this.tacticPanels.or(this.errorCallout)).not.toHaveCount(0, {
      timeout: APP_LOAD_TIMEOUT_MS,
    });

    if (await this.errorCallout.isVisible()) {
      throw new Error(
        'Coverage overview MITRE data fetch failed: error callout is visible instead of the matrix'
      );
    }
  }

  /**
   * Returns a locator for the tactic group column identified by `tacticId`.
   * The group contains the tactic panel and all technique panels for that tactic.
   */
  tacticGroup(tacticId: string): Locator {
    return this.page.testSubj.locator(`coverageOverviewTacticGroup-${tacticId}`);
  }

  /**
   * Returns a locator for the title element of a specific technique inside a
   * specific tactic column. Use `.toBeVisible()` / `not.toBeVisible()` to
   * assert presence or absence.
   *
   * @param techniqueId - the MITRE technique id, e.g. `'T9001'`
   * @param tacticId    - the MITRE tactic id that scopes the search, e.g. `'TA9001'`
   */
  techniqueTitleInTactic(techniqueId: string, tacticId: string): Locator {
    return this.tacticGroup(tacticId).locator(
      `[data-test-subj="coverageOverviewTechniqueTitle-${techniqueId}"]`
    );
  }

  /**
   * Opens the rule activity filter popover, clicks the option whose rendered
   * label contains `optionLabel` (e.g. `'Disabled rules'`), then closes the
   * popover and waits for the matrix to finish re-loading.
   */
  async selectActivityFilterOption(optionLabel: string): Promise<void> {
    await this.activityFilterButton.click();
    await this.activityFilterList.getByText(optionLabel).click();
    // Close the popover with Escape. This is idempotent: if EUI already closed
    // the popover on option selection this is a no-op, whereas a second click on
    // the toggle would re-open the popover and leave it over the matrix during
    // the waitForMatrixLoaded() call below.
    await this.page.keyboard.press('Escape');
    await this.waitForMatrixLoaded();
  }
}
