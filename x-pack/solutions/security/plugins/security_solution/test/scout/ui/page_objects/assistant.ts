/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

/**
 * Page object for the AI Assistant flyout and its interactions.
 *
 * Design: locators and UI actions only; assertions belong in specs.
 * Exception: internal assertions used as wait-guards inside compound actions
 * (e.g. waiting for connector selector to reflect the selected value).
 */
export class AssistantPage {
  // ── Locators ────────────────────────────────────────────────────────────

  readonly assistantButton: Locator;
  readonly chatBody: Locator;
  readonly userPrompt: Locator;
  readonly submitButton: Locator;
  readonly conversationTitle: Locator;
  readonly emptyConvo: Locator;
  readonly welcomeSetup: Locator;
  readonly connectorSelector: Locator;
  readonly sendToTimelineButton: Locator;
  readonly flyoutNavToggle: Locator;
  readonly systemPrompt: Locator;
  readonly connectorMissingCallout: Locator;
  readonly upgradeCta: Locator;
  readonly newChatButton: Locator;
  readonly conversationSettingsMenu: Locator;
  readonly shareBadgeButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.assistantButton = this.page.testSubj.locator('assistantNavLink');
    this.chatBody = this.page.testSubj.locator('assistantChat');
    this.userPrompt = this.page.testSubj.locator('prompt-textarea');
    this.submitButton = this.page.testSubj.locator('submit-chat');
    this.conversationTitle = this.page.testSubj.locator('conversationTitle');
    this.emptyConvo = this.page.testSubj.locator('emptyConvo');
    this.welcomeSetup = this.page.testSubj.locator('welcome-setup');
    this.connectorSelector = this.page.testSubj.locator('connector-selector');
    this.sendToTimelineButton = this.page.testSubj.locator('sendToTimelineEmptyButton');
    this.flyoutNavToggle = this.page.testSubj.locator('aiAssistantFlyoutNavigationToggle');
    this.systemPrompt = this.page.testSubj.locator('promptSuperSelect');
    this.connectorMissingCallout = this.page.testSubj.locator('connectorMissingCallout');
    this.upgradeCta = this.page.testSubj.locator('upgradeLicenseCallToAction');
    this.newChatButton = this.page.testSubj.locator('newChatFromOverlay');
    this.conversationSettingsMenu = this.page.testSubj.locator('conversation-settings-menu');
    this.shareBadgeButton = this.page.testSubj.locator('shareBadgeButton');
  }

  // ── Derived locators ───────────────────────────────────────────────────

  /** Returns the locator for the conversation title heading */
  get titleHeading(): Locator {
    return this.conversationTitle.locator('h2');
  }

  /** Returns the locator for a specific message by index */
  messageAt(index: number): Locator {
    return this.page.testSubj.locator('messageText').locator(`nth=${index}`);
  }

  /** Returns the locator for the error comment message element */
  get errorComment(): Locator {
    return this.page
      .locator('[data-test-subj="errorComment"]')
      .locator('[data-test-subj="messageText"]');
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  async openAssistant(context?: 'rule' | 'alert') {
    if (!context) {
      await this.assistantButton.click();
    } else if (context === 'rule') {
      const chatIcon = this.page.testSubj.locator('newChat');
      await chatIcon.waitFor({ state: 'visible' });
      await chatIcon.click();
    } else if (context === 'alert') {
      const chatIconSm = this.page.testSubj.locator('newChatByTitle');
      await chatIconSm.waitFor({ state: 'visible' });
      await chatIconSm.click();
    }
    await this.chatBody.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async closeAssistant() {
    const closeBtn = this.chatBody.locator('[data-test-subj="euiFlyoutCloseButton"]');
    await closeBtn.click();
  }

  async createNewChat() {
    await this.newChatButton.click();
  }

  async selectConnector(connectorName: string) {
    await this.connectorSelector.click();
    await this.page.testSubj.locator(`connector-${connectorName}`).click();
    // Wait-guard: ensure the selector reflects the new value before proceeding
    await expect(this.connectorSelector).toHaveText(connectorName);
  }

  async selectConversation(conversationName: string) {
    await this.flyoutNavToggle.click();
    await this.page.testSubj.locator(`conversation-select-${conversationName}`).click();
    // Wait-guard: ensure conversation switched before closing sidebar
    await expect(this.titleHeading).toHaveText(conversationName);
    await this.flyoutNavToggle.click();
  }

  async updateConversationTitle(newTitle: string) {
    await this.titleHeading.click();
    const input = this.conversationTitle.locator('input');
    await input.clear();
    await input.fill(newTitle);
    await input.press('Enter');
    // Wait-guard: ensure title updated before proceeding
    await expect(this.titleHeading).toHaveText(newTitle);
  }

  async typeAndSendMessage(message: string) {
    await this.userPrompt.click();
    await this.userPrompt.fill(message);
    await this.submitButton.click();
  }

  async submitMessage() {
    await this.submitButton.click();
  }

  async resetConversation() {
    await this.conversationSettingsMenu.click();
    await this.page.testSubj.locator('clear-chat').click();
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
    await this.emptyConvo.waitFor({ state: 'visible' });
  }

  async clearSystemPrompt() {
    await this.page.testSubj.locator('clearSystemPrompt').click();
  }

  async selectSystemPrompt(systemPromptName: string) {
    await this.systemPrompt.click();
    await this.page.testSubj.locator(`systemPrompt-${systemPromptName}`).click();
    // Wait-guard: ensure prompt reflects the new value
    await expect(this.systemPrompt).toHaveText(systemPromptName);
  }

  async createSystemPrompt(title: string, prompt: string, defaultConversations?: string[]) {
    await this.systemPrompt.click();
    await this.page.testSubj.locator('addSystemPrompt').click();

    const titleInput = this.page.testSubj
      .locator('systemPromptSelector')
      .locator('[data-test-subj="comboBoxSearchInput"]');
    await titleInput.fill(title);
    await titleInput.press('Enter');

    await this.page.testSubj.locator('systemPromptModalPromptText').fill(prompt);

    if (defaultConversations?.length) {
      const convoSelector = this.page.testSubj
        .locator('conversationMultiSelector')
        .locator('[data-test-subj="comboBoxSearchInput"]');
      for (const conversation of defaultConversations) {
        await convoSelector.fill(conversation);
        await convoSelector.press('Enter');
      }
    }

    await this.page.testSubj.locator('save-button').click();
  }

  async createQuickPrompt(title: string, prompt: string, defaultConversations?: string[]) {
    await this.page.testSubj.locator('addQuickPrompt').click();

    const titleInput = this.page.testSubj
      .locator('quickPromptSelector')
      .locator('[data-test-subj="comboBoxSearchInput"]');
    await titleInput.fill(title);
    await titleInput.press('Enter');

    await this.page.testSubj.locator('quick-prompt-prompt').fill(prompt);

    if (defaultConversations?.length) {
      const contextSelector = this.page.testSubj
        .locator('promptContextSelector')
        .locator('[data-test-subj="comboBoxSearchInput"]');
      for (const conversation of defaultConversations) {
        await contextSelector.fill(conversation);
        await contextSelector.press('Enter');
      }
    }

    await this.page.testSubj.locator('save-button').click();
  }

  async sendQuickPrompt(promptName: string) {
    await this.page.testSubj.locator(`quickPrompt-${promptName}`).click();
    await this.submitButton.click();
  }

  async sendQueryToTimeline() {
    await this.sendToTimelineButton.click();
  }

  async createOpenAIConnector(connectorName: string) {
    await this.page.testSubj.locator('action-option-OpenAI').click();
    await this.page.testSubj.locator('nameInput').fill(connectorName);
    await this.page.testSubj.locator('secrets.apiKey-input').fill('1234');
    await this.page.testSubj.locator('saveActionButtonModal').click();
    await this.page.testSubj.locator('saveActionButtonModal').waitFor({ state: 'hidden' });
  }

  /**
   * Create a full new conversation: new chat -> select connector -> send message -> rename.
   * Uses test.step internally for debuggability.
   */
  async createAndTitleConversation(newTitle: string = 'Something else', connectorName: string) {
    await this.createNewChat();
    await expect(this.emptyConvo).toBeVisible();
    await expect(this.titleHeading).toHaveText('New chat');
    await this.selectConnector(connectorName);
    await this.typeAndSendMessage('hello');
    await expect(this.messageAt(0)).toContainText('hello');
    await expect(this.errorComment).toBeVisible({ timeout: 30_000 });
    await this.updateConversationTitle(newTitle);
  }
}
