/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { TIMEOUTS } from '../../../../constants/timeouts';
import { AssistantLocators } from './assistant_locators';
import { ConversationActions } from './conversation_actions';
import { MessagingActions } from './messaging_actions';
import { PromptActions } from './prompt_actions';
import { SharingActions } from './sharing_actions';
import { ConnectorActions } from './connector_actions';
import { AssistantAssertions } from './assistant_assertions';

/**
 * Page Object for the AI Assistant flyout in Kibana Security Solution
 *
 * The AI Assistant is a conversational interface that helps users with security tasks.
 * It can be opened from the main navigation or from context (alerts, rules).
 *
 * This class acts as an orchestrator, delegating to specialized action classes
 * for different feature domains (conversations, messaging, prompts, sharing, connectors).
 *
 * @example
 * ```typescript
 * // Open assistant and create a conversation
 * await assistantPage.open();
 * await assistantPage.conversations.createNewChat();
 * await assistantPage.messaging.typeAndSendMessage('hello');
 * await assistantPage.assertions.expectMessageSent('hello');
 * ```
 */
export class AssistantPage {
  /**
   * Locators for all AI Assistant elements
   *
   * Note: Prefer using the action classes (conversations, messaging, prompts, etc.)
   * over accessing locators directly. Locators are exposed for flexibility in tests
   * that need direct element access.
   */
  public readonly locators: AssistantLocators;

  /**
   * Actions related to conversation management
   * (creating, selecting, resetting conversations)
   */
  public readonly conversations: ConversationActions;

  /**
   * Actions related to messaging
   * (typing, sending messages, timeline integration)
   */
  public readonly messaging: MessagingActions;

  /**
   * Actions related to prompts
   * (system prompts and quick prompts)
   */
  public readonly prompts: PromptActions;

  /**
   * Actions related to sharing
   * (sharing conversations, permissions, duplication)
   */
  public readonly sharing: SharingActions;

  /**
   * Actions related to connectors
   * (selecting and creating connectors)
   */
  public readonly connectors: ConnectorActions;

  /**
   * Assertion methods for verifying AI Assistant state
   * (expect* methods)
   */
  public readonly assertions: AssistantAssertions;

  constructor(private readonly page: ScoutPage) {
    // Initialize locators (shared by all action classes)
    this.locators = new AssistantLocators(page);

    // Initialize messaging first (needed by conversations and prompts)
    this.messaging = new MessagingActions(this.locators);

    // Initialize action classes with dependencies
    this.conversations = new ConversationActions(page, this.locators, this.messaging);
    this.prompts = new PromptActions(page, this.locators, this.messaging);
    this.sharing = new SharingActions(this.locators);
    this.connectors = new ConnectorActions(page, this.locators);
    this.assertions = new AssistantAssertions(page, this.locators);
  }

  // ========================================
  // High-Level Navigation
  // ========================================

  /**
   * Opens the AI Assistant from the main navigation button
   */
  async open() {
    await this.locators.assistantButton.click();
    await this.waitForAssistantLoaded();
  }

  /**
   * Opens the AI Assistant from a rule context
   * Requires being on a page with the rule chat icon
   */
  async openFromRule() {
    await this.dismissOnboardingTour();
    await this.locators.chatIcon.waitFor({ state: 'visible' });
    // Use force click to bypass toasts that may block the button
    // This is a known issue carried over from Cypress - toasts can block UI elements
    // eslint-disable-next-line playwright/no-force-option
    await this.locators.chatIcon.click({ force: true });
    await this.waitForAssistantLoaded();
  }

  /**
   * Opens the AI Assistant from an alert context
   * Requires being on a page with the alert chat icon
   */
  async openFromAlert() {
    await this.locators.chatIconSmall.waitFor({ state: 'visible' });
    await this.locators.chatIconSmall.click();
    await this.waitForAssistantLoaded();
  }

  /**
   * Closes the AI Assistant flyout
   */
  async close() {
    await this.locators.closeFlyoutButton.click();
  }

  /**
   * Dismisses the onboarding tour modal if present
   * This modal may appear for first-time users and can block interactions
   */
  async dismissOnboardingTour() {
    await this.page
      .getByRole('button', { name: 'Close tour' })
      .click({ timeout: TIMEOUTS.UI_ELEMENT_STANDARD })
      .catch(() => {
        // Modal not present, continue silently
      });
  }

  // ========================================
  // Helper Methods (Private)
  // ========================================

  /**
   * Waits for the assistant flyout to be fully loaded
   */
  private async waitForAssistantLoaded() {
    await this.locators.assistantChatBody.waitFor({ state: 'visible' });
  }
}
