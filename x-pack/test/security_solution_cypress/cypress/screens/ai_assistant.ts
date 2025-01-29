/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ADD_NEW_CONNECTOR = '[data-test-subj="addNewConnectorButton"]';
export const ADD_QUICK_PROMPT = '[data-test-subj="addQuickPrompt"]';
export const ASSISTANT_SETTINGS_BUTTON = 'button[data-test-subj="settings"]';
export const AI_ASSISTANT_BUTTON = '[data-test-subj="assistantNavLink"]';
export const ASSISTANT_CHAT_BODY = '[data-test-subj="assistantChat"]';
export const CHAT_CONTEXT_MENU = '[data-test-subj="chat-context-menu"]';
export const CHAT_ICON = '[data-test-subj="newChat"]';
export const CHAT_ICON_SM = '[data-test-subj="newChatByTitle"]';
export const CLEAR_CHAT = '[data-test-subj="clear-chat"]';
export const CLEAR_SYSTEM_PROMPT = '[data-test-subj="clearSystemPrompt"]';
export const CONFIRM_CLEAR_CHAT = '[data-test-subj="confirmModalConfirmButton"]';
export const CONNECTOR_MISSING_CALLOUT = '[data-test-subj="connectorMissingCallout"]';
export const CONNECTOR_SELECT = (c: string) => `[data-test-subj="connector-${c}"]`;
export const CONNECTOR_SELECTOR = '[data-test-subj="connector-selector"]';
export const CONVERSATION_MESSAGE = '[data-test-subj="messageText"]';
export const CONVERSATION_MESSAGE_ERROR =
  '[data-test-subj="errorComment"] [data-test-subj="messageText"]';
export const CONVERSATION_MULTI_SELECTOR =
  '[data-test-subj="conversationMultiSelector"] [data-test-subj="comboBoxSearchInput"]';
export const CONVERSATION_SELECT = (c: string) => `[data-test-subj="conversation-select-${c}"]`;
export const CONVERSATION_TITLE = '[data-test-subj="conversationTitle"]';
export const CONVERSATION_TITLE_SAVE_BUTTON = '[data-test-subj="euiInlineEditModeSaveButton"]';
export const CREATE_SYSTEM_PROMPT = '[data-test-subj="addSystemPrompt"]';
export const EMPTY_CONVO = '[data-test-subj="emptyConvo"]';
export const FLYOUT_NAV_TOGGLE = '[data-test-subj="aiAssistantFlyoutNavigationToggle"]';
export const MODAL_SAVE_BUTTON = '[data-test-subj="save-button"]';
export const NEW_CHAT = '[data-test-subj="newChatFromOverlay"]';
export const PROMPT_CONTEXT_SELECTOR =
  '[data-test-subj="promptContextSelector"] [data-test-subj="comboBoxSearchInput"]';
export const PROMPT_CONTEXT_BUTTON = (i: string | number) =>
  `[data-test-subj="selectedPromptContext-${i}-button"]`;
export const QUICK_PROMPT_TITLE_INPUT =
  '[data-test-subj="quickPromptSelector"] [data-test-subj="comboBoxSearchInput"]';
export const QUICK_PROMPT_BADGE = (b: string) => `[data-test-subj="quickPrompt-${b}"]`;
export const QUICK_PROMPT_BODY_INPUT = '[data-test-subj="quick-prompt-prompt"]';
export const SEND_TO_TIMELINE_BUTTON = '[data-test-subj="sendToTimelineEmptyButton"]';
export const SUBMIT_CHAT = '[data-test-subj="submit-chat"]';
export const SYSTEM_PROMPT = '[data-test-subj="promptSuperSelect"]';
export const SYSTEM_PROMPT_BODY_INPUT = '[data-test-subj="systemPromptModalPromptText"]';
export const SYSTEM_PROMPT_TITLE_INPUT =
  '[data-test-subj="systemPromptSelector"] [data-test-subj="comboBoxSearchInput"]';
export const SYSTEM_PROMPT_SELECT = (c: string) => `[data-test-subj="systemPrompt-${c}"]`;
export const UPGRADE_CTA = '[data-test-subj="upgradeLicenseCallToAction"]';
export const USER_PROMPT = '[data-test-subj="prompt-textarea"]';
export const WELCOME_SETUP = '[data-test-subj="welcome-setup"]';
