/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { UX_APP_PATH, DEFAULT_QUERY_PARAMS } from '../constants';

export class UxDashboardPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goto(queryParams: Record<string, string> = DEFAULT_QUERY_PARAMS): Promise<void> {
    const queryString = new URLSearchParams(queryParams).toString();
    await this.page.goto(this.kbnUrl.get(`${UX_APP_PATH}?${queryString}`));
  }

  async waitForLoadingToFinish(): Promise<void> {
    await this.page.testSubj.locator('uxClientMetrics-totalPageLoad').waitFor({ state: 'visible' });
  }

  async waitForChartData(): Promise<void> {
    await this.page.waitForFunction(
      () => document.querySelectorAll('.euiLoadingChart').length === 0,
      null,
      { timeout: 30000 }
    );
  }

  async scrollToSection(ariaLabel: string): Promise<void> {
    await this.page.locator(`[aria-label="${ariaLabel}"]`).scrollIntoViewIfNeeded();
  }

  async selectBreakdownOption(filterTestSubj: string, optionText: string): Promise<void> {
    await this.page.testSubj.click(filterTestSubj);
    await this.page.getByRole('option', { name: optionText }).click();
  }

  lensEmbeddableLocator(dataTestId: string) {
    return this.page.locator(`[data-test-embeddable-id="${dataTestId}"]`);
  }

  embeddablePanelMenuIcon() {
    return this.page.testSubj
      .locator('uxPageViewsChart')
      .locator('[data-test-subj="embeddablePanelToggleMenuIcon"]');
  }
}
