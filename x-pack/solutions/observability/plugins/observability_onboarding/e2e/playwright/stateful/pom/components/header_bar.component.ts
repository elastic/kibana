/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class HeaderBar {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public readonly helpMenuButton = () => this.page.getByTestId('helpMenuButton');

  public async assertHelpMenuButton() {
    await expect(this.helpMenuButton(), 'Help menu button').toBeVisible();
  }
}
