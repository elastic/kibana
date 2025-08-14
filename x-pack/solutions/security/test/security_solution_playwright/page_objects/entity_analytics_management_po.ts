/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Locator, Page } from '@playwright/test';

const PAGE_TITLE = '[data-test-subj="entityAnalyticsManagementPageTitle"]';

export class EntityAnalyticsManagementPage {
  page: Page;
  entityAnalyticsManagementPageTitle!: Locator;

  constructor(page: Page) {
    this.page = page;
  }

  async initialize() {
    this.entityAnalyticsManagementPageTitle = this.page.locator(PAGE_TITLE);
  }
}
