/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security';

/**
 * Page object for the AI Assistant flyout and its interactions.
 * Migrated from Cypress screens/ai_assistant.ts + tasks/assistant.ts
 */
export class AssistantPage {
  // ── Locators ────────────────────────────────────────────────────────────

  /** Top-level nav link to open the assistant */
  readonly assistantButton: Locator;
  /** Chat body wrapper */
  readonly chatBody: Locator;
  /** User prompt text area */
  readonly userPrompt: Locator;
  /** Submit (send) button */
  readonly submitButton: Locator;
  /** Conversation title heading */
  readonly conversationTitle: Locator;
  /** Empty conversation placeholder */
  readonly emptyConvo: Locator;
  /** Welcome setup screen */
  readonly welcomeSetup: Locator;
  /** Connector selector dropdown */
  readonly connectorSelector: Locator;
  /** Send to timeline button */
  readonly sendToTimelineButton: Locator;
  /** Flyout nav toggle (sidebar) */
  readonly flyoutNavToggle: Locator;
  /** System prompt selector */
  readonly systemPrompt: Locator;
  /** Connector missing callout */
  readonly connectorMissingCallout: Locator;
  /** Upgrade CTA */
  readonly upgradeCta: Locator;
  /** New chat button */
  readonly newChatButton: Locator;
  /** Conversation settings menu */
  readonly conversationSettingsMenu: Locator;
  /** Share badge button */
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

  // ── Actions ─────────────────────────────────────────────────────────────

  async openAssistant(context?: 'rule' | 'alert') {
    if (!context) {
      await this.assistantButton.click();
    } else if (context === 'rule') {
      const chatIcon = this.page.testSubj.locator('newChat');
      await expect(chatIcon).toBeVisible();
      await chatIcon.click();
    } else if (context === 'alert') {
      const chatIconSm = this.page.testSubj.locator('newChatByTitle');
      await expect(chatIconSm).toBeVisible();
      await chatIconSm.click();
    }
    // Wait for assistant to load
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
    await this.assertConnectorSelected(connectorName);
    // Brief wait for connector to initialize
    await this.page.waitForTimeout(2000);
  }

  async selectConversation(conversationName: string) {
    await this.flyoutNavToggle.click();
    await this.page.testSubj.locator(`conversation-select-${conversationName}`).click();
    await this.assertConversationTitle(conversationName);
    await this.flyoutNavToggle.click();
  }

  async updateConversationTitle(newTitle: string) {
    await this.conversationTitle.locator('h2').click();
    const input = this.conversationTitle.locator('input');
    await input.clear();
    await input.fill(newTitle);
    await input.press('Enter');
    await this.assertConversationTitle(newTitle);
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
    await expect(this.emptyConvo).toBeVisible();
  }

  async clearSystemPrompt() {
    await this.page.testSubj.locator('clearSystemPrompt').click();
    await this.assertEmptySystemPrompt();
  }

  async selectSystemPrompt(systemPromptName: string) {
    await this.systemPrompt.click();
    await this.page.testSubj.locator(`systemPrompt-${systemPromptName}`).click();
    await this.assertSystemPromptSelected(systemPromptName);
  }

  async createSystemPrompt(
    title: string,
    prompt: string,
    defaultConversations?: string[]
  ) {
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

  async createQuickPrompt(
    title: string,
    prompt: string,
    defaultConversations?: string[]
  ) {
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
   * Create a full new conversation: new chat -> select connector -> send message -> rename
   */
  async createAndTitleConversation(newTitle: string = 'Something else', connectorName: string) {
    await this.createNewChat();
    await this.assertNewConversation(false, 'New chat');
    await this.selectConnector(connectorName);
    await this.assertConnectorSelected(connectorName);
    await this.typeAndSendMessage('hello');
    await this.assertMessageSent('hello');
    await this.assertErrorResponse();
    await this.updateConversationTitle(newTitle);
  }

  // ── Assertions ──────────────────────────────────────────────────────────

  async assertNewConversation(isWelcome: boolean, title: string) {
    if (isWelcome) {
      await expect(this.welcomeSetup).toBeVisible();
    } else {
      await expect(this.emptyConvo).toBeVisible();
    }
    await this.assertConversationTitle(title);
  }

  async assertConversationTitle(title: string) {
    await expect(this.conversationTitle.locator('h2')).toHaveText(title);
  }

  async assertConversationTitleContains(title: string) {
    await expect(this.conversationTitle.locator('h2')).toContainText(title);
  }

  async assertMessageSent(message: string, isPrompt: boolean = false) {
    const messageElements = this.page.testSubj.locator('messageText');
    const idx = isPrompt ? 1 : 0;
    await expect(messageElements.nth(idx)).toContainText(message);
  }

  async assertSystemPromptSent(message: string) {
    const messageElements = this.page.testSubj.locator('messageText');
    await expect(messageElements.first()).toContainText(message);
  }

  async assertErrorResponse() {
    const errorComment = this.page
      .locator('[data-test-subj="errorComment"]')
      .locator('[data-test-subj="messageText"]');
    await expect(errorComment).toBeVisible({ timeout: 30_000 });
  }

  async assertConnectorSelected(connectorName: string) {
    await expect(this.connectorSelector).toHaveText(connectorName);
  }

  async assertSystemPromptSelected(systemPromptName: string) {
    await expect(this.systemPrompt).toHaveText(systemPromptName);
  }

  async assertEmptySystemPrompt() {
    await expect(this.systemPrompt).toHaveText('Select a system prompt');
  }

  async assertConversationReadOnly() {
    // Title should not be editable
    await this.conversationTitle.locator('h2').click();
    await expect(this.conversationTitle.locator('input')).not.toBeVisible();
    // Controls should be disabled
    await expect(this.page.testSubj.locator('addNewConnectorButton')).toBeDisabled();
    await expect(this.page.testSubj.locator('chat-context-menu')).toBeDisabled();
    await expect(this.flyoutNavToggle).toBeDisabled();
    await expect(this.newChatButton).toBeDisabled();
  }
}
