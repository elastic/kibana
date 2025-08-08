/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type Page } from '@playwright/test';

export class ApmServiceInventoryPage {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async assertTransactionExists() {
    await expect(this.page.getByTestId('apmTransactionDetailLinkLink')).toBeVisible();
  }
}
