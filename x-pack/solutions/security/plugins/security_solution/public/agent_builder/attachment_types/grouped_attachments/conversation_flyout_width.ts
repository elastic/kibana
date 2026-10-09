/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The system flyout and the in-chat flyout. They live on different pages and share a flyout
 * history key, so at most one of them is on the document.
 */
const CONVERSATION_FLYOUT_TEST_SUBJECTS = [
  'agentBuilderConversationDetailsFlyout-snapshot',
  'agentBuilderConversationDetailsFlyout-live',
] as const;

/**
 * Pixel width of the conversation details flyout that is open now.
 * A push replacement uses this as its size so the page inset stays where it is.
 */
export const getOpenConversationFlyoutWidth = (): number | undefined => {
  for (const testSubj of CONVERSATION_FLYOUT_TEST_SUBJECTS) {
    const flyout = document.querySelector(`[data-test-subj="${testSubj}"]`);
    const width =
      flyout instanceof HTMLElement ? Math.round(flyout.getBoundingClientRect().width) : 0;
    if (width > 0) {
      return width;
    }
  }
  return undefined;
};
