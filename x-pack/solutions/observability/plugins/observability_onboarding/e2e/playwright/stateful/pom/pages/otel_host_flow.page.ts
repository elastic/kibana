/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Page } from '@playwright/test';

export class OtelHostFlowPage {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async copyCollectorDownloadSnippetToClipboard() {
    await this.page.getByTestId('observabilityOnboardingOtelLogsPanelButton').click();
  }

  public async copyCollectorStartSnippetToClipboard() {
    await this.page
      .getByTestId('observabilityOnboardingCopyableCodeBlockCopyToClipboardButton')
      .click();
  }

  public async clickHostsOverviewCTA() {
    await this.page.getByTestId('obltOnboardingExploreMetrics').click();
  }
}
