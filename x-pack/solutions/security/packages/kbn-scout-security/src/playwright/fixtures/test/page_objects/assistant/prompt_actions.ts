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
 * Actions related to AI Assistant prompts (system prompts and quick prompts)
 *
 * This class handles creating, selecting, and managing both system prompts and quick prompts.
 */
export class PromptActions {
  constructor(
    private readonly page: ScoutPage,
    private readonly locators: AssistantLocators,
    private readonly messaging: MessagingActions
  ) {}

  // ========================================
  // System Prompt Actions
  // ========================================

  /**
   * Selects a system prompt by name
   */
  async selectSystemPrompt(promptName: string) {
    await this.locators.systemPromptSelect.click();
    await this.locators.systemPromptOption(promptName).click();
    await expect(this.locators.systemPromptSelect).toHaveText(promptName);
  }

  /**
   * Clears the current system prompt selection
   */
  async clearSystemPrompt() {
    await this.locators.clearSystemPromptButton.click();
    await expect(this.locators.systemPromptSelect).toHaveText('Select a system prompt');
  }

  /**
   * Creates a new system prompt
   * @param title - The prompt title
   * @param content - The prompt content
   * @param defaultConversations - Optional list of conversations to apply this prompt to
   */
  async createSystemPrompt(title: string, content: string, defaultConversations?: string[]) {
    await this.locators.systemPromptSelect.click();
    await this.locators.createSystemPromptButton.click();
    await this.locators.systemPromptTitleInput.fill(title);
    await this.locators.systemPromptTitleInput.press('Enter');

    // Wait for the body input to become enabled after title confirmation
    await expect(this.locators.systemPromptBodyInput).toBeEnabled({
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });

    await this.locators.systemPromptBodyInput.fill(content);

    if (defaultConversations && defaultConversations.length > 0) {
      for (const conversation of defaultConversations) {
        await this.locators.conversationMultiSelector.fill(conversation);
        await this.locators.conversationMultiSelector.press('Enter');
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
    await expect(this.locators.modalSaveButton).toBeVisible({
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
    await expect(this.locators.modalSaveButton).toBeEnabled({
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });

    // Use force click if toast is still blocking (it's just a visual overlay)
    // eslint-disable-next-line playwright/no-force-option
    await this.locators.modalSaveButton.click({ force: true });
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
    await this.locators.addQuickPromptButton.click();
    await this.locators.quickPromptTitleInput.fill(title);
    await this.locators.quickPromptTitleInput.press('Enter');
    await this.locators.quickPromptBodyInput.fill(content);

    if (contexts && contexts.length > 0) {
      for (const context of contexts) {
        await this.locators.promptContextSelector.fill(context);
        await this.locators.promptContextSelector.press('Enter');
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
    await expect(this.locators.modalSaveButton).toBeVisible({
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
    await expect(this.locators.modalSaveButton).toBeEnabled({
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });

    // Use force click if toast is still blocking (it's just a visual overlay)
    // eslint-disable-next-line playwright/no-force-option
    await this.locators.modalSaveButton.click({ force: true });
  }

  /**
   * Sends a quick prompt by clicking its badge and submitting it
   */
  async sendQuickPrompt(promptName: string) {
    await this.locators.quickPromptBadge(promptName).click();
    await this.messaging.submitMessage();
  }
}
