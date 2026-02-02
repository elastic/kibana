/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { closeToast } from './common/toast';
import { CONNECTOR_NAME_INPUT, SAVE_ACTION_CONNECTOR_BTN } from '../screens/common/rule_actions';
import { azureConnectorAPIPayload } from './api_calls/connectors';
import { TIMELINE_CHECKBOX } from '../screens/timelines';
import { CLOSE_FLYOUT } from '../screens/alerts';
import {
  AI_ASSISTANT_BUTTON,
  ASSISTANT_CHAT_BODY,
  CHAT_ICON,
  CHAT_ICON_SM,
  CONNECTOR_SELECT,
  CONNECTOR_SELECTOR,
  CONVERSATION_TITLE,
  EMPTY_CONVO,
  WELCOME_SETUP,
  NEW_CHAT,
  CONVERSATION_SELECT,
  FLYOUT_NAV_TOGGLE,
  CONVERSATION_MESSAGE,
  USER_PROMPT,
  SUBMIT_CHAT,
  CONVERSATION_MESSAGE_ERROR,
  CLEAR_SYSTEM_PROMPT,
  CHAT_CONTEXT_MENU,
  CLEAR_CHAT,
  CONFIRM_CLEAR_CHAT,
  SYSTEM_PROMPT_SELECT,
  SYSTEM_PROMPT,
  CREATE_SYSTEM_PROMPT,
  SYSTEM_PROMPT_TITLE_INPUT,
  SYSTEM_PROMPT_BODY_INPUT,
  CONVERSATION_MULTI_SELECTOR,
  MODAL_SAVE_BUTTON,
  ADD_QUICK_PROMPT,
  QUICK_PROMPT_TITLE_INPUT,
  QUICK_PROMPT_BODY_INPUT,
  PROMPT_CONTEXT_SELECTOR,
  QUICK_PROMPT_BADGE,
  ADD_NEW_CONNECTOR,
  SEND_TO_TIMELINE_BUTTON,
  OPENAI_CONNECTOR_OPTION,
  SECRETS_APIKEY_INPUT,
  SHARE_BADGE_BUTTON,
  SHARE_SELECT,
  PRIVATE_SELECT_OPTION,
  RESTRICTED_SELECT_OPTION,
  OWNER_SHARED_CALLOUT,
  SHARED_CALLOUT,
  SHARE_MODAL,
  SHARE_BUTTON,
  USER_PROFILES_SEARCH,
  CONVERSATION_LIST_ICON,
  USER_PROFILES_SELECT_OPTION,
  DISMISS_CALLOUT_BUTTON,
  DUPLICATE_CONVERSATION,
  CONVERSATION_SETTINGS_MENU,
  COPY_URL,
  CONVO_CONTEXT_MENU_BUTTON,
  CONVO_CONTEXT_MENU_COPY_URL,
  SHARE_MODAL_COPY_URL,
  DUPLICATE,
  CONVO_CONTEXT_MENU_DUPLICATE,
  SHARED_SELECT_OPTION,
} from '../screens/ai_assistant';
import { SUCCESS_TOASTER_HEADER, TOASTER } from '../screens/alerts_detection_rules';

export const openAssistant = (context?: 'rule' | 'alert') => {
  if (!context) {
    cy.get(AI_ASSISTANT_BUTTON).click();
    return;
  }
  if (context === 'rule') {
    cy.get(CHAT_ICON).should('be.visible');
    cy.get(CHAT_ICON).click();
    return;
  }
  if (context === 'alert') {
    cy.get(CHAT_ICON_SM).should('be.visible');
    cy.get(CHAT_ICON_SM).click();
    return;
  }
};

export const closeAssistant = () => {
  cy.get(`${ASSISTANT_CHAT_BODY} ${CLOSE_FLYOUT}`).click();
};

export const createNewChat = () => {
  cy.get(`${NEW_CHAT}`).click();
};

export const selectConnector = (connectorName: string) => {
  const connectorOption = CONNECTOR_SELECT(connectorName);

  cy.get(CONNECTOR_SELECTOR).click();
  // The connector list can be visible but not scrollable (e.g. only 1-2 connectors).
  // In that case Cypress will retry `scrollTo()` until it times out unless we disable the scrollability check.
  cy.get('[data-test-subj="aiAssistantConnectorSelector"] .euiSelectableList__list')
    .should('be.visible')
    .scrollTo('bottom', { ensureScrollable: false });
  cy.get(connectorOption).scrollIntoView();
  cy.get(connectorOption).should('be.visible').click();
  assertConnectorSelected(connectorName);
};
export const resetConversation = () => {
  cy.get(CONVERSATION_SETTINGS_MENU).click();
  cy.get(CLEAR_CHAT).click();
  cy.get(CONFIRM_CLEAR_CHAT).click();
  cy.get(EMPTY_CONVO).should('be.visible');
};
export const selectConversation = (conversationName: string) => {
  cy.get(FLYOUT_NAV_TOGGLE).click();
  cy.get(CONVERSATION_SELECT(conversationName)).click();
  assertConversationTitle(conversationName);
  cy.get(FLYOUT_NAV_TOGGLE).click();
};

export const updateConversationTitle = (newTitle: string) => {
  cy.get(CONVERSATION_TITLE + ' h2').click();
  cy.get(CONVERSATION_TITLE + ' input').clear();
  cy.get(CONVERSATION_TITLE + ' input').type(newTitle);
  cy.get(CONVERSATION_TITLE + ' input').type('{enter}');
  assertConversationTitle(newTitle);
};

export const submitMessage = () => {
  cy.get(SUBMIT_CHAT).click();
};

export const typeAndSendMessage = (message: string) => {
  cy.get(USER_PROMPT).click();
  cy.get(USER_PROMPT).type(message);
  submitMessage();
};

// message must get sent before the title can be updated
export const createAndTitleConversation = (newTitle = 'Something else') => {
  createNewChat();
  assertNewConversation(false, 'New chat');
  selectConnector(azureConnectorAPIPayload.name);
  assertConnectorSelected(azureConnectorAPIPayload.name);
  typeAndSendMessage('hello');
  assertMessageSent('hello');
  assertErrorResponse();
  updateConversationTitle(newTitle);
};

export const sendQueryToTimeline = () => {
  cy.get(SEND_TO_TIMELINE_BUTTON).click();
};

export const clearSystemPrompt = () => {
  cy.get(CLEAR_SYSTEM_PROMPT).click();
  assertEmptySystemPrompt();
};

export const sendQuickPrompt = (prompt: string) => {
  cy.get(QUICK_PROMPT_BADGE(prompt)).click();
  submitMessage();
};

export const selectSystemPrompt = (systemPrompt: string) => {
  cy.get(SYSTEM_PROMPT).click();
  cy.get(SYSTEM_PROMPT_SELECT(systemPrompt)).click();
  assertSystemPromptSelected(systemPrompt);
};

export const createSystemPrompt = (
  title: string,
  prompt: string,
  defaultConversations?: string[]
) => {
  cy.get(SYSTEM_PROMPT).click();
  cy.get(CREATE_SYSTEM_PROMPT).click();
  cy.get(SYSTEM_PROMPT_TITLE_INPUT).type(`${title}{enter}`);
  cy.get(SYSTEM_PROMPT_BODY_INPUT).type(prompt);
  if (defaultConversations && defaultConversations.length) {
    defaultConversations.forEach((conversation) => {
      cy.get(CONVERSATION_MULTI_SELECTOR).type(`${conversation}{enter}`);
    });
  }
  cy.get(MODAL_SAVE_BUTTON).click();
};

export const createOpenAIConnector = (connectorName: string) => {
  cy.get(OPENAI_CONNECTOR_OPTION).click();
  cy.get(CONNECTOR_NAME_INPUT).type(connectorName);
  cy.get(SECRETS_APIKEY_INPUT).type('1234');
  cy.get(SAVE_ACTION_CONNECTOR_BTN).click();
  cy.get(SAVE_ACTION_CONNECTOR_BTN).should('not.exist');
};

export const createQuickPrompt = (
  title: string,
  prompt: string,
  defaultConversations?: string[]
) => {
  cy.get(ADD_QUICK_PROMPT).click();
  cy.get(QUICK_PROMPT_TITLE_INPUT).type(`${title}{enter}`);
  cy.get(QUICK_PROMPT_BODY_INPUT).type(prompt);
  if (defaultConversations && defaultConversations.length) {
    defaultConversations.forEach((conversation) => {
      cy.get(PROMPT_CONTEXT_SELECTOR).type(`${conversation}{enter}`);
    });
  }
  cy.get(MODAL_SAVE_BUTTON).click();
};

export const selectRule = (ruleId: string) => {
  // not be.visible because of eui css
  cy.get(TIMELINE_CHECKBOX(ruleId)).should('exist');
  cy.get(TIMELINE_CHECKBOX(ruleId)).click();
};

/**
 * Assertions
 */
export const assertNewConversation = (isWelcome: boolean, title: string) => {
  if (isWelcome) {
    cy.get(WELCOME_SETUP).should('be.visible');
  } else {
    cy.get(EMPTY_CONVO).should('be.visible');
  }
  assertConversationTitle(title);
};

export const assertConversationTitle = (title: string) =>
  cy.get(CONVERSATION_TITLE + ' h2').should('have.text', title);

export const assertConversationTitleContains = (title: string) =>
  cy.get(CONVERSATION_TITLE + ' h2').should('contains.text', title);

export const assertSystemPromptSent = (message: string) => {
  cy.get(CONVERSATION_MESSAGE).eq(0).should('contain', message);
};

export const assertMessageSent = (message: string, prompt: boolean = false) => {
  if (prompt) {
    return cy.get(CONVERSATION_MESSAGE).eq(1).should('contain', message);
  }
  cy.get(CONVERSATION_MESSAGE).eq(0).should('contain', message);
};

export const assertErrorResponse = () => {
  cy.get(CONVERSATION_MESSAGE_ERROR).should('be.visible');
};

export const assertSystemPromptSelected = (systemPrompt: string) => {
  cy.get(SYSTEM_PROMPT).should('have.text', systemPrompt);
};

export const assertEmptySystemPrompt = () => {
  const EMPTY = 'Select a system prompt';
  cy.get(SYSTEM_PROMPT).should('have.text', EMPTY);
};

export const assertConnectorSelected = (connectorName: string) => {
  cy.get(CONNECTOR_SELECTOR).should('have.text', connectorName);
};

const assertConversationTitleReadOnly = () => {
  cy.get(CONVERSATION_TITLE + ' h2').click();
  cy.get(CONVERSATION_TITLE + ' input').should('not.exist');
};

export const assertConversationReadOnly = () => {
  assertConversationTitleReadOnly();
  cy.get(ADD_NEW_CONNECTOR).should('be.disabled');
  cy.get(CHAT_CONTEXT_MENU).should('be.disabled');
  cy.get(FLYOUT_NAV_TOGGLE).should('be.disabled');
  cy.get(NEW_CHAT).should('be.disabled');
};

export const openShareMenu = () => {
  cy.get(SHARE_BADGE_BUTTON).click();
  cy.get(SHARE_SELECT).should('be.visible');
};
export const assertShareMenuStatus = (type: 'Private' | 'Shared' | 'Restricted') => {
  cy.get(SHARE_BADGE_BUTTON).should('have.attr', 'title').and('include', type);
  cy.get(PRIVATE_SELECT_OPTION).should(
    'have.attr',
    'aria-checked',
    type === 'Private' ? 'true' : 'false'
  );
  cy.get(RESTRICTED_SELECT_OPTION).should(
    'have.attr',
    'aria-checked',
    type === 'Restricted' ? 'true' : 'false'
  );
  cy.get(SHARED_SELECT_OPTION).should(
    'have.attr',
    'aria-checked',
    type === 'Shared' ? 'true' : 'false'
  );
};

export const shareConversationWithUser = (user: string) => {
  cy.get(USER_PROFILES_SEARCH).find('input').type(user);
  cy.get(USER_PROFILES_SEARCH)
    .find(USER_PROFILES_SELECT_OPTION(user))
    .should('have.attr', 'aria-checked', 'false');
  cy.get(USER_PROFILES_SEARCH).find(USER_PROFILES_SELECT_OPTION(user)).click();
  cy.get(USER_PROFILES_SEARCH)
    .find(USER_PROFILES_SELECT_OPTION(user))
    .should('have.attr', 'aria-checked', 'true');
};

export const selectPrivate = () => {
  cy.get(PRIVATE_SELECT_OPTION).click();
};

export const selectGlobal = () => {
  cy.get(SHARED_SELECT_OPTION).click();
};

export const selectShareModal = () => {
  cy.get(RESTRICTED_SELECT_OPTION).click();
  cy.get(SHARE_MODAL).should('exist');
};

export const assertShareUser = (user: string) => {
  cy.get(USER_PROFILES_SEARCH)
    .find(USER_PROFILES_SELECT_OPTION(user))
    .should('have.attr', 'aria-checked', 'true');
};

export const submitShareModal = () => {
  cy.get(SHARE_MODAL).find(SHARE_BUTTON).click();
};

export const closeShareModal = () => {
  cy.get(SHARE_MODAL).find(`button.euiModal__closeIcon`).click();
};
export const assertCalloutState = (state: 'private' | 'shared-by-me' | 'shared-with-me') => {
  if (state === 'private') {
    cy.get(OWNER_SHARED_CALLOUT).should('not.exist');
    cy.get(SHARED_CALLOUT).should('not.exist');
    cy.get(USER_PROMPT).should('exist');
    cy.get(SUBMIT_CHAT).should('exist');
  } else if (state === 'shared-by-me') {
    cy.get(OWNER_SHARED_CALLOUT).should('exist');
    cy.get(SHARED_CALLOUT).should('not.exist');
    cy.get(USER_PROMPT).should('exist');
    cy.get(SUBMIT_CHAT).should('exist');
  } else if (state === 'shared-with-me') {
    cy.get(SHARED_CALLOUT).should('exist');
    cy.get(OWNER_SHARED_CALLOUT).should('not.exist');
    cy.get(USER_PROMPT).should('not.exist');
    cy.get(SUBMIT_CHAT).should('not.exist');
  }
};

export const dismissSharedCallout = () => {
  cy.get(SHARED_CALLOUT).find(DISMISS_CALLOUT_BUTTON).click();
  assertNoSharedCallout();
};

export const assertNoSharedCallout = () => {
  cy.get(SHARED_CALLOUT).should('not.exist');
};

export const toggleConversationSideMenu = () => {
  cy.get(FLYOUT_NAV_TOGGLE).click();
};

export const duplicateFromMenu = (title: string) => {
  cy.get(CONVERSATION_SETTINGS_MENU).click();
  cy.get(DUPLICATE).click();
  assertConversationTitle(`[Duplicate] ${title}`);
  assertDuplicateSuccessToastShown(title);
};

export const assertDuplicateSuccessToastShown = (title: string) => {
  cy.get(SUCCESS_TOASTER_HEADER)
    .should('be.visible')
    .should('have.text', `[Duplicate] ${title} created successfully`);
};

export const copyUrlFromMenu = () => {
  cy.get(CONVERSATION_SETTINGS_MENU).click();
  cy.get(COPY_URL).click();
  assertCopyUrlSuccessToastShown();
};

export const copyUrlFromConversationSideContextMenu = () => {
  cy.get(CONVO_CONTEXT_MENU_BUTTON).eq(0).click();
  cy.get(CONVO_CONTEXT_MENU_COPY_URL).click();
  assertCopyUrlSuccessToastShown();
};

export const duplicateFromConversationSideContextMenu = (title: string) => {
  cy.get(CONVO_CONTEXT_MENU_BUTTON).eq(0).click();
  cy.get(CONVO_CONTEXT_MENU_DUPLICATE).click();
  assertConversationTitle(`[Duplicate] ${title}`);
  assertDuplicateSuccessToastShown(title);
};

export const copyUrlFromShareModal = () => {
  openShareMenu();
  selectShareModal();
  cy.get(SHARE_MODAL_COPY_URL).click();
  assertCopyUrlSuccessToastShown();
  closeShareModal();
};

export const assertCopyUrlSuccessToastShown = () => {
  cy.get(SUCCESS_TOASTER_HEADER)
    .should('be.visible')
    .should('have.text', `Conversation URL copied to clipboard`);
};

export const assertSharedConversationIcon = (title: string) => {
  cy.get(CONVERSATION_LIST_ICON(title)).should('exist');
};

export const assertNotSharedConversationIcon = (title: string) => {
  cy.get(CONVERSATION_LIST_ICON(title)).should('not.exist');
};

export const shareConversation = (share: string) => {
  openShareMenu();
  if (share === 'global') {
    selectGlobal();
    assertCalloutState('shared-by-me');
  } else {
    selectShareModal();
    shareConversationWithUser(share);
    submitShareModal();
    assertCalloutState('shared-by-me');
  }
};

export const shareConversations = (convos: Array<{ title: string; share: string }>) => {
  openAssistant();
  convos.forEach(({ title, share }) => {
    selectConversation(title);
    selectConnector(azureConnectorAPIPayload.name);
    shareConversation(share);
  });
};

export const duplicateConversation = (conversationName: string) => {
  cy.get(SHARED_CALLOUT).find(DUPLICATE_CONVERSATION).click();
  assertConversationTitle(`[Duplicate] ${conversationName}`);
  assertDuplicateSuccessToastShown(conversationName);
  closeToast();
};

export const assertMessageUser = (user: string, messageIndex: number) => {
  cy.get(`.euiCommentEvent__headerUsername`).eq(messageIndex).should('have.text', user);
};

export function assertAccessErrorToast(): void {
  cy.get(TOASTER).should('contain', 'Access denied to conversation');
}

export function assertGenericConversationErrorToast(): void {
  cy.get(TOASTER).should('contain', 'Error fetching conversation by id');
}
