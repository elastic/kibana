/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

export class PolicyDetailsPage {
  readonly pageContainer: Locator;
  readonly settingsTab: Locator;
  readonly backToOrigin: Locator;

  constructor(private readonly page: ScoutPage) {
    this.pageContainer = this.page.testSubj.locator('policyDetailsPage');
    this.settingsTab = this.page.testSubj.locator('policySettingsTab');
    this.backToOrigin = this.page.testSubj.locator('backToOrigin');
  }

  artifactTab(tabTestSubj: string): Locator {
    return this.page.testSubj.locator(tabTestSubj);
  }

  async goto(policyId: string) {
    await this.page.gotoApp(`security/administration/policy/${policyId}`);
    await this.pageContainer.waitFor({ state: 'visible' });
    await this.settingsTab.waitFor({ state: 'visible' });
  }

  async openArtifactTab(tabTestSubj: string) {
    const tab = this.artifactTab(tabTestSubj);
    await tab.waitFor({ state: 'visible' });
    await tab.click();
  }

  async waitForPolicyDetailsVisible() {
    await this.pageContainer.waitFor({ state: 'visible' });
  }

  async clickBackToOrigin() {
    await this.backToOrigin.click();
    await this.pageContainer.waitFor({ state: 'visible' });
  }
}
