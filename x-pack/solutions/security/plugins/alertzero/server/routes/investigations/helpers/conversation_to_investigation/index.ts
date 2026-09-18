/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Conversation,
  MetadataFieldValue,
  TimelineEvent as ConversationTimelineEvent,
} from '@kbn/agent-builder-common';
import { TimelineEventType } from '@kbn/agent-builder-common';
import type { Investigation, TimelineEvent } from '@kbn/alertzero-common';
import { SYSTEM_SECURITY_WATCH_FLOOR_ID, TEMPLATE_ID_INVESTIGATION } from '@kbn/alertzero-common';

const asMetadataString = (value: MetadataFieldValue | undefined): string | undefined => {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return undefined;
};

const actorName = (event: ConversationTimelineEvent): string | null => {
  const { actor } = event;
  return actor.full_name ?? actor.username ?? actor.id ?? null;
};

const toTimelineEvent = (event: ConversationTimelineEvent): TimelineEvent[] => {
  if (event.type === TimelineEventType.userMessage && !event.execution_id) {
    const message = typeof event.data.message === 'string' ? event.data.message : '';
    return [
      {
        actor: actorName(event),
        id: event.id,
        summary: message,
        timestamp: event.created_at,
        type: event.type,
      },
    ];
  }

  if (event.type === TimelineEventType.attachmentAdded) {
    const attachmentType =
      typeof event.data.attachment_type === 'string' ? event.data.attachment_type : 'attachment';
    return [
      {
        actor: actorName(event),
        id: event.id,
        summary: `Attached ${attachmentType}`,
        timestamp: event.created_at,
        type: event.type,
      },
    ];
  }

  return [];
};

/**
 * Maps an Agent Builder conversation onto the AlertZero Investigation DTO the flyout already reads.
 * Desk-test only (PR4); do not fold into PR1–PR3.
 */
export const conversationToInvestigation = (conversation: Conversation): Investigation => {
  const metadata = conversation.metadata ?? {};

  return {
    createdAt: conversation.created_at,
    events: (conversation.events ?? []).flatMap(toTimelineEvent),
    id: conversation.id,
    pendingProposalCount: 0,
    status: asMetadataString(metadata.status),
    summary: asMetadataString(metadata.summary),
    template_id: TEMPLATE_ID_INVESTIGATION,
    title: conversation.title,
    updatedAt: conversation.updated_at,
    watch_execution_id: asMetadataString(metadata.workflow_execution_id) ?? '',
    watch_id: SYSTEM_SECURITY_WATCH_FLOOR_ID,
    watch_tier: 'floor',
  };
};
