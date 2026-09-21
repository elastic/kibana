/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { VECTORDB_APP } from '../constants';

export class VectordbHomePage {
  public readonly header;
  public readonly documentationLink;

  // Get started banner
  public readonly banner;
  public readonly bannerGetStartedButton;

  // Stat cards
  public readonly dataCard;
  public readonly dashboardsCard;
  public readonly workflowsCard;
  public readonly apiKeysCard;
  public readonly manageDataButton;

  // "New index" callout inside the data card
  public readonly newIndexPanel;
  public readonly newIndexName;
  public readonly newIndexDismissButton;

  // Add data / Build in your IDE
  public readonly addDataEmbeddingsLink;
  public readonly addDataDevToolsLink;
  public readonly addDataSampleDataLink;
  public readonly addDataUploadFileLink;
  public readonly viewPromptButton;
  public readonly openElasticAgentButton;
  public readonly promptModal;
  public readonly promptModalCloseButton;

  constructor(private readonly page: ScoutPage) {
    this.header = this.page.testSubj.locator('vectordbHomepageHeaderLeftsideGroup');
    this.documentationLink = this.page.testSubj.locator('vectordbHomepageDocumentationLink');

    this.banner = this.page.testSubj.locator('vectordbHomePageBanner');
    this.bannerGetStartedButton = this.page.testSubj.locator('vectordbHomePageBannerGetStartedBtn');

    this.dataCard = this.page.testSubj.locator('homePageDataCard');
    this.dashboardsCard = this.page.testSubj.locator('homePageDashboardsCard');
    this.workflowsCard = this.page.testSubj.locator('homePageWorkflowsCard');
    this.apiKeysCard = this.page.testSubj.locator('homePageApiKeysCard');
    this.manageDataButton = this.page.testSubj.locator('homePageDataCardDataManagement');

    this.newIndexPanel = this.page.testSubj.locator('homePageDataCardNewIndex');
    this.newIndexName = this.page.testSubj.locator('homePageDataCardNewIndexName');
    this.newIndexDismissButton = this.page.testSubj.locator('homePageDataCardNewIndexDismissBtn');

    this.addDataEmbeddingsLink = this.page.testSubj.locator('addDataEmbeddingsLink');
    this.addDataDevToolsLink = this.page.testSubj.locator('addDataDevToolsLink');
    this.addDataSampleDataLink = this.page.testSubj.locator('addDataSampleDataLink');
    this.addDataUploadFileLink = this.page.testSubj.locator('addDataUploadFileLink');
    this.viewPromptButton = this.page.testSubj.locator('viewPromptButton');
    this.openElasticAgentButton = this.page.testSubj.locator('openElasticAgentButton');
    this.promptModal = this.page.testSubj.locator('vectordbPromptModal');
    this.promptModalCloseButton = this.page.testSubj.locator('vectordbPromptModalCloseButton');
  }

  async goto() {
    await this.page.gotoApp(VECTORDB_APP);
    await this.header.waitFor({ state: 'visible' });
  }

  /** The rendered value of a stat tile, e.g. `statValue('homePageDataCard', 'documents')`. */
  statValue(cardTestSubj: string, metricKey: string) {
    return this.page.testSubj.locator(`${cardTestSubj}-${metricKey}-value`);
  }
}
