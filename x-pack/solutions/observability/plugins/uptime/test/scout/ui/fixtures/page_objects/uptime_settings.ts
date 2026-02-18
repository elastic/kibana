/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, KibanaUrl } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';

export class UptimeSettingsPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goto(queryParams?: string): Promise<void> {
    const url = queryParams
      ? this.kbnUrl.get(`/app/uptime/settings?${queryParams}`)
      : this.kbnUrl.get('/app/uptime/settings');
    await this.page.goto(url);
  }

  async waitForLoadingToFinish(): Promise<void> {
    await expect(this.page.testSubj.locator('kbnLoadingMessage')).toBeHidden();
  }

  async fillToEmail(text: string): Promise<void> {
    await this.page
      .locator('[data-test-subj=toEmailAddressInput] >> [data-test-subj=comboBoxSearchInput]')
      .fill(text);
    await this.page.testSubj.click('uptimeSettingsPage');
  }

  async saveSettings(): Promise<void> {
    await this.page.testSubj.click('apply-settings-button');
    await this.waitForLoadingToFinish();
    await expect(this.page.locator('text=Settings saved!')).toBeVisible();
  }

  async assertApplyEnabled(): Promise<void> {
    await expect(this.page.testSubj.locator('apply-settings-button')).toBeEnabled();
  }

  async assertApplyDisabled(): Promise<void> {
    await expect(this.page.testSubj.locator('apply-settings-button')).toBeDisabled();
  }

  async removeInvalidEmail(invalidEmail: string): Promise<void> {
    await this.page
      .locator(`[title="Remove ${invalidEmail} from selection in this group"]`)
      .click();
  }
}
