/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';

/** Cold Security `gotoApp` after a custom-role login can exceed Playwright's 10s default. */
const POLICY_DETAILS_READY_TIMEOUT_MS = 30_000;

export class PolicyDetailsPage {
  readonly pageContainer: Locator;
  readonly loading: Locator;
  readonly settingsTab: Locator;
  readonly backToOrigin: Locator;

  constructor(private readonly page: ScoutPage) {
    this.pageContainer = this.page.testSubj.locator('policyDetailsPage');
    this.loading = this.page.testSubj.locator('policyDetailsLoading');
    this.settingsTab = this.page.testSubj.locator('policySettingsTab');
    this.backToOrigin = this.page.testSubj.locator('backToOrigin');
  }

  artifactTab(tabTestSubj: string): Locator {
    return this.page.testSubj.locator(tabTestSubj);
  }

  async goto(policyId: string) {
    await this.page.gotoApp(`security/administration/policy/${policyId}`);
    await this.waitForPolicyDetailsReady();
  }

  /**
   * Reload the current policy-details URL after API-seeded list changes.
   * Cheaper than `gotoApp` when the browser is already on this page.
   */
  async reload() {
    await this.page.reload();
    await this.waitForPolicyDetailsReady();
  }

  async openArtifactTab(tabTestSubj: string) {
    const tab = this.artifactTab(tabTestSubj);
    await tab.waitFor({ state: 'visible' });
    await tab.click();
  }

  async waitForPolicyDetailsVisible() {
    await this.pageContainer.waitFor({
      state: 'visible',
      timeout: POLICY_DETAILS_READY_TIMEOUT_MS,
    });
  }

  private async waitForPolicyDetailsReady() {
    await this.waitForPolicyDetailsVisible();
    // Detached counts as hidden, so this is a no-op when the fetch is already done.
    await this.loading.waitFor({
      state: 'hidden',
      timeout: POLICY_DETAILS_READY_TIMEOUT_MS,
    });
    await this.settingsTab.waitFor({
      state: 'visible',
      timeout: POLICY_DETAILS_READY_TIMEOUT_MS,
    });
  }

  async clickBackToOrigin() {
    await this.backToOrigin.click();
    await this.waitForPolicyDetailsVisible();
  }
}
