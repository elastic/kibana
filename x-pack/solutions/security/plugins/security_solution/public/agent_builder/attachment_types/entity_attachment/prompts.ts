/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EntityAttachmentIdentifier } from './types';

const hostPrompt = (identifier: string) =>
  i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.continueConversation.hostPrompt',
    {
      defaultMessage:
        'Tell me more about the host {identifier}. Summarise its risk score, asset criticality, recent alerts, and any notable observed behaviours.',
      values: { identifier },
    }
  );

const userPrompt = (identifier: string) =>
  i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.continueConversation.userPrompt',
    {
      defaultMessage:
        'Tell me more about the user {identifier}. Summarise their risk score, asset criticality, recent alerts, and any notable observed behaviours.',
      values: { identifier },
    }
  );

const servicePrompt = (identifier: string) =>
  i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.continueConversation.servicePrompt',
    {
      defaultMessage:
        'Tell me more about the service {identifier}. Summarise its risk score, dependencies, and any notable observed behaviours.',
      values: { identifier },
    }
  );

const genericPrompt = (identifier: string) =>
  i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.continueConversation.genericPrompt',
    {
      defaultMessage:
        'Tell me more about the entity {identifier}. Summarise what is known about it, its risk posture, and any notable relationships.',
      values: { identifier },
    }
  );

/**
 * Builds the prefilled composer text for a "Continue the conversation" chip on
 * a single entity. The prompt is type-aware so the agent receives enough
 * context to branch without the user editing the message.
 */
export const getContinueConversationPrompt = (
  identifier: EntityAttachmentIdentifier
): string => {
  switch (identifier.identifierType) {
    case 'host':
      return hostPrompt(identifier.identifier);
    case 'user':
      return userPrompt(identifier.identifier);
    case 'service':
      return servicePrompt(identifier.identifier);
    case 'generic':
    default:
      return genericPrompt(identifier.identifier);
  }
};

/**
 * Prompt used when the user wants to continue the conversation about every
 * entity in a multi-entity attachment at once.
 */
export const getContinueConversationBulkPrompt = (
  identifiers: EntityAttachmentIdentifier[]
): string => {
  const labels = identifiers
    .map((entity) => `${entity.identifierType}: ${entity.identifier}`)
    .join(', ');
  return i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.continueConversation.bulkPrompt',
    {
      defaultMessage:
        'Investigate these entities together: {labels}. Compare their risk, highlight common indicators, and identify any shared alerts or infrastructure.',
      values: { labels },
    }
  );
};
