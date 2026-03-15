/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class ArtifactsPage {
  readonly pageContainer: Locator;

  constructor(protected readonly page: ScoutPage, private readonly artifactType: string) {
    this.pageContainer = this.page.testSubj.locator(`${artifactType}-container`);
  }

  async navigate(searchParams?: string) {
    const url = searchParams
      ? `/app/security/administration/${this.artifactType}?${searchParams}`
      : `/app/security/administration/${this.artifactType}`;
    await this.page.goto(url);
    await this.page.waitForLoadingIndicatorHidden();
  }

  async waitForPageLoaded() {
    await this.pageContainer.waitFor({ state: 'visible' });
  }

  async clickCardActionMenu() {
    await this.page.testSubj.locator(`${this.artifactType}-card-header-actions-button`).click();
  }
}
