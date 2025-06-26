/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type Page, type Locator } from '@playwright/test';

export class KubernetesOverviewDashboardPage {
  page: Page;

  private readonly nodesPanelChart: Locator;

  constructor(page: Page) {
    this.page = page;

    this.nodesPanelChart = this.page
      .locator(`#panel-7116207b-48ce-4d93-9fbd-26d73af1c185`)
      .getByTestId('xyVisChart');
  }

  async assertNodesPanelNotEmpty() {
    await expect(this.nodesPanelChart).toBeVisible();
  }
}
