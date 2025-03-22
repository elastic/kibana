/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutPage, Locator } from '@kbn/scout';

const PAGE_URL = 'security/alerts';
const EXPAND_EVENT = 'expand-event';

export class AlertsTablePage {
  public expandAlertBtn: Locator;

  constructor(private readonly page: ScoutPage) {
    this.expandAlertBtn = this.page.testSubj.locator(EXPAND_EVENT);
  }

  async navigate() {
    await this.page.gotoApp(PAGE_URL);
  }

  async expandFirstAlertDetailsFlyout() {
    const maxAttempts = 100;
    let attempts = 0;

    while ((await this.expandAlertBtn.count()) === 0) {
      if (attempts >= maxAttempts) {
        throw new Error('Timed out waiting for alert buttons to appear');
      }
      await this.page.waitForTimeout(100);
      attempts++;
    }
    const buttons = await this.expandAlertBtn.all();

    if (buttons.length > 0) {
      await buttons[0].click();
    } else {
      throw new Error('No expand alert details buttons found');
    }
  }

  async getCurrentUrl() {
    const url = this.page.url();
    return url;
  }

  async reload() {
    return this.page.reload();
  }
}
