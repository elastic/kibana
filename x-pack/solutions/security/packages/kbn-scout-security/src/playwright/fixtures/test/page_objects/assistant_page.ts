/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@playwright/test';
import { TIMEOUTS } from '../../../constants/timeouts';

/**
 * Page Object for the AI Assistant flyout in Kibana Security Solution
 *
 * The AI Assistant is a conversational interface that helps users with security tasks.
 * It can be opened from the main navigation or from context (alerts, rules).
 */
export class AssistantPage {
  constructor(private readonly page: ScoutPage) {}

  // ========================================
  // Locators - Main Elements
  // ========================================

  public get assistantButton() {
    return this.page.testSubj.locator('assistantNavLink');
  }

  public get assistantChatBody() {
    return this.page.testSubj.locator('assistantChat');
  }

  public get closeFlyoutButton() {
    return this.assistantChatBody.locator('[data-test-subj="euiFlyoutCloseButton"]');
  }

  public get emptyConversation() {
    return this.page.testSubj.locator('emptyConvo');
  }

  public get welcomeSetup() {
    return this.page.testSubj.locator('welcome-setup');
  }

  // ========================================
  // Locators - Conversation Management
  // ========================================

  public get conversationTitle() {
    return this.page.testSubj.locator('conversationTitle');
  }

  public get conversationTitleHeading() {
    return this.conversationTitle.locator('h2');
  }

  public get conversationTitleInput() {
    return this.conversationTitle.locator('input');
  }

  public get newChatButton() {
    return this.page.testSubj.locator('newChatFromOverlay');
  }

  public get newChatByTitleButton() {
    return this.page.testSubj.locator('newChatByTitle');
  }

  public get conversationSettingsMenu() {
    return this.page.testSubj.locator('conversation-settings-menu');
  }

  public get clearChatButton() {
    return this.page.testSubj.locator('clear-chat');
  }

  public get confirmClearChatButton() {
    return this.page.testSubj.locator('confirmModalConfirmButton');
  }

  public get flyoutNavToggle() {
    return this.page.testSubj.locator('aiAssistantFlyoutNavigationToggle');
  }

  conversationSelectButton(conversationTitle: string) {
    return this.page.testSubj.locator(`conversation-select-${conversationTitle}`);
  }

  conversationListIcon(conversationTitle: string) {
    return this.page.testSubj.locator(`conversation-icon-${conversationTitle}`);
  }

  // ========================================
  // Locators - Messaging
  // ========================================

  public get userPromptTextarea() {
    return this.page.testSubj.locator('prompt-textarea');
  }

  public get submitChatButton() {
    return this.page.testSubj.locator('submit-chat');
  }

  public get conversationMessages() {
    return this.page.testSubj.locator('messageText');
  }

  public get conversationErrorMessages() {
    return this.page.testSubj.locator('errorComment').locator('[data-test-subj="messageText"]');
  }

  public get sendToTimelineButton() {
    return this.page.testSubj.locator('sendToTimelineEmptyButton');
  }

  promptContextButton(index: number) {
    return this.page.testSubj.locator(`selectedPromptContext-${index}-button`);
  }

  // ========================================
  // Locators - Connectors
  // ========================================

  public get connectorSelector() {
    return this.page.testSubj.locator('connector-selector');
  }

  public get connectorMissingCallout() {
    return this.page.getByTestId('connectorMissingCallout');
  }

  public get addNewConnectorButton() {
    return this.page.testSubj.locator('addNewConnectorButton');
  }

  connectorOption(connectorName: string) {
    return this.page.testSubj.locator(`connector-${connectorName}`);
  }

  public get openAIConnectorOption() {
    return this.page.testSubj.locator('action-option-OpenAI');
  }

  public get connectorNameInput() {
    return this.page.testSubj.locator('nameInput');
  }

  public get secretsApiKeyInput() {
    return this.page.testSubj.locator('secrets.apiKey-input');
  }

  public get saveActionConnectorButton() {
    return this.page.testSubj.locator('saveActionButtonModal');
  }

  // ========================================
  // Locators - System Prompts
  // ========================================

  public get systemPromptSelect() {
    return this.page.testSubj.locator('promptSuperSelect');
  }

  public get clearSystemPromptButton() {
    return this.page.testSubj.locator('clearSystemPrompt');
  }

  public get createSystemPromptButton() {
    return this.page.testSubj.locator('addSystemPrompt');
  }

  public get systemPromptTitleInput() {
    return this.page.testSubj
      .locator('systemPromptSelector')
      .locator('[data-test-subj="comboBoxSearchInput"]');
  }

  public get systemPromptBodyInput() {
    return this.page.testSubj.locator('systemPromptModalPromptText');
  }

  public get conversationMultiSelector() {
    return this.page.testSubj
      .locator('conversationMultiSelector')
      .locator('[data-test-subj="comboBoxSearchInput"]');
  }

  systemPromptOption(promptName: string) {
    return this.page.testSubj.locator(`systemPrompt-${promptName}`);
  }

  // ========================================
  // Locators - Quick Prompts
  // ========================================

  public get addQuickPromptButton() {
    return this.page.testSubj.locator('addQuickPrompt');
  }

  public get quickPromptTitleInput() {
    return this.page.testSubj
      .locator('quickPromptSelector')
      .locator('[data-test-subj="comboBoxSearchInput"]');
  }

  public get quickPromptBodyInput() {
    return this.page.testSubj.locator('quick-prompt-prompt');
  }

  public get promptContextSelector() {
    return this.page.testSubj
      .locator('promptContextSelector')
      .locator('[data-test-subj="comboBoxSearchInput"]');
  }

  quickPromptBadge(promptName: string) {
    return this.page.testSubj.locator(`quickPrompt-${promptName}`);
  }

  // ========================================
  // Locators - Sharing
  // ========================================

  public get shareBadgeButton() {
    return this.page.testSubj.locator('shareBadgeButton');
  }

  public get shareSelect() {
    return this.page.testSubj.locator('shareSelect');
  }

  public get privateSelectOption() {
    return this.page.locator('li[data-test-subj="private"]');
  }

  public get restrictedSelectOption() {
    return this.page.locator('li[data-test-subj="restricted"]');
  }

  public get sharedSelectOption() {
    return this.page.locator('li[data-test-subj="shared"]');
  }

  public get shareModal() {
    return this.page.testSubj.locator('shareConversationModal');
  }

  public get shareButton() {
    return this.page.locator('button[data-test-subj="shareConversation"]');
  }

  public get shareModalCloseButton() {
    return this.shareModal.locator('button.euiModal__closeIcon');
  }

  public get userProfilesSearch() {
    return this.page.testSubj.locator('userProfilesSearch');
  }

  userProfileSelectOption(username: string) {
    return this.page.testSubj.locator(`userProfileSelectableOption-${username}`);
  }

  public get ownerSharedCallout() {
    return this.page.testSubj.locator('ownerSharedConversationCallout');
  }

  public get sharedCallout() {
    return this.page.testSubj.locator('sharedConversationCallout');
  }

  public get dismissCalloutButton() {
    return this.page.testSubj.locator('euiDismissCalloutButton');
  }

  public get duplicateConversationButton() {
    return this.page.testSubj.locator('duplicateConversation');
  }

  public get copyUrlButton() {
    return this.page.testSubj.locator('copy-url');
  }

  public get duplicateButton() {
    return this.page.testSubj.locator('duplicate');
  }

  public get convoContextMenuButton() {
    return this.page.testSubj.locator('convo-context-menu-button');
  }

  public get convoContextMenuCopyUrl() {
    return this.page.testSubj.locator('convo-context-menu-item-copy');
  }

  public get convoContextMenuDuplicate() {
    return this.page.testSubj.locator('convo-context-menu-item-duplicate');
  }

  public get shareModalCopyUrlButton() {
    return this.page.testSubj.locator('copyConversationUrl');
  }

  // ========================================
  // Locators - Licensing & Upgrade
  // ========================================

  public get upgradeCallout() {
    return this.page.testSubj.locator('upgradeLicenseCallToAction');
  }

  // ========================================
  // Locators - Modal Actions
  // ========================================

  public get modalSaveButton() {
    return this.page.testSubj.locator('save-button');
  }

  public get chatIcon() {
    return this.page.testSubj.locator('newChat');
  }

  public get chatIconSmall() {
    return this.page.testSubj.locator('newChatByTitle');
  }

  public get chatContextMenu() {
    return this.page.testSubj.locator('chat-context-menu');
  }

  // ========================================
  // Navigation
  // ========================================

  /**
   * Opens the AI Assistant from the main navigation button
   */
  async open() {
    await this.assistantButton.click();
    await this.waitForAssistantLoaded();
  }

  /**
   * Opens the AI Assistant from a rule context
   * Requires being on a page with the rule chat icon
   */
  async openFromRule() {
    await this.chatIcon.waitFor({ state: 'visible' });
    await this.chatIcon.click();
    await this.waitForAssistantLoaded();
  }

  /**
   * Opens the AI Assistant from an alert context
   * Requires being on a page with the alert chat icon
   */
  async openFromAlert() {
    await this.chatIconSmall.waitFor({ state: 'visible' });
    await this.chatIconSmall.click();
    await this.waitForAssistantLoaded();
  }

  /**
   * Closes the AI Assistant flyout
   */
  async close() {
    await this.closeFlyoutButton.click();
  }

  // ========================================
  // Conversation Management Actions
  // ========================================

  /**
   * Creates a new conversation
   */
  async createNewChat() {
    await this.newChatButton.click();
    await this.emptyConversation.waitFor({ state: 'visible' });
  }

  /**
   * Selects a conversation by title from the conversation list
   */
  async selectConversation(conversationTitle: string) {
    await this.flyoutNavToggle.click();

    // Wait for the conversation to appear in the list before clicking
    const conversationButton = this.conversationSelectButton(conversationTitle);
    await conversationButton.waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_EXTRA_LONG });
    await conversationButton.click();

    await expect(this.conversationTitleHeading).toHaveText(conversationTitle);

    // Wait for the conversation state to fully load, including the connector configuration
    // The connector selector should not show the placeholder text once fully loaded
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(TIMEOUTS.UI_ELEMENT_STANDARD);

    // Verify the connector selector has loaded (should not still be loading)
    await this.connectorSelector.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });

    await this.flyoutNavToggle.click();
  }

  /**
   * Updates the title of the current conversation
   */
  async updateConversationTitle(newTitle: string) {
    await this.conversationTitleHeading.click();
    await this.conversationTitleInput.clear();
    await this.conversationTitleInput.fill(newTitle);
    await this.conversationTitleInput.press('Enter');
    await expect(this.conversationTitleHeading).toHaveText(newTitle);
  }

  /**
   * Resets/clears the current conversation
   */
  async resetConversation() {
    await this.conversationSettingsMenu.click();
    await this.clearChatButton.click();

    // Wait for the modal to be visible
    const resetModal = this.page.testSubj.locator('reset-conversation-modal');
    await resetModal.waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
    // Click the confirm button
    await this.confirmClearChatButton.click();
    await this.emptyConversation.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_EXTRA_LONG,
    });
  }

  /**
   * Creates a new conversation with a custom title
   * Note: Message must be sent before title can be updated
   */
  async createAndTitleConversation(title: string, initialMessage = 'hello') {
    await this.createNewChat();
    await this.typeAndSendMessage(initialMessage);
    // Wait for response (error is expected in test environment)
    // Use longer timeout as responses can be slower after resets or in serverless environments
    // eslint-disable-next-line playwright/no-nth-methods
    await this.conversationErrorMessages.first().waitFor({
      state: 'visible',
      timeout: TIMEOUTS.AI_ASSISTANT_RESPONSE * 3, // 90 seconds - triple the standard timeout
    });
    await this.updateConversationTitle(title);
  }

  /**
   * Toggles the conversation side menu
   */
  async toggleConversationSideMenu() {
    await this.flyoutNavToggle.click();
  }

  // ========================================
  // Messaging Actions
  // ========================================

  /**
   * Types a message in the user prompt textarea
   */
  async typeMessage(message: string) {
    await this.userPromptTextarea.fill(message);
  }

  /**
   * Submits the current message
   */
  async submitMessage() {
    await this.submitChatButton.click();
  }

  /**
   * Types a message and immediately sends it
   */
  async typeAndSendMessage(message: string) {
    await this.typeMessage(message);
    await this.submitMessage();
  }

  /**
   * Sends a query to the timeline
   */
  async sendQueryToTimeline() {
    await this.sendToTimelineButton.click();
  }

  // ========================================
  // Connector Actions
  // ========================================

  /**
   * Selects a connector by name
   */
  async selectConnector(connectorName: string) {
    await this.connectorSelector.click();
    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(TIMEOUTS.UI_ELEMENT_STANDARD);

    // Use .first() to handle multiple connectors with same name (from test pollution)
    // eslint-disable-next-line playwright/no-nth-methods
    await this.connectorOption(connectorName).first().click();

    // Use containText instead of exact match to handle UI variations
    await expect(this.connectorSelector).toContainText(connectorName);

    // Wait for the connector configuration to be saved to the conversation
    // This ensures the apiConfig is persisted before moving to the next operation
    try {
      await this.page.waitForResponse(
        (response) =>
          response.url().includes('/internal/elastic_assistant/current_user/conversations') &&
          response.request().method() === 'PUT' &&
          response.status() === 200,
        { timeout: TIMEOUTS.UI_ELEMENT_EXTRA_LONG }
      );
    } catch (e) {
      // If the wait times out, continue anyway
      // This could happen if the conversation is new and hasn't been created yet
    }

    // eslint-disable-next-line playwright/no-wait-for-timeout
    await this.page.waitForTimeout(TIMEOUTS.UI_ELEMENT_STANDARD);
  }

  /**
   * Creates a new OpenAI connector through the UI
   */
  async createOpenAIConnector(connectorName: string) {
    await this.openAIConnectorOption.click();
    await this.connectorNameInput.fill(connectorName);
    await this.secretsApiKeyInput.fill('1234');
    await this.saveActionConnectorButton.click();
    await this.saveActionConnectorButton.waitFor({ state: 'detached' });
  }

  // ========================================
  // System Prompt Actions
  // ========================================

  /**
   * Selects a system prompt by name
   */
  async selectSystemPrompt(promptName: string) {
    await this.systemPromptSelect.click();
    await this.systemPromptOption(promptName).click();
    await expect(this.systemPromptSelect).toHaveText(promptName);
  }

  /**
   * Clears the current system prompt selection
   */
  async clearSystemPrompt() {
    await this.clearSystemPromptButton.click();
    await expect(this.systemPromptSelect).toHaveText('Select a system prompt');
  }

  /**
   * Creates a new system prompt
   * @param title - The prompt title
   * @param content - The prompt content
   * @param defaultConversations - Optional list of conversations to apply this prompt to
   */
  async createSystemPrompt(title: string, content: string, defaultConversations?: string[]) {
    await this.systemPromptSelect.click();
    await this.createSystemPromptButton.click();
    await this.systemPromptTitleInput.fill(title);
    await this.systemPromptTitleInput.press('Enter');

    // Wait for the body input to become enabled after title confirmation
    await expect(this.systemPromptBodyInput).toBeEnabled({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD });

    await this.systemPromptBodyInput.fill(content);

    if (defaultConversations && defaultConversations.length > 0) {
      for (const conversation of defaultConversations) {
        await this.conversationMultiSelector.fill(conversation);
        await this.conversationMultiSelector.press('Enter');
      }
    }

    // Wait for any toasts to disappear before clicking save (they can block the button)
    const toastHeader = this.page.testSubj.locator('euiToastHeader');
    try {
      await toastHeader.waitFor({ state: 'hidden', timeout: 5000 });
    } catch {
      // Toasts may not exist, continue anyway
    }

    // Wait for save button to be stable and clickable
    await expect(this.modalSaveButton).toBeVisible({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
    await expect(this.modalSaveButton).toBeEnabled({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD });

    // Use force click if toast is still blocking (it's just a visual overlay)
    // eslint-disable-next-line playwright/no-force-option
    await this.modalSaveButton.click({ force: true });
  }

  // ========================================
  // Quick Prompt Actions
  // ========================================

  /**
   * Creates a new quick prompt
   * @param title - The prompt title
   * @param content - The prompt content
   * @param contexts - Optional list of contexts where this prompt is available
   */
  async createQuickPrompt(title: string, content: string, contexts?: string[]) {
    await this.addQuickPromptButton.click();
    await this.quickPromptTitleInput.fill(title);
    await this.quickPromptTitleInput.press('Enter');
    await this.quickPromptBodyInput.fill(content);

    if (contexts && contexts.length > 0) {
      for (const context of contexts) {
        await this.promptContextSelector.fill(context);
        await this.promptContextSelector.press('Enter');
      }
    }

    // Wait for any toasts to disappear before clicking save (they can block the button)
    const toastHeader = this.page.testSubj.locator('euiToastHeader');
    try {
      await toastHeader.waitFor({ state: 'hidden', timeout: 5000 });
    } catch {
      // Toasts may not exist, continue anyway
    }

    // Wait for save button to be stable and clickable
    await expect(this.modalSaveButton).toBeVisible({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
    await expect(this.modalSaveButton).toBeEnabled({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD });

    // Use force click if toast is still blocking (it's just a visual overlay)
    // eslint-disable-next-line playwright/no-force-option
    await this.modalSaveButton.click({ force: true });
  }

  /**
   * Sends a quick prompt by clicking its badge
   */
  async sendQuickPrompt(promptName: string) {
    await this.quickPromptBadge(promptName).click();
    await this.submitMessage();
  }

  // ========================================
  // Sharing Actions
  // ========================================

  /**
   * Opens the share menu
   */
  async openShareMenu() {
    await this.shareBadgeButton.click();
    await this.shareSelect.waitFor({ state: 'visible' });
  }

  /**
   * Selects the private sharing option
   */
  async selectPrivate() {
    await this.privateSelectOption.click();
  }

  /**
   * Selects the global sharing option
   */
  async selectGlobal() {
    await this.sharedSelectOption.click();
  }

  /**
   * Opens the share modal (restricted sharing)
   */
  async openShareModal() {
    await this.restrictedSelectOption.click();
    await this.shareModal.waitFor({ state: 'visible' });
  }

  /**
   * Closes the share modal
   */
  async closeShareModal() {
    await this.shareModalCloseButton.click();
  }

  /**
   * Shares a conversation with a specific user
   */
  async shareConversationWithUser(username: string) {
    const userOption = this.userProfilesSearch.locator(this.userProfileSelectOption(username));
    await this.userProfilesSearch.locator('input').fill(username);
    await expect(userOption).toHaveAttribute('aria-checked', 'false');
    await userOption.click();
    await expect(userOption).toHaveAttribute('aria-checked', 'true');
  }

  /**
   * Submits the share modal
   */
  async submitShareModal() {
    await this.shareModal.locator(this.shareButton).click();
  }

  /**
   * Shares a conversation (global or with specific user)
   * @param shareWith - Either 'global' or a username
   */
  async shareConversation(shareWith: string) {
    await this.openShareMenu();

    if (shareWith === 'global') {
      await this.selectGlobal();
      await this.expectCalloutState('shared-by-me');
    } else {
      await this.openShareModal();
      await this.shareConversationWithUser(shareWith);
      await this.submitShareModal();
      await this.expectCalloutState('shared-by-me');
    }
  }

  /**
   * Duplicates the current conversation
   */
  async duplicateConversation(conversationTitle: string) {
    await this.sharedCallout.locator(this.duplicateConversationButton).click();
    await expect(this.conversationTitleHeading).toHaveText(`[Duplicate] ${conversationTitle}`);
  }

  /**
   * Duplicates conversation from the conversation menu
   */
  async duplicateFromMenu(conversationTitle: string) {
    await this.conversationSettingsMenu.click();
    await this.duplicateButton.click();
    await expect(this.conversationTitleHeading).toHaveText(`[Duplicate] ${conversationTitle}`);
  }

  /**
   * Duplicates conversation from the conversation side menu
   */
  async duplicateFromConversationSideContextMenu(conversationTitle: string) {
    // eslint-disable-next-line playwright/no-nth-methods
    await this.convoContextMenuButton.first().click();
    await this.convoContextMenuDuplicate.click();
    await expect(this.conversationTitleHeading).toHaveText(`[Duplicate] ${conversationTitle}`);
  }

  /**
   * Copies the conversation URL from the menu
   */
  async copyUrlFromMenu() {
    await this.conversationSettingsMenu.click();
    await this.copyUrlButton.click();
  }

  /**
   * Copies the conversation URL from the conversation side context menu
   */
  async copyUrlFromConversationSideContextMenu() {
    // eslint-disable-next-line playwright/no-nth-methods
    await this.convoContextMenuButton.first().click();
    await this.convoContextMenuCopyUrl.click();
  }

  /**
   * Copies the conversation URL from the share modal
   */
  async copyUrlFromShareModal() {
    await this.openShareMenu();
    await this.openShareModal();
    await this.shareModalCopyUrlButton.click();
    await this.closeShareModal();
  }

  /**
   * Dismisses the shared conversation callout
   */
  async dismissSharedCallout() {
    await this.sharedCallout.locator(this.dismissCalloutButton).click();
    await expect(this.sharedCallout).toBeHidden();
  }

  // ========================================
  // Assertion Methods
  // ========================================

  /**
   * Asserts that a new conversation is displayed
   * @param isWelcome - Whether the welcome setup should be visible
   * @param expectedTitle - The expected conversation title
   */
  async expectNewConversation(isWelcome: boolean, expectedTitle: string) {
    if (isWelcome) {
      await expect(this.welcomeSetup).toBeVisible();
    } else {
      await expect(this.emptyConversation).toBeVisible();
    }
    await expect(this.conversationTitleHeading).toHaveText(expectedTitle);
  }

  /**
   * Asserts the conversation title
   */
  async expectConversationTitle(title: string) {
    await expect(this.conversationTitleHeading).toHaveText(title);
  }

  /**
   * Asserts the conversation title contains text
   */
  async expectConversationTitleContains(text: string) {
    await expect(this.conversationTitleHeading).toContainText(text);
  }

  /**
   * Asserts that a message was sent
   * @param message - The expected message content
   * @param afterSystemPrompt - Whether this message comes after a system prompt
   */
  async expectMessageSent(message: string, afterSystemPrompt = false) {
    const index = afterSystemPrompt ? 1 : 0;
    // eslint-disable-next-line playwright/no-nth-methods
    await expect(this.conversationMessages.nth(index)).toContainText(message);
  }

  /**
   * Asserts that a system prompt was sent
   */
  async expectSystemPromptSent(promptContent: string) {
    // eslint-disable-next-line playwright/no-nth-methods
    await expect(this.conversationMessages.first()).toContainText(promptContent);
  }

  /**
   * Asserts that an error response is visible
   */
  async expectErrorResponse() {
    // Use longer timeout as responses can be slower after resets or in serverless environments
    await expect(this.conversationErrorMessages).toBeVisible({
      timeout: TIMEOUTS.AI_ASSISTANT_RESPONSE * 2, // 60 seconds - double the standard timeout
    });
  }

  /**
   * Asserts that a connector is selected
   */
  async expectConnectorSelected(connectorName: string) {
    await expect(this.connectorSelector).toHaveText(connectorName);
  }

  /**
   * Asserts that a system prompt is selected
   */
  async expectSystemPromptSelected(promptName: string) {
    await expect(this.systemPromptSelect).toHaveText(promptName);
  }

  /**
   * Asserts that no system prompt is selected
   */
  async expectEmptySystemPrompt() {
    await expect(this.systemPromptSelect).toHaveText('Select a system prompt');
  }

  /**
   * Asserts the share menu status
   * @param type - Expected status: 'Private', 'Shared', or 'Restricted'
   */
  async expectShareMenuStatus(type: 'Private' | 'Shared' | 'Restricted') {
    await expect(this.shareBadgeButton).toHaveAttribute('title', new RegExp(type));

    await expect(this.privateSelectOption).toHaveAttribute(
      'aria-checked',
      type === 'Private' ? 'true' : 'false'
    );

    await expect(this.restrictedSelectOption).toHaveAttribute(
      'aria-checked',
      type === 'Restricted' ? 'true' : 'false'
    );

    await expect(this.sharedSelectOption).toHaveAttribute(
      'aria-checked',
      type === 'Shared' ? 'true' : 'false'
    );
  }

  /**
   * Asserts the conversation callout state
   * @param state - 'private', 'shared-by-me', or 'shared-with-me'
   */
  async expectCalloutState(state: 'private' | 'shared-by-me' | 'shared-with-me') {
    if (state === 'private') {
      await expect(this.ownerSharedCallout).toBeHidden();
      await expect(this.sharedCallout).toBeHidden();
      await expect(this.userPromptTextarea).toBeVisible();
      await expect(this.submitChatButton).toBeVisible();
    } else if (state === 'shared-by-me') {
      await expect(this.ownerSharedCallout).toBeVisible();
      await expect(this.sharedCallout).toBeHidden();
      await expect(this.userPromptTextarea).toBeVisible();
      await expect(this.submitChatButton).toBeVisible();
    } else if (state === 'shared-with-me') {
      await expect(this.sharedCallout).toBeVisible();
      await expect(this.ownerSharedCallout).toBeHidden();
      await expect(this.userPromptTextarea).toBeHidden();
      await expect(this.submitChatButton).toBeHidden();
    }
  }

  /**
   * Asserts that a conversation has a shared icon in the list
   */
  async expectSharedConversationIcon(conversationTitle: string) {
    await expect(this.conversationListIcon(conversationTitle)).toBeVisible();
  }

  /**
   * Asserts that a conversation does not have a shared icon in the list
   */
  async expectNotSharedConversationIcon(conversationTitle: string) {
    await expect(this.conversationListIcon(conversationTitle)).toBeHidden();
  }

  /**
   * Asserts that no shared callout is visible
   */
  async expectNoSharedCallout() {
    await expect(this.sharedCallout).toBeHidden();
  }

  /**
   * Asserts that a user is shown as having access in the share modal
   */
  async expectShareUser(username: string) {
    const userOption = this.userProfilesSearch.locator(this.userProfileSelectOption(username));
    await expect(userOption).toHaveAttribute('aria-checked', 'true');
  }

  /**
   * Asserts that the conversation is read-only (for license/permission restrictions)
   */
  async expectConversationReadOnly() {
    // Verify title is not editable (input should not exist in read-only mode)
    await expect(this.conversationTitleInput).toBeHidden();

    // Controls should be disabled
    await expect(this.addNewConnectorButton).toBeDisabled();
    await expect(this.chatContextMenu).toBeDisabled();
    await expect(this.flyoutNavToggle).toBeDisabled();
    await expect(this.newChatButton).toBeDisabled();
  }

  /**
   * Asserts that a message is from a specific user
   */
  async expectMessageUser(username: string, messageIndex: number) {
    // eslint-disable-next-line playwright/no-nth-methods
    const userElement = this.page.locator('.euiCommentEvent__headerUsername').nth(messageIndex);
    await expect(userElement).toHaveText(username);
  }

  /**
   * Asserts that the upgrade callout is visible (for license checks)
   */
  async expectUpgradeCallout() {
    await expect(this.upgradeCallout).toBeVisible();
  }

  /**
   * Asserts that a prompt context button is visible with specific text
   */
  async expectPromptContext(index: number, expectedText: string) {
    await expect(this.promptContextButton(index)).toHaveText(expectedText);
  }

  /**
   * Asserts that the user prompt textarea has specific text
   */
  async expectUserPromptText(text: string) {
    await expect(this.userPromptTextarea).toHaveText(text);
  }

  /**
   * Asserts that the user prompt textarea is empty
   */
  async expectUserPromptEmpty() {
    await expect(this.userPromptTextarea).not.toHaveText(/.+/);
  }

  /**
   * Asserts that a quick prompt badge is visible
   */
  async expectQuickPromptVisible(promptName: string) {
    await expect(this.quickPromptBadge(promptName)).toBeVisible();
  }

  /**
   * Asserts that a quick prompt badge is not visible
   */
  async expectQuickPromptNotVisible(promptName: string) {
    await expect(this.quickPromptBadge(promptName)).toBeHidden();
  }

  // ========================================
  // Helper Methods (Private)
  // ========================================

  /**
   * Waits for the assistant flyout to be fully loaded
   */
  private async waitForAssistantLoaded() {
    await this.assistantChatBody.waitFor({ state: 'visible' });
  }
}
