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

  async getKibanaVersionBadge() {
    return this.page.testSubj.locator('kibana-version-badge');
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

  async getAgentInstallLaunchBtn() {
    return this.page.testSubj.locator('agentInstallLaunchBtn');
  }

  async clickAgentInstallLaunchBtn() {
    await this.page.testSubj.locator('agentInstallLaunchBtn').click();
  }

  async getPromptModalCopyBtn() {
    return this.page.testSubj.locator('promptModalCopyBtn');
  }

  async getAgentInstallOpenInAgentBuilderBtn() {
    return this.page.testSubj.locator('agentInstallOpenInAgentBuilder');
  }

  async clickAgentInstallOpenInAgentBuilderBtn() {
    await this.page.testSubj.locator('agentInstallOpenInAgentBuilder').click();
  }

  async getAgentBuilderSidebarPanel() {
    return this.page.testSubj.locator('sidebarPanel');
  }

  async getUploadFilesButton() {
    return this.page.testSubj.locator('uploadFilesButton');
  }

  async clickUploadFilesButton() {
    await this.page.testSubj.locator('uploadFilesButton').click();
  }

  async getViewSampleDataButton() {
    return this.page.testSubj.locator('viewSampleDataButton');
  }

  async clickViewSampleDataButton() {
    await this.page.testSubj.locator('viewSampleDataButton').click();
  }

  async getTutorialCard(tutorialId: string) {
    return this.page.testSubj.locator(`console_tutorials_${tutorialId}`);
  }

  async getTutorialCards() {
    return this.page.locator('[data-test-subj^="console_tutorials_"]').all();
  }

  async clickTutorialCard(tutorialId: string) {
    await this.page.testSubj.locator(`console_tutorials_${tutorialId}`).click();
  }

  async clickTutorialCardAndScrollIntoView(tutorialId: string) {
    const card = this.page.testSubj.locator(`console_tutorials_${tutorialId}`);
    await card.scrollIntoViewIfNeeded();
    await card.click();
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

  async getNoApiKeysAccessMessage() {
    return this.page.locator("text=You don't have access to manage API keys");
  }
}
