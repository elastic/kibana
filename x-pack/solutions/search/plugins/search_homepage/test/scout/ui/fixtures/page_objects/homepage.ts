/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-search';

export class Homepage {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.gotoApp('elasticsearch/home');
    await this.page.testSubj.waitForSelector('search-homepage');
  }

  async getManageLink() {
    return this.page.testSubj.locator('searchHomepageSearchHomepagePageManageSubscriptionLink');
  }

  async getHeaderLeftGroup() {
    return this.page.testSubj.locator('searchHomepageHeaderLeftsideGroup');
  }

  async getNavigationCards() {
    return this.page.locator('[data-test-subj^="searchHomepageNavLinks-"]');
  }

  async clickNavigationCard(cardId: string) {
    return this.page.testSubj.locator(cardId).click();
  }

  async clickGettingStartedButton() {
    await this.page.testSubj.waitForSelector(
      'searchHomepageGettingStartedBannerGetStartedWithElasticsearchButton'
    );
    return this.page.testSubj
      .locator('searchHomepageGettingStartedBannerGetStartedWithElasticsearchButton')
      .click();
  }

  async getCloudResourceCards() {
    return this.page.locator('[data-test-subj^="cloudResourceCard-"]');
  }

  async getCloudResourceCardLink(cardId: string) {
    return this.page.testSubj.locator(cardId).getByRole('link');
  }

  async getApiKeyButton() {
    return this.page.testSubj.locator('searchHomepageConnectToElasticsearchApiKeysButton');
  }

  async clickApiKeysButton() {
    await this.page.testSubj.locator('searchHomepageConnectToElasticsearchApiKeysButton').click();
  }

  async getConnectionDetailsFlyout() {
    return this.page.testSubj.locator('connectionDetailsModalBody');
  }

  async getConnectionDetailsFlyoutTitle() {
    return this.page.testSubj.locator('connectionDetailsModalTitle');
  }

  async clickConnectionDetailsButton() {
    await this.page.testSubj
      .locator('searchHomepageConnectToElasticsearchConnectionDetailsButton')
      .click();
  }

  async fillApiKeyName(name: string) {
    await this.page.testSubj.locator('connectionDetailsApiKeyNameInput').fill(name);
  }

  async clickCreateApiKeySubmitButton() {
    await this.page.testSubj.locator('connectionDetailsApiKeySubmitBtn').click();
  }

  async getApiKeySuccessForm() {
    return this.page.testSubj.locator('connectionDetailsApiKeySuccessForm');
  }

  async getApiKeyValueRow() {
    return this.page.testSubj.locator('connectionDetailsApiKeyValueRow');
  }

  // Embedded Console methods
  async expectEmbeddedConsoleControlBarExists() {
    await this.page.testSubj.waitForSelector('consoleEmbeddedSection');
  }

  async getEmbeddedConsoleBody() {
    return this.page.testSubj.locator('consoleEmbeddedBody');
  }

  async clickEmbeddedConsoleControlBar() {
    await this.page.testSubj.locator('consoleEmbeddedControlBar').click();
  }

  async getFullscreenToggleButton() {
    return this.page.testSubj.locator('consoleToggleFullscreenButton');
  }

  async getSearchHomepageContainer() {
    return this.page.testSubj.locator('search-homepage');
  }

  // V1 Homepage - Elasticsearch endpoint and API Keys
  async getCopyEndpointButton() {
    return this.page.testSubj.locator('copyEndpointButton');
  }

  async getCopyEndpointButtonCopied() {
    return this.page.testSubj.locator('copyEndpointButton-copied');
  }

  async getEndpointValueField() {
    return this.page.testSubj.locator('endpointValueField');
  }

  async getCreateApiKeyButton() {
    return this.page.testSubj.locator('createApiKeyButton');
  }

  async getManageApiKeysButton() {
    return this.page.testSubj.locator('manageApiKeysButton');
  }

  async getActiveApiKeysBadge() {
    return this.page.testSubj.locator('activeApiKeysBadge');
  }

  async clickCreateApiKeyButton() {
    await this.page.testSubj.locator('createApiKeyButton').click();
  }

  async clickManageApiKeysButton() {
    await this.page.testSubj.locator('manageApiKeysButton').click();
  }

  async getCreateApiKeyFlyoutHeader() {
    return this.page.locator('.euiFlyoutHeader');
  }

  // V1 Homepage - Connect To Elasticsearch Side Panel
  async getUploadFileButton() {
    // There are 2 elements with this test subject (a card div and a button), so we target the button specifically
    return this.page.locator('button[data-test-subj="uploadFileButton"]');
  }

  async clickUploadFileButton() {
    await this.page.locator('button[data-test-subj="uploadFileButton"]').click();
  }

  async getCreateIndexCard() {
    return this.page.testSubj.locator('gettingStartedCreateIndexButton');
  }

  async getCreateIndexButton() {
    return this.page.testSubj.locator('createIndexButton');
  }

  async clickCreateIndexButton() {
    await this.page.testSubj.locator('createIndexButton').click();
  }

  async getSampleDataSection() {
    return this.page.testSubj.locator('sampleDataSection');
  }

  async getInstallSampleDataButton() {
    return this.page.testSubj.locator('installSampleBtn');
  }

  async getViewDataButton() {
    return this.page.testSubj.locator('viewDataBtn');
  }

  // V1 Homepage - Get started with API (Console Tutorials)
  async getConsoleTutorial(tutorialId: string) {
    return this.page.testSubj.locator(`console_tutorials_${tutorialId}`);
  }

  async getConsoleTutorialButton(tutorialId: string) {
    return this.page.testSubj.locator(`console_tutorials_${tutorialId}_console_btn`);
  }

  async clickConsoleTutorialButton(tutorialId: string) {
    await this.page.testSubj.locator(`console_tutorials_${tutorialId}_console_btn`).click();
  }

  async getConsoleEditorContainer() {
    return this.page.testSubj.locator('consoleEditorContainer');
  }

  // V1 Homepage - Alternate Solutions (Observability section)
  async getObservabilitySection() {
    return this.page.testSubj.locator('observabilitySection');
  }

  // Stateful (ESS) - "Create an Observability space"
  async getCreateObservabilitySpaceLink() {
    return this.page.testSubj.locator('createObservabilitySpaceLink');
  }

  async clickCreateObservabilitySpaceLink() {
    await this.page.testSubj.locator('createObservabilitySpaceLink').scrollIntoViewIfNeeded();
    await this.page.testSubj.locator('createObservabilitySpaceLink').click();
  }

  // Serverless - "Create an Observability project"
  async getCreateObservabilityProjectLink() {
    return this.page.testSubj.locator('createObservabilityProjectLink');
  }

  async clickCreateObservabilityProjectLink() {
    await this.page.testSubj.locator('createObservabilityProjectLink').scrollIntoViewIfNeeded();
    await this.page.testSubj.locator('createObservabilityProjectLink').click();
  }

  // V1 Homepage - Alternate Solutions (Security section)
  async getSecuritySection() {
    return this.page.testSubj.locator('securitySection');
  }

  async getSetupElasticDefendLink() {
    return this.page.testSubj.locator('setupElasticDefendLink');
  }

  async clickSetupElasticDefendLink() {
    await this.page.testSubj.locator('setupElasticDefendLink').scrollIntoViewIfNeeded();
    await this.page.testSubj.locator('setupElasticDefendLink').click();
  }

  // V1 Homepage - Dive deeper with Elasticsearch
  async getSearchLabsSection() {
    return this.page.testSubj.locator('searchLabsSection');
  }

  async getSearchLabsButton() {
    return this.page.testSubj.locator('searchLabsButton');
  }

  async clickSearchLabsButton() {
    await this.page.testSubj.locator('searchLabsButton').click();
  }

  async getPythonNotebooksSection() {
    return this.page.testSubj.locator('pythonNotebooksSection');
  }

  async getOpenNotebooksButton() {
    return this.page.testSubj.locator('openNotebooksButton');
  }

  async clickOpenNotebooksButton() {
    await this.page.testSubj.locator('openNotebooksButton').click();
  }

  async getElasticsearchDocumentationSection() {
    return this.page.testSubj.locator('elasticsearchDocumentationSection');
  }

  async getViewDocumentationButton() {
    return this.page.testSubj.locator('viewDocumentationButton');
  }

  async clickViewDocumentationButton() {
    await this.page.testSubj.locator('viewDocumentationButton').click();
  }

  // V1 Homepage - Footer content
  async getElasticCommunityLink() {
    return this.page.testSubj.locator('elasticCommunityLink');
  }

  async clickElasticCommunityLink() {
    await this.page.testSubj.locator('elasticCommunityLink').click();
  }

  async getGiveFeedbackLink() {
    return this.page.testSubj.locator('giveFeedbackLink');
  }

  async clickGiveFeedbackLink() {
    await this.page.testSubj.locator('giveFeedbackLink').click();
  }
}
