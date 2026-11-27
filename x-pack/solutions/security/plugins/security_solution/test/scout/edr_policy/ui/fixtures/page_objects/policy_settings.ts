/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_LOAD_TIMEOUT_MS } from '@kbn/scout-security';
import type { Locator, ScoutPage } from '@kbn/scout-security';

/** Settings tab of the endpoint policy details page. Actions and locators only. */
export class PolicySettingsPage {
  readonly saveButton: Locator;
  readonly malwareProtectionSwitch: Locator;
  readonly protectionUpdatesTab: Locator;

  constructor(private readonly page: ScoutPage) {
    this.saveButton = this.page.testSubj.locator('policyDetailsSaveButton');
    this.malwareProtectionSwitch = this.page.testSubj.locator(
      'endpointPolicyForm-perOsMalware-enableDisableSwitch'
    );
    this.protectionUpdatesTab = this.page.testSubj.locator('policyProtectionUpdatesTab');
  }

  /** Opens the tab of `policyId` and waits until the policy form has rendered. */
  async goto(policyId: string): Promise<void> {
    await this.page.gotoApp(`security/administration/policy/${policyId}/settings`, {
      readyWhen: this.malwareProtectionSwitch,
      // A cold Security app load after a custom-role login can exceed the 30s default.
      readyTimeout: APP_LOAD_TIMEOUT_MS,
    });
  }

  async toggleMalwareProtection(): Promise<void> {
    await this.malwareProtectionSwitch.click();
  }

  async openProtectionUpdatesTab(): Promise<void> {
    await this.protectionUpdatesTab.click();
  }
}
