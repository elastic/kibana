/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout';

export class Homepage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goto() {
    // Skip to homepage by going to the URL twice.
    await this.page.gotoApp('elasticsearch/home');
    await this.page.testSubj.waitForSelector('skipAndGoHomeBtn');
    await this.page.gotoApp('elasticsearch/home');
    await this.page.testSubj.waitForSelector('search-homepage');
  }

  async getManageLink() {
    return this.page.testSubj.locator('searchHomepageSearchHomepagePageManageSubscriptionLink');
  }

  async getHeaderLeftGroup() {
    return this.page.testSubj.locator('searchHomepageHeaderLeftsideGroup');
  }
}
