/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-search';

export class GettingStarted {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.gotoApp('elasticsearch/getting_started');
    await this.page.testSubj.waitForSelector('search-getting-started');
  }

  async getHeader() {
    return this.page.testSubj.locator('gettingStartedHeader');
  }

  async getAddDataButton() {
    return this.page.testSubj.locator('gettingStartedAddDataButton');
  }

  async clickAddDataButton() {
    await this.page.testSubj.locator('gettingStartedAddDataButton').click();
  }

  async selectAddDataOption(optionTestSubj: string) {
    await this.clickAddDataButton();
    await this.page.testSubj.locator(optionTestSubj).click();
  }

  async getSkipAndGoHomeButton() {
    return this.page.testSubj.locator('skipAndGoHomeBtn');
  }

  async clickSkipAndGoHomeButton() {
    await this.page.testSubj.locator('skipAndGoHomeBtn').click();
  }

  async getEndpointValueField() {
    return this.page.testSubj.locator('endpointValueField');
  }

  async getCopyEndpointButton() {
    return this.page.testSubj.locator('copyEndpointButton');
  }

  async clickCopyEndpointButton() {
    await this.page.testSubj.locator('copyEndpointButton').click();
  }

  async getCopyEndpointButtonCopied() {
    return this.page.testSubj.locator('copyEndpointButton-copied');
  }

  async getViewConnectionDetailsLink() {
    return this.page.testSubj.locator('viewConnectionDetailsLink');
  }

  async clickViewConnectionDetailsLink() {
    await this.page.testSubj.locator('viewConnectionDetailsLink').click();
  }

  async getConnectionDetailsModalTitle() {
    return this.page.testSubj.locator('connectionDetailsModalTitle');
  }

  async getConnectionDetailsEndpointsTab() {
    return this.page.testSubj.locator('connectionDetailsTabBtn-endpoints');
  }

  async getConnectionDetailsApiKeysTab() {
    return this.page.testSubj.locator('connectionDetailsTabBtn-apiKeys');
  }

  async getTutorialCard(tutorialId: string) {
    return this.page.testSubj.locator(`console_tutorials_${tutorialId}`);
  }

  async getTutorialCardButton(tutorialId: string) {
    return this.page.testSubj.locator(`console_tutorials_${tutorialId}-btn`);
  }

  async clickTutorialCard(tutorialId: string) {
    await this.page.testSubj.locator(`console_tutorials_${tutorialId}`).click();
  }

  async clickTutorialCardButton(tutorialId: string) {
    const button = this.page.testSubj.locator(`console_tutorials_${tutorialId}-btn`);
    await button.scrollIntoViewIfNeeded();
    await button.click();
  }

  async getLanguageSelector() {
    return this.page.testSubj.locator('codeExampleLanguageSelect');
  }

  async selectCodingLanguage(language: string) {
    await this.page.testSubj.locator('codeExampleLanguageSelect').click();
    await this.page.testSubj.locator(`lang-option-${language}`).click();
  }

  async getCodeSample() {
    return this.page.testSubj.locator('gettingStartedExampleCode');
  }

  async getFooterLink(linkId: string) {
    return this.page.testSubj.locator(`gettingStarted${linkId}-btn`);
  }

  async getNoApiKeysAccessMessage() {
    return this.page.locator("text=You don't have access to manage API keys");
  }

  async getEmbeddedConsoleControlBar() {
    return this.page.testSubj.locator('consoleEmbeddedControlBar');
  }

  async clickEmbeddedConsoleControlBar() {
    await this.page.testSubj.locator('consoleEmbeddedControlBar').click();
  }

  async getEmbeddedConsole() {
    return this.page.testSubj.locator('consoleEmbeddedBody');
  }
}
