/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Page } from '@playwright/test';

export class SpaceSelector {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public readonly spaceSelector = () => this.page.getByText('Select your space');
  private readonly spaceSelectorDefault = () => this.page.getByRole('link', { name: 'Default' });

  public async selectDefault() {
    await this.spaceSelectorDefault().click();
  }
}
