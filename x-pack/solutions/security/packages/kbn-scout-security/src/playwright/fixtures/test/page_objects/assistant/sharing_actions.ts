/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import type { AssistantLocators } from './assistant_locators';

/**
 * Actions related to AI Assistant conversation sharing
 *
 * This class handles sharing conversations, managing permissions, duplication, and URL copying.
 */
export class SharingActions {
  constructor(private readonly locators: AssistantLocators) {}

  /**
   * Opens the share menu
   */
  async openShareMenu() {
    await this.locators.shareBadgeButton.click();
    await this.locators.shareSelect.waitFor({ state: 'visible' });
  }

  /**
   * Selects the private sharing option
   */
  async selectPrivate() {
    await this.locators.privateSelectOption.click();
  }

  /**
   * Selects the global sharing option
   */
  async selectGlobal() {
    await this.locators.sharedSelectOption.click();
  }

  /**
   * Opens the share modal (restricted sharing)
   */
  async openShareModal() {
    await this.locators.restrictedSelectOption.click();
    await this.locators.shareModal.waitFor({ state: 'visible' });
  }

  /**
   * Closes the share modal
   */
  async closeShareModal() {
    await this.locators.shareModalCloseButton.click();
  }

  /**
   * Shares a conversation with a specific user
   */
  async shareConversationWithUser(username: string) {
    const userOption = this.locators.userProfilesSearch.locator(
      this.locators.userProfileSelectOption(username)
    );
    await this.locators.userProfilesSearch.locator('input').fill(username);
    await expect(userOption).toHaveAttribute('aria-checked', 'false');
    await userOption.click();
    await expect(userOption).toHaveAttribute('aria-checked', 'true');
  }

  /**
   * Submits the share modal
   */
  async submitShareModal() {
    await this.locators.shareModal.locator(this.locators.shareButton).click();
  }

  /**
   * Shares a conversation (global or with specific user)
   * @param shareWith - Either 'global' or a username
   * @param expectCalloutState - Assertion callback for checking callout state
   */
  async shareConversation(
    shareWith: string,
    expectCalloutState: (state: 'private' | 'shared-by-me' | 'shared-with-me') => Promise<void>
  ) {
    await this.openShareMenu();

    if (shareWith === 'global') {
      await this.selectGlobal();
      await expectCalloutState('shared-by-me');
    } else {
      await this.openShareModal();
      await this.shareConversationWithUser(shareWith);
      await this.submitShareModal();
      await expectCalloutState('shared-by-me');
    }
  }

  /**
   * Duplicates the current conversation
   */
  async duplicateConversation(conversationTitle: string) {
    await this.locators.sharedCallout.locator(this.locators.duplicateConversationButton).click();
    await expect(this.locators.conversationTitleHeading).toHaveText(
      `[Duplicate] ${conversationTitle}`
    );
  }

  /**
   * Duplicates conversation from the conversation menu
   */
  async duplicateFromMenu(conversationTitle: string) {
    await this.locators.conversationSettingsMenu.click();
    await this.locators.duplicateButton.click();
    await expect(this.locators.conversationTitleHeading).toHaveText(
      `[Duplicate] ${conversationTitle}`
    );
  }

  /**
   * Duplicates conversation from the conversation side menu
   */
  async duplicateFromConversationSideContextMenu(conversationTitle: string) {
    // eslint-disable-next-line playwright/no-nth-methods
    await this.locators.convoContextMenuButton.first().click();
    await this.locators.convoContextMenuDuplicate.click();
    await expect(this.locators.conversationTitleHeading).toHaveText(
      `[Duplicate] ${conversationTitle}`
    );
  }

  /**
   * Copies the conversation URL from the menu
   */
  async copyUrlFromMenu() {
    await this.locators.conversationSettingsMenu.click();
    await this.locators.copyUrlButton.click();
  }

  /**
   * Copies the conversation URL from the conversation side context menu
   */
  async copyUrlFromConversationSideContextMenu() {
    // eslint-disable-next-line playwright/no-nth-methods
    await this.locators.convoContextMenuButton.first().click();
    await this.locators.convoContextMenuCopyUrl.click();
  }

  /**
   * Copies the conversation URL from the share modal
   */
  async copyUrlFromShareModal() {
    await this.openShareMenu();
    await this.openShareModal();
    await this.locators.shareModalCopyUrlButton.click();
    await this.closeShareModal();
  }

  /**
   * Dismisses the shared conversation callout
   */
  async dismissSharedCallout() {
    await this.locators.sharedCallout.locator(this.locators.dismissCalloutButton).click();
    await expect(this.locators.sharedCallout).toBeHidden();
  }
}
