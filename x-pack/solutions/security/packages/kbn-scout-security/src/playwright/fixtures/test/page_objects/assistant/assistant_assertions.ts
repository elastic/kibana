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

/**
 * Assertions for the AI Assistant Page Object
 *
 * This class contains all expectation/assertion methods for verifying
 * the state and behavior of the AI Assistant.
 */
export class AssistantAssertions {
  constructor(private readonly page: ScoutPage, private readonly locators: AssistantLocators) {}

  /**
   * Asserts that a new conversation is displayed
   * @param isWelcome - Whether the welcome setup should be visible
   * @param expectedTitle - The expected conversation title
   */
  async expectNewConversation(isWelcome: boolean, expectedTitle: string) {
    if (isWelcome) {
      await expect(this.locators.welcomeSetup).toBeVisible();
    } else {
      await expect(this.locators.emptyConversation).toBeVisible();
    }
    await expect(this.locators.conversationTitleHeading).toHaveText(expectedTitle);
  }

  /**
   * Asserts the conversation title
   */
  async expectConversationTitle(title: string) {
    await expect(this.locators.conversationTitleHeading).toHaveText(title);
  }

  /**
   * Asserts the conversation title contains text
   */
  async expectConversationTitleContains(text: string) {
    await expect(this.locators.conversationTitleHeading).toContainText(text);
  }

  /**
   * Asserts that a message was sent
   * @param message - The expected message content
   * @param afterSystemPrompt - Whether this message comes after a system prompt
   */
  async expectMessageSent(message: string, afterSystemPrompt = false) {
    const index = afterSystemPrompt ? 1 : 0;
    // eslint-disable-next-line playwright/no-nth-methods
    await expect(this.locators.conversationMessages.nth(index)).toContainText(message);
  }

  /**
   * Asserts that a system prompt was sent
   */
  async expectSystemPromptSent(promptContent: string) {
    // eslint-disable-next-line playwright/no-nth-methods
    await expect(this.locators.conversationMessages.first()).toContainText(promptContent);
  }

  /**
   * Asserts that an error response is visible
   */
  async expectErrorResponse() {
    // Use longer timeout as responses can be slower after resets or in serverless environments
    await expect(this.locators.conversationErrorMessages).toBeVisible({
      timeout: TIMEOUTS.AI_ASSISTANT_RESPONSE * 2, // 60 seconds - double the standard timeout
    });
  }

  /**
   * Asserts that a connector is selected
   */
  async expectConnectorSelected(connectorName: string) {
    await expect(this.locators.connectorSelector).toHaveText(connectorName);
  }

  /**
   * Asserts that a system prompt is selected
   */
  async expectSystemPromptSelected(promptName: string) {
    await expect(this.locators.systemPromptSelect).toHaveText(promptName);
  }

  /**
   * Asserts that no system prompt is selected
   */
  async expectEmptySystemPrompt() {
    await expect(this.locators.systemPromptSelect).toHaveText('Select a system prompt');
  }

  /**
   * Asserts the share menu status
   * @param type - Expected status: 'Private', 'Shared', or 'Restricted'
   */
  async expectShareMenuStatus(type: 'Private' | 'Shared' | 'Restricted') {
    await expect(this.locators.shareBadgeButton).toHaveAttribute('title', new RegExp(type));

    await expect(this.locators.privateSelectOption).toHaveAttribute(
      'aria-checked',
      type === 'Private' ? 'true' : 'false'
    );

    await expect(this.locators.restrictedSelectOption).toHaveAttribute(
      'aria-checked',
      type === 'Restricted' ? 'true' : 'false'
    );

    await expect(this.locators.sharedSelectOption).toHaveAttribute(
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
      await expect(this.locators.ownerSharedCallout).toBeHidden();
      await expect(this.locators.sharedCallout).toBeHidden();
      await expect(this.locators.userPromptTextarea).toBeVisible();
      await expect(this.locators.submitChatButton).toBeVisible();
    } else if (state === 'shared-by-me') {
      await expect(this.locators.ownerSharedCallout).toBeVisible();
      await expect(this.locators.sharedCallout).toBeHidden();
      await expect(this.locators.userPromptTextarea).toBeVisible();
      await expect(this.locators.submitChatButton).toBeVisible();
    } else if (state === 'shared-with-me') {
      await expect(this.locators.sharedCallout).toBeVisible();
      await expect(this.locators.ownerSharedCallout).toBeHidden();
      await expect(this.locators.userPromptTextarea).toBeHidden();
      await expect(this.locators.submitChatButton).toBeHidden();
    }
  }

  /**
   * Asserts that a conversation has a shared icon in the list
   */
  async expectSharedConversationIcon(conversationTitle: string) {
    await expect(this.locators.conversationListIcon(conversationTitle)).toBeVisible();
  }

  /**
   * Asserts that a conversation does not have a shared icon in the list
   */
  async expectNotSharedConversationIcon(conversationTitle: string) {
    await expect(this.locators.conversationListIcon(conversationTitle)).toBeHidden();
  }

  /**
   * Asserts that no shared callout is visible
   */
  async expectNoSharedCallout() {
    await expect(this.locators.sharedCallout).toBeHidden();
  }

  /**
   * Asserts that a user is shown as having access in the share modal
   */
  async expectShareUser(username: string) {
    const userOption = this.locators.userProfilesSearch.locator(
      this.locators.userProfileSelectOption(username)
    );
    await expect(userOption).toHaveAttribute('aria-checked', 'true');
  }

  /**
   * Asserts that the conversation is read-only (for license/permission restrictions)
   */
  async expectConversationReadOnly() {
    // Verify title is not editable (input should not exist in read-only mode)
    await expect(this.locators.conversationTitleInput).toBeHidden();

    // Controls should be disabled
    await expect(this.locators.addNewConnectorButton).toBeDisabled();
    await expect(this.locators.chatContextMenu).toBeDisabled();
    await expect(this.locators.flyoutNavToggle).toBeDisabled();
    await expect(this.locators.newChatButton).toBeDisabled();
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
    await expect(this.locators.upgradeCallout).toBeVisible();
  }

  /**
   * Asserts that a prompt context button is visible with specific text
   */
  async expectPromptContext(index: number, expectedText: string) {
    await expect(this.locators.promptContextButton(index)).toHaveText(expectedText);
  }

  /**
   * Asserts that the user prompt textarea has specific text
   */
  async expectUserPromptText(text: string) {
    await expect(this.locators.userPromptTextarea).toHaveText(text);
  }

  /**
   * Asserts that the user prompt textarea is empty
   */
  async expectUserPromptEmpty() {
    await expect(this.locators.userPromptTextarea).not.toHaveText(/.+/);
  }

  /**
   * Asserts that a quick prompt badge is visible
   */
  async expectQuickPromptVisible(promptName: string) {
    await expect(this.locators.quickPromptBadge(promptName)).toBeVisible();
  }

  /**
   * Asserts that a quick prompt badge is not visible
   */
  async expectQuickPromptNotVisible(promptName: string) {
    await expect(this.locators.quickPromptBadge(promptName)).toBeHidden();
  }
}
