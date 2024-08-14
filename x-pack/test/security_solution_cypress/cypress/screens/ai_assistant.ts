/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AI_ASSISTANT_BUTTON = '[data-test-subj="assistantHeaderLink"]';
export const ASSISTANT_CHAT_BODY = '[data-test-subj="assistantChat"]';
export const WELCOME_SETUP = '[data-test-subj="welcome-setup"]';
export const CHAT_ICON = '[data-test-subj="newChat"]';
export const CHAT_ICON_SM = '[data-test-subj="newChatByTitle"]';
export const CONVERSATION_TITLE = '[data-test-subj="conversationTitle"]';
export const CONVERSATION_TITLE_SAVE_BUTTON = '[data-test-subj="euiInlineEditModeSaveButton"]';
export const EMPTY_CONVO = '[data-test-subj="emptyConvo"]';
export const SYSTEM_PROMPT = '[data-test-subj="systemPromptText"]';
export const CONNECTOR_SELECTOR = '[data-test-subj="connector-selector"]';
export const USER_PROMPT = '[data-test-subj="prompt-textarea"]';
export const PROMPT_CONTEXT_BUTTON = (i: string | number) =>
  `[data-test-subj="selectedPromptContext-${i}-button"]`;
export const CONNECTOR_MISSING_CALLOUT = '[data-test-subj="connectorMissingCallout"]';
export const SUBMIT_CHAT = '[data-test-subj="submit-chat"]';
export const FLYOUT_NAV_TOGGLE = '[data-test-subj="aiAssistantFlyoutNavigationToggle"]';
export const CONVERSATION_MESSAGE = '[data-test-subj="messageText"]';
export const CONVERSATION_MESSAGE_ERROR =
  '[data-test-subj="errorComment"] [data-test-subj="messageText"]';
export const CONVERSATION_SELECT = (c: string) => `[data-test-subj="conversation-select-${c}"]`;
export const CLEAR_SYSTEM_PROMPT = '[data-test-subj="clearSystemPrompt"]';
export const CONNECTOR_SELECT = (c: string) => `[data-test-subj="connector-${c}"]`;
export const NEW_CHAT = '[data-test-subj="newChatFromOverlay"]';
export const CHAT_CONTEXT_MENU = '[data-test-subj="chat-context-menu"]';
export const CLEAR_CHAT = '[data-test-subj="clear-chat"]';
export const CONFIRM_CLEAR_CHAT = '[data-test-subj="confirmModalConfirmButton"]';
