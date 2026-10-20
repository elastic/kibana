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
    this.header = this.page.getByTestId('elasticsearchHomeHeaderLeftsideGroup');
    this.documentationLink = this.page.getByTestId('elasticsearchHomeDocumentationLink');

    this.banner = this.page.getByTestId('elasticsearchHomeBanner');
    this.bannerGetStartedButton = this.page.getByTestId('elasticsearchHomeBannerGetStartedBtn');

    this.dataCard = this.page.getByTestId('homePageDataCard');
    this.dashboardsCard = this.page.getByTestId('homePageDashboardsCard');
    this.workflowsCard = this.page.getByTestId('homePageWorkflowsCard');
    this.apiKeysCard = this.page.getByTestId('homePageApiKeysCard');
    this.manageDataButton = this.page.getByTestId('homePageDataCardDataManagement');

    this.newIndexPanel = this.page.getByTestId('homePageDataCardNewIndex');
    this.newIndexName = this.page.getByTestId('homePageDataCardNewIndexName');
    this.newIndexDismissButton = this.page.getByTestId('homePageDataCardNewIndexDismissBtn');

    this.addDataEmbeddingsLink = this.page.getByTestId('addDataEmbeddingsLink');
    this.addDataDevToolsLink = this.page.getByTestId('addDataDevToolsLink');
    this.addDataSampleDataLink = this.page.getByTestId('addDataSampleDataLink');
    this.addDataUploadFileLink = this.page.getByTestId('addDataUploadFileLink');
    this.viewPromptButton = this.page.getByTestId('viewPromptButton');
    this.openElasticAgentButton = this.page.getByTestId('openElasticAgentButton');
    this.promptModal = this.page.getByTestId('elasticsearchHomePromptModal');
    this.promptModalCloseButton = this.page.getByTestId('elasticsearchHomePromptModalCloseButton');
  }

  async goto() {
    await this.page.gotoApp(VECTORDB_APP);
    await this.header.waitFor({ state: 'visible' });
  }

  /** The rendered value of a stat tile, e.g. `statValue('homePageDataCard', 'documents')`. */
  statValue(cardTestSubj: string, metricKey: string) {
    return this.page.getByTestId(`${cardTestSubj}-${metricKey}-value`);
  }
}
