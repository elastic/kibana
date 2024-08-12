/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AI_ASSISTANT_BUTTON = '[data-test-subj="assistantHeaderLink"]';
export const WELCOME_SETUP = '[data-test-subj="welcome-setup"]';
export const CHAT_ICON = '[data-test-subj="newChat"]';
export const CHAT_ICON_SM = '[data-test-subj="newChatByTitle"]';
export const CONVERSATION_TITLE = '[data-test-subj="conversationTitle"]';
export const EMPTY_CONVO = '[data-test-subj="emptyConvo"]';
export const SYSTEM_PROMPT = '[data-test-subj="systemPromptText"]';
export const CONNECTOR_SELECTOR = '[data-test-subj="connector-selector"]';
export const USER_PROMPT = '[data-test-subj="prompt-textarea"]';
export const PROMPT_CONTEXT_BUTTON = (i: string | number) =>
  `[data-test-subj="selectedPromptContext-${i}-button"]`;
export const CONNECTOR_MISSING_CALLOUT = '[data-test-subj="connectorMissingCallout"]';
