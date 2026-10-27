/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-search';

export class Homepage {
  public readonly container;
  public readonly header;
  public readonly documentationLink;

  // Get started banner
  public readonly banner;
  public readonly bannerGetStartedButton;

  // Connection details
  public readonly generateApiKeyButton;
  public readonly connectionDetailsButton;
  public readonly connectionDetailsFlyout;
  public readonly connectionDetailsFlyoutTitle;
  public readonly apiKeyNameInput;
  public readonly createApiKeySubmitButton;
  public readonly apiKeySuccessForm;
  public readonly apiKeyValueRow;

  // Stat cards
  public readonly dataCard;
  public readonly dashboardsCard;
  public readonly workflowsCard;
  public readonly apiKeysCard;
  public readonly manageDataButton;
  public readonly dataCardTotalIndices;
  public readonly dataCardDocuments;
  public readonly dataCardTotalSize;
  public readonly dataCardTotalIndicesValue;
  public readonly dataCardDocumentsValue;
  public readonly dashboardsCardTotalValue;
  public readonly apiKeysCardTotalValue;

  // Add data / Build in your IDE
  public readonly addDataDevToolsLink;
  public readonly viewPromptButton;
  public readonly openElasticAgentButton;
  public readonly promptModal;

  constructor(private readonly page: ScoutPage) {
    this.container = this.page.getByTestId('elasticsearchHomePage');
    this.header = this.page.getByTestId('elasticsearchHomeHeaderLeftsideGroup');
    this.documentationLink = this.page.getByTestId('elasticsearchHomeDocumentationLink');

    this.banner = this.page.getByTestId('elasticsearchHomeBanner');
    this.bannerGetStartedButton = this.page.getByTestId('elasticsearchHomeBannerGetStartedBtn');

    this.generateApiKeyButton = this.page.getByTestId('elasticsearchHomeGenerateApiKeyButton');
    this.connectionDetailsButton = this.page.getByTestId(
      'elasticsearchHomeConnectionDetailsButton'
    );
    this.connectionDetailsFlyout = this.page.getByTestId('connectionDetailsModalBody');
    this.connectionDetailsFlyoutTitle = this.page.getByTestId('connectionDetailsModalTitle');
    this.apiKeyNameInput = this.page.getByTestId('connectionDetailsApiKeyNameInput');
    this.createApiKeySubmitButton = this.page.getByTestId('connectionDetailsApiKeySubmitBtn');
    this.apiKeySuccessForm = this.page.getByTestId('connectionDetailsApiKeySuccessForm');
    this.apiKeyValueRow = this.page.getByTestId('connectionDetailsApiKeyValueRow');

    this.dataCard = this.page.getByTestId('homePageDataCard');
    this.dashboardsCard = this.page.getByTestId('homePageDashboardsCard');
    this.workflowsCard = this.page.getByTestId('homePageWorkflowsCard');
    this.apiKeysCard = this.page.getByTestId('homePageApiKeysCard');
    this.manageDataButton = this.page.getByTestId('homePageDataCardDataManagement');
    this.dataCardTotalIndices = this.page.getByTestId('homePageDataCard-totalIndices');
    this.dataCardDocuments = this.page.getByTestId('homePageDataCard-documents');
    this.dataCardTotalSize = this.page.getByTestId('homePageDataCard-totalSize');
    this.dataCardTotalIndicesValue = this.page.getByTestId('homePageDataCard-totalIndices-value');
    this.dataCardDocumentsValue = this.page.getByTestId('homePageDataCard-documents-value');
    this.dashboardsCardTotalValue = this.page.getByTestId(
      'homePageDashboardsCard-dashboardsTotal-value'
    );
    this.apiKeysCardTotalValue = this.page.getByTestId('homePageApiKeysCard-apiKeysTotal-value');

    this.addDataDevToolsLink = this.page.getByTestId('addDataDevToolsLink');
    this.viewPromptButton = this.page.getByTestId('viewPromptButton');
    this.openElasticAgentButton = this.page.getByTestId('openElasticAgentButton');
    this.promptModal = this.page.getByTestId('elasticsearchHomePromptModal');
  }

  async goto() {
    await this.page.gotoApp('elasticsearch/home');
    await this.header.waitFor({ state: 'visible' });
    await this.page.getByTestId('homePageLoading').waitFor({ state: 'hidden' });
  }
}
