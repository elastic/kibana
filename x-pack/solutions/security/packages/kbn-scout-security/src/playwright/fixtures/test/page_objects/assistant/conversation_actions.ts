/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@playwright/test';
import { TIMEOUTS } from '../../../../constants/timeouts';
import type { AssistantLocators } from './assistant_locators';
import type { MessagingActions } from './messaging_actions';

/**
 * Actions related to AI Assistant conversation management
 *
 * This class handles creating, selecting, resetting, and managing conversations.
 */
export class ConversationActions {
  constructor(
    private readonly page: ScoutPage,
    private readonly locators: AssistantLocators,
    private readonly messaging: MessagingActions
  ) {}

  /**
   * Creates a new conversation
   */
  async createNewChat() {
    await this.locators.newChatButton.click();
    await this.locators.emptyConversation.waitFor({ state: 'visible' });
  }

  /**
   * Selects a conversation by title from the conversation list
   */
  async selectConversation(conversationTitle: string) {
    await this.locators.flyoutNavToggle.click();

    // Wait for the conversation to appear in the list before clicking
    const conversationButton = this.locators.conversationSelectButton(conversationTitle);
    await conversationButton.waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_EXTRA_LONG });
    await conversationButton.click();

    await expect(this.locators.conversationTitleHeading).toHaveText(conversationTitle);

    // Wait for the conversation state to fully load, including the connector configuration
    // The connector selector should not show the placeholder text once fully loaded
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(TIMEOUTS.UI_ELEMENT_STANDARD);

    // Verify the connector selector has loaded (should not still be loading)
    await this.locators.connectorSelector.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });

    await this.locators.flyoutNavToggle.click();
  }

  /**
   * Updates the title of the current conversation
   */
  async updateConversationTitle(newTitle: string) {
    await this.locators.conversationTitleHeading.click();
    await this.locators.conversationTitleInput.clear();
    await this.locators.conversationTitleInput.fill(newTitle);
    await this.locators.conversationTitleInput.press('Enter');
    await expect(this.locators.conversationTitleHeading).toHaveText(newTitle);
  }

  /**
   * Resets/clears the current conversation
   */
  async resetConversation() {
    await this.locators.conversationSettingsMenu.click();
    await this.locators.clearChatButton.click();

    // Wait for the modal to be visible
    const resetModal = this.page.testSubj.locator('reset-conversation-modal');
    await resetModal.waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
    // Click the confirm button
    await this.locators.confirmClearChatButton.click();
    await this.locators.emptyConversation.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_EXTRA_LONG,
    });
  }

  /**
   * Creates a new conversation with a custom title
   * Note: Message must be sent before title can be updated
   * @param title - The conversation title
   * @param initialMessage - The initial message to send (default: 'hello')
   */
  async createAndTitleConversation(title: string, initialMessage = 'hello') {
    await this.createNewChat();
    await this.messaging.typeAndSendMessage(initialMessage);
    // Wait for response (error is expected in test environment)
    // Use longer timeout as responses can be slower after resets or in serverless environments
    // eslint-disable-next-line playwright/no-nth-methods
    await this.locators.conversationErrorMessages.first().waitFor({
      state: 'visible',
      timeout: TIMEOUTS.AI_ASSISTANT_RESPONSE * 3, // 90 seconds - triple the standard timeout
    });
    await this.updateConversationTitle(title);
  }

  /**
   * Toggles the conversation side menu
   */
  async toggleConversationSideMenu() {
    await this.locators.flyoutNavToggle.click();
  }
}
