/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AI Assistant Page Object Module
 *
 * This module exports the refactored AI Assistant page object and its components.
 * The page object follows a composition pattern with specialized action classes
 * for different feature domains.
 *
 * @example
 * ```typescript
 * import { AssistantPage } from './page_objects/assistant';
 *
 * // Use the page object
 * const assistant = new AssistantPage(page);
 * await assistant.open();
 * await assistant.conversations.createNewChat();
 * await assistant.messaging.typeAndSendMessage('hello');
 * await assistant.assertions.expectMessageSent('hello');
 * ```
 */

export { AssistantPage } from './assistant_page';
export { AssistantLocators } from './assistant_locators';
export { AssistantAssertions } from './assistant_assertions';
export { ConversationActions } from './conversation_actions';
export { MessagingActions } from './messaging_actions';
export { PromptActions } from './prompt_actions';
export { SharingActions } from './sharing_actions';
export { ConnectorActions } from './connector_actions';
