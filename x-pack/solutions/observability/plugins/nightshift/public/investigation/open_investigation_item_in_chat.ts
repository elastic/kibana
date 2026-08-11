/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { OpenSignificantEventChatOptions } from '../chat/open_significant_event_in_chat';
import { formatChatAttachmentDescription } from '../chat/chat_attachment_description';
import type { BlindSpotItem, InvestigationRecommendation } from './investigation_presentation';

const formatInvestigationItemContent = (title: string, description?: string): string =>
  description ? `${title} · ${description}` : title;

export const buildBlindSpotChatOptions = (
  blindSpot: BlindSpotItem,
  attachmentId: string
): OpenSignificantEventChatOptions => ({
  newConversation: true,
  autoSendInitialMessage: false,
  initialMessage: i18n.translate('xpack.nightshift.investigation.blindSpotChatPrompt', {
    defaultMessage: 'Tell me about this blind spot: {title}',
    values: { title: blindSpot.title },
  }),
  attachments: [
    {
      id: attachmentId,
      type: 'text',
      description: formatChatAttachmentDescription('Blind spot', blindSpot.title),
      data: {
        content: formatInvestigationItemContent(blindSpot.title, blindSpot.description),
      },
    },
  ],
});

export const buildHypothesisChatOptions = (
  hypothesis: { candidate: string; reason?: string },
  attachmentId: string
): OpenSignificantEventChatOptions => ({
  newConversation: true,
  autoSendInitialMessage: false,
  initialMessage: i18n.translate('xpack.nightshift.investigation.hypothesisChatPrompt', {
    defaultMessage: 'Tell me about this hypothesis: {candidate}',
    values: { candidate: hypothesis.candidate },
  }),
  attachments: [
    {
      id: attachmentId,
      type: 'text',
      description: formatChatAttachmentDescription('Hypothesis', hypothesis.candidate),
      data: {
        content: formatInvestigationItemContent(hypothesis.candidate, hypothesis.reason),
      },
    },
  ],
});

export const buildRecommendationChatOptions = (
  recommendation: InvestigationRecommendation,
  attachmentId: string
): OpenSignificantEventChatOptions => ({
  newConversation: true,
  autoSendInitialMessage: false,
  initialMessage: i18n.translate('xpack.nightshift.investigation.recommendationChatPrompt', {
    defaultMessage: 'Tell me about this recommendation: {title}',
    values: { title: recommendation.title },
  }),
  attachments: [
    {
      id: attachmentId,
      type: 'text',
      description: formatChatAttachmentDescription('Recommendation', recommendation.title),
      data: {
        content: formatInvestigationItemContent(recommendation.title, recommendation.description),
      },
    },
  ],
});
