/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OpenConversationSidebarOptions } from '@kbn/agent-builder-browser';
import { i18n } from '@kbn/i18n';
import type { SignificantEvent } from '@kbn/significant-events-schema';

/** Sidebar open options including conversation restore (see agent_builder `openSidebarInternal`). */
export type OpenSignificantEventChatOptions = OpenConversationSidebarOptions & {
  conversationId?: string;
};

export const buildNewSignificantEventChatOptions = (
  event: SignificantEvent
): OpenSignificantEventChatOptions => ({
  newConversation: true,
  autoSendInitialMessage: false,
  initialMessage: i18n.translate('xpack.nightshift.explainEventPrompt', {
    defaultMessage: 'Explain this significant event: {significantEventName}',
    values: { significantEventName: event.title },
  }),
});

export const buildInvestigationConversationChatOptions = (
  conversationId: string
): OpenSignificantEventChatOptions => ({
  conversationId,
});
