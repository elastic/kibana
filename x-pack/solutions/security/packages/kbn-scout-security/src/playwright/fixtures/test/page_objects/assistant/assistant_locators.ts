/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

/**
 * Locators for the AI Assistant Page Object
 *
 * This class contains all the selectors used to interact with the AI Assistant flyout.
 * Locators are organized by feature domain for better maintainability.
 */
export class AssistantLocators {
  constructor(private readonly page: ScoutPage) {}

  // ========================================
  // Main Elements
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
  // Conversation Management
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
  // Messaging
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
  // Connectors
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
  // System Prompts
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
  // Quick Prompts
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
  // Sharing
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
  // Licensing & Upgrade
  // ========================================

  public get upgradeCallout() {
    return this.page.testSubj.locator('upgradeLicenseCallToAction');
  }

  // ========================================
  // Modal Actions
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
}
