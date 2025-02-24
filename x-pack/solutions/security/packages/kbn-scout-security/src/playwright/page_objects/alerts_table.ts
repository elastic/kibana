/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutPage, Locator } from '@kbn/scout';

const PAGE_URL = 'security/alerts';

export class AlertsTablePage {
  public expandAlertBtn: Locator;

  constructor(private readonly page: ScoutPage) {
    this.expandAlertBtn = this.page.testSubj.locator('expand-event');
  }

  async navigate() {
    await this.page.gotoApp(PAGE_URL);
  }

  async expandAlertDetailsFlyout(index = 0) {
    await this.expandAlertBtn.nth(index).click();
  }

  async getCurrentUrl() {
    const url = await this.page.url();
    return url;
  }

  async reload() {
    this.page.reload();
  }
}
