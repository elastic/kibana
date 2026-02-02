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

  async getGettingStartedButton() {
    return this.page.testSubj.locator(
      'searchHomepageGettingStartedBannerGetStartedWithElasticsearchButton'
    );
  }

  async clickGettingStartedButton() {
    await this.page.testSubj.waitForSelector(
      'searchHomepageGettingStartedBannerGetStartedWithElasticsearchButton'
    );
    return this.page.testSubj
      .locator('searchHomepageGettingStartedBannerGetStartedWithElasticsearchButton')
      .click();
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

  // Elasticsearch endpoint and copy functionality
  async getCopyEndpointButton() {
    return this.page.testSubj.locator('copyEndpointButton');
  }

  async getCopyEndpointButtonCopied() {
    return this.page.testSubj.locator('copyEndpointButton-copied');
  }

  async getEndpointValueField() {
    return this.page.testSubj.locator('endpointValueField');
  }

  // Body Links methods
  async getBodyLinks() {
    return this.page.testSubj.locator('searchHomepageBodyLinkLink');
  }

  async getBodyLinkByText(text: string) {
    return this.page.getByRole('link', { name: text });
  }
}
