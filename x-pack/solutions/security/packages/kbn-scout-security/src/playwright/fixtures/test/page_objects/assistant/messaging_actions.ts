/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantLocators } from './assistant_locators';

/**
 * Actions related to AI Assistant messaging
 *
 * This class handles typing messages, sending messages, and timeline integration.
 */
export class MessagingActions {
  constructor(private readonly locators: AssistantLocators) {}

  /**
   * Types a message in the user prompt textarea
   */
  async typeMessage(message: string) {
    await this.locators.userPromptTextarea.fill(message);
  }

  /**
   * Submits the current message
   */
  async submitMessage() {
    await this.locators.submitChatButton.click();
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
    await this.locators.sendToTimelineButton.click();
  }
}
