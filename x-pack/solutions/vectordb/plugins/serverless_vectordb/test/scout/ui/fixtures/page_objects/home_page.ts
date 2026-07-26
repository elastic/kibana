/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/** Vector DB home page: stats overview, banner CTA, and documentation quick links. */
export class VectordbHomePage {
  readonly banner: Locator;
  readonly getStartedButton: Locator;
  readonly viewSupportedModelsButton: Locator;
  readonly viewDocumentationLink: Locator;
  readonly quickLinkPanels: Locator;

  constructor(private readonly page: ScoutPage) {
    this.banner = page.testSubj.locator('homePageBanner');
    this.getStartedButton = page.testSubj.locator('homePageBannerGetStartedBtn');
    this.viewSupportedModelsButton = page.testSubj.locator('homePageBannerViewSupportedModelsBtn');
    this.viewDocumentationLink = page.testSubj.locator('viewDocumentationLink');
    this.quickLinkPanels = page.locator('[data-test-subj^="quickLinkPanel-"]');
  }

  async goto() {
    await this.page.gotoApp('vectordb');
  }

  quickLinkPanel(id: string): Locator {
    return this.page.testSubj.locator(`quickLinkPanel-${id}`);
  }
}
