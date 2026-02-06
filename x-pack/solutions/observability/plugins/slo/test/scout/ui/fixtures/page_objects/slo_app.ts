/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ScoutPage, ScoutTestConfig } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';

export class SLOApp {
  constructor(private readonly page: ScoutPage, private readonly config: ScoutTestConfig) {}
  async goto() {
    await this.page.gotoApp('slo');
    await expect(this.page.getByText('Manage SLOs')).toBeVisible();
  }

  async openFromSideMenu() {
    if (this.config.isCloud) {
      await this.page.testSubj.hover('kbnChromeNav-moreMenuTrigger');
      await this.page.testSubj.waitForSelector('side-nav-popover-More');
      await this.page.locator('#slo').click();
    } else {
      await this.page.getByTestId('observability-nav-slo-slos').click();
    }
  }
}
