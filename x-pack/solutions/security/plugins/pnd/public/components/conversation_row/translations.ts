/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ATTACK_DISCOVERY_ALERT_ID = i18n.translate(
  'xpack.pnd.conversationRow.correlationIdLabel',
  {
    defaultMessage: 'Attack discovery',
  }
);

export const CONVERSATION_ID = i18n.translate('xpack.pnd.conversationRow.conversationIdLabel', {
  defaultMessage: 'Conversation',
});

export const CREATED_AT = i18n.translate('xpack.pnd.conversationRow.createdAtLabel', {
  defaultMessage: 'Created',
});

export const GATE = i18n.translate('xpack.pnd.conversationRow.gateLabel', {
  defaultMessage: 'Gate',
});

export const UPDATED_AT = i18n.translate('xpack.pnd.conversationRow.updatedAtLabel', {
  defaultMessage: 'Updated',
});

export const UNTITLED = i18n.translate('xpack.pnd.conversationRow.untitledTitle', {
  defaultMessage: 'Untitled conversation',
});

export const VIEW_LIFECYCLE = i18n.translate('xpack.pnd.conversationRow.viewLifecycleButton', {
  defaultMessage: 'View lifecycle',
});

export const openConversationAriaLabel = (title: string): string =>
  i18n.translate('xpack.pnd.conversationRow.openConversationAriaLabel', {
    defaultMessage: 'Open the conversation {title}',
    values: { title },
  });

/**
 * Every row's lifecycle button reads the same two words, so a list of them is unnavigable by
 * accessible name alone. The name says which conversation's lifecycle it opens.
 */
export const viewLifecycleAriaLabel = (title: string): string =>
  i18n.translate('xpack.pnd.conversationRow.viewLifecycleAriaLabel', {
    defaultMessage: 'View the four-phase lifecycle behind {title}',
    values: { title },
  });
