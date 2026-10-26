/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineEventType } from '@kbn/agent-builder-common';

const TEXT_NOTE = 'text_note';
const STORY_MAX_CHARS = 16_000;

export interface StoryEvent {
  type: string;
  created_at: string;
  data?: unknown;
}

export interface StoryAttachment {
  id: string;
  type: string;
  description?: string;
  hidden?: boolean;
  active?: boolean;
  versions?: Array<{ version: number; data?: unknown }>;
  current_version?: number;
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;

const stringField = (
  record: Record<string, unknown> | undefined,
  key: string
): string | undefined => {
  const value = record?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
};

const attachmentLabel = (attachment: StoryAttachment | undefined): string | undefined => {
  if (!attachment) {
    return undefined;
  }
  if (attachment.description?.trim()) {
    return attachment.description.trim();
  }
  const current = attachment.versions?.find(
    (version) => version.version === attachment.current_version
  );
  const data = asRecord(
    current?.data ?? attachment.versions?.[attachment.versions.length - 1]?.data
  );
  return stringField(data, 'title') ?? stringField(data, 'summary') ?? stringField(data, 'name');
};

const lineForEvent = (
  event: StoryEvent,
  attachmentsById: Map<string, StoryAttachment>
): string | undefined => {
  const data = asRecord(event.data);
  if (event.type === TimelineEventType.userMessage) {
    const message = stringField(data, 'message');
    return message ? `User: ${message}` : undefined;
  }
  if (event.type === TEXT_NOTE) {
    const text = stringField(data, 'text');
    if (!text) {
      return undefined;
    }
    const title = stringField(data, 'title');
    return title ? `Comment: ${title}\n${text}` : `Comment: ${text}`;
  }
  if (event.type === TimelineEventType.attachmentAdded) {
    const id = stringField(data, 'attachment_id');
    const type = stringField(data, 'attachment_type') ?? 'attachment';
    const attachment = id ? attachmentsById.get(id) : undefined;
    if (attachment?.hidden || attachment?.active === false) {
      return undefined;
    }
    const label = attachmentLabel(attachment);
    return label ? `Attachment added (${type}): ${label}` : `Attachment added (${type})`;
  }
  return undefined;
};

/**
 * The investigation story a summary is read from: journal user messages, comments, and
 * attachments that were added. Agent execution events are not part of the story.
 */
export const formatInvestigationStory = ({
  events,
  attachments = [],
}: {
  events: StoryEvent[];
  attachments?: StoryAttachment[];
}): string => {
  const attachmentsById = new Map(attachments.map((attachment) => [attachment.id, attachment]));
  const lines = [...events]
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .flatMap((event) => {
      const line = lineForEvent(event, attachmentsById);
      return line ? [line] : [];
    });
  const story = lines.join('\n\n');
  if (story.length <= STORY_MAX_CHARS) {
    return story;
  }
  return `[earlier timeline omitted]\n${story.slice(story.length - STORY_MAX_CHARS)}`;
};
