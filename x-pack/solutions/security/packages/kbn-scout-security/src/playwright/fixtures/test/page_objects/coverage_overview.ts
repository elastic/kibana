/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { APP_LOAD_TIMEOUT_MS } from '../../../constants/timeouts';

/** Timeout for the MITRE ATT&CK entities API call and rules query to resolve. */
const MATRIX_LOAD_TIMEOUT_MS = 30_000;

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

  constructor(private readonly page: ScoutPage) {
    this.errorCallout = this.page.testSubj.locator('coverageOverviewMitreErrorCallout');
    this.loadingSpinner = this.page.testSubj.locator('coverageOverviewLoadingSpinner');
    this.activityFilterButton = this.page.testSubj.locator(
      'coverageOverviewRuleActivityFilterButton'
    );
    this.activityFilterList = this.page.testSubj.locator('coverageOverviewFilterList');
  }

  /** Navigates to the coverage overview page and waits for the matrix to load. */
  async navigate(): Promise<void> {
    await this.page.gotoApp('security/rules_coverage_overview');
    await this.waitForMatrixLoaded();
  }

  /**
   * Waits until the matrix has actually rendered.
   *
   * Waiting only for the spinner to detach is not enough: while Kibana is still
   * on its bootstrap splash screen the spinner has not rendered either, so a
   * detached check resolves immediately against a page with no matrix on it.
   * Wait for the page chrome (the activity filter, which renders independently
   * of the matrix) before confirming the spinner is gone.
   */
  async waitForMatrixLoaded(): Promise<void> {
    await this.activityFilterButton.waitFor({
      state: 'visible',
      timeout: APP_LOAD_TIMEOUT_MS,
    });
    await this.loadingSpinner.waitFor({
      state: 'detached',
      timeout: MATRIX_LOAD_TIMEOUT_MS,
    });
  }

  /** Returns a locator for all tactic header panels, in DOM (position) order. */
  tacticPanels(): Locator {
    return this.page.testSubj.locator('coverageOverviewTacticPanel');
  }

  /**
   * Returns a locator for the tactic group column identified by `tacticId`.
   * The group contains the tactic panel and all technique panels for that tactic.
   */
  tacticGroup(tacticId: string): Locator {
    return this.page.testSubj.locator(`coverageOverviewTacticGroup-${tacticId}`);
  }

  /**
   * Returns a locator for all technique panels inside the specified tactic column.
   * Use this to count or enumerate techniques without targeting a specific one.
   */
  techniquesInTactic(tacticId: string): Locator {
    return this.tacticGroup(tacticId).locator('[data-test-subj="coverageOverviewTechniquePanel"]');
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
    // Close the popover by clicking the toggle button again.
    await this.activityFilterButton.click();
    await this.waitForMatrixLoaded();
  }
}
