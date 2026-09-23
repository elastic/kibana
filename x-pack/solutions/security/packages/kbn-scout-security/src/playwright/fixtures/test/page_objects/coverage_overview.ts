/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { DATA_LOAD_TIMEOUT_MS } from '../../../constants/timeouts';

/**
 * Coverage Overview dashboard page — the MITRE ATT&CK matrix showing rule coverage.
 * Navigates to `/app/security/rules_coverage_overview`.
 */
export class CoverageOverviewPage {
  /** Locator for the error callout shown when the MITRE data fetch fails. */
  readonly errorCallout: Locator;
  /** Locator for the rule activity filter button that opens the activity popover. */
  readonly activityFilterButton: Locator;
  /** Locator for the selectable option list inside the activity filter popover. */
  readonly activityFilterList: Locator;
  /** Locator for all tactic header panels, in DOM (position) order. */
  readonly tacticPanels: Locator;
  /**
   * Locator for the matrix container element. The attribute
   * `coverageOverviewMatrix` is only added to the DOM in the loaded
   * branch of coverage_overview_dashboard.tsx — it is absent during the spinner
   * and error-callout branches.
   */
  readonly matrix: Locator;

  constructor(private readonly page: ScoutPage) {
    this.errorCallout = this.page.testSubj.locator('coverageOverviewMitreErrorCallout');
    this.activityFilterButton = this.page.testSubj.locator(
      'coverageOverviewRuleActivityFilterButton'
    );
    this.activityFilterList = this.page.testSubj.locator('coverageOverviewFilterList');
    this.tacticPanels = this.page.testSubj.locator('coverageOverviewTacticPanel');
    this.matrix = this.page.testSubj.locator('coverageOverviewMatrix');
  }

  /** Navigates to the coverage overview page and waits for the matrix to load. */
  async navigate(): Promise<void> {
    await this.page.gotoApp('security/rules_coverage_overview');
    await this.waitForMatrixLoaded();
  }

  /**
   * Waits until the matrix container is visible. The `coverageOverviewMatrix`
   * attribute is rendered only when the dashboard is in the loaded state — it is
   * absent during the loading spinner and error-callout branches, so its presence
   * is a reliable readiness signal without requiring an assertion in the page object.
   *
   * Known tradeoff: a MITRE fetch error causes a 30 s timeout rather than a
   * fast diagnostic. The specs assert on `errorCallout` directly, so the error
   * case is still caught — just not fail-fast.
   */
  async waitForMatrixLoaded(): Promise<void> {
    await this.matrix.waitFor({ state: 'visible', timeout: DATA_LOAD_TIMEOUT_MS });
  }

  /**
   * Returns a locator for the tactic group column identified by `tacticId`.
   * The group contains the tactic panel and all technique panels for that tactic.
   */
  tacticGroup(tacticId: string): Locator {
    return this.page.testSubj.locator(`coverageOverviewTacticGroup-${tacticId}`);
  }

  /**
   * Opens the rule activity filter popover, clicks the option whose rendered
   * label contains `optionLabel` (e.g. `'Disabled rules'`), then closes the
   * popover and waits for the matrix to finish re-loading.
   *
   * A filter change creates a fresh React Query cache entry for the coverage
   * overview route, so the matrix unmounts and remounts. Waiting for the network
   * response is deterministic proof that the click caused a refetch — a pure DOM
   * wait can resolve against the stale matrix before React has flushed the update.
   */
  async selectActivityFilterOption(optionLabel: string): Promise<void> {
    const refetched = this.page.waitForResponse(
      (r) => r.url().includes('/rules/_coverage_overview') && r.request().method() === 'POST'
    );
    await this.activityFilterButton.click();
    await this.activityFilterList.getByText(optionLabel).click();
    // Close the popover with Escape. This is idempotent: if EUI already closed
    // the popover on option selection this is a no-op, whereas a second click on
    // the toggle would re-open the popover and leave it over the matrix during
    // the waitForMatrixLoaded() call below.
    await this.page.keyboard.press('Escape');
    await refetched;
    await this.waitForMatrixLoaded();
  }
}
