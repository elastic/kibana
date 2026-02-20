/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { APP_POLICIES_PATH, getPolicyDetailsPath } from '../../common/defend_workflows_urls';

/**
 * Page object for Endpoint Policy management.
 */
export class EndpointPolicyPage {
  constructor(private readonly page: ScoutPage) {}

  async gotoList(): Promise<void> {
    await this.page.goto(APP_POLICIES_PATH);
  }

  async gotoDetails(policyId: string, tab?: string): Promise<void> {
    await this.page.goto(getPolicyDetailsPath(policyId, tab));
    await this.page.testSubj.locator('policyDetailsPage').first().waitFor({ state: 'visible' });
  }

  async waitForPolicyDetails(): Promise<void> {
    await this.page.testSubj.locator('policyDetailsPage').first().waitFor({ state: 'visible' });
    await this.page.locator('#settings').first().waitFor({ state: 'visible' });
  }

  async clickSavePolicy(): Promise<void> {
    await this.page.testSubj.locator('policyDetailsSaveButton').first().click();
    await this.page.testSubj.locator('policyDetailsConfirmModal').first().waitFor({ state: 'visible' });
    await this.page.testSubj.locator('confirmModalConfirmButton').first().click();
  }

  async clickBlocklistToggle(): Promise<void> {
    const switchEl = this.page.testSubj
      .locator('endpointPolicyForm-malware-blocklist-enableDisableSwitch')
      .first();
    await switchEl.click();
  }

  async clickBackToEndpoints(): Promise<void> {
    await this.page.testSubj.locator('policyDetailsBackLink').first().click();
  }
}
