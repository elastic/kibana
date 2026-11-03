/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineEventType } from '@kbn/agent-builder-common';
import { PROPOSAL_ATTACHMENT_TYPE, isTerminal, proposalStatusSchema } from '@kbn/proposals-common';

const TEXT_NOTE = 'text_note';
const STORY_MAX_CHARS = 16_000;
const PROPOSAL_COMMENT_MAX_CHARS = 1_500;

export interface StoryEvent {
  type: string;
  created_at: string;
  data?: unknown;
}

export interface StoryAttachment {
  id: string;
  type: string;
  origin?: string;
  description?: string;
  hidden?: boolean;
  active?: boolean;
  versions?: Array<{ version: number; data?: unknown }>;
  current_version?: number;
}

export interface StoryProposal {
  title: string;
  status: string;
  decision?: string;
  comment?: string;
  supersededBy?: string;
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

const currentData = (attachment: StoryAttachment): Record<string, unknown> | undefined => {
  const current = attachment.versions?.find(
    (version) => version.version === attachment.current_version
  );
  return asRecord(current?.data ?? attachment.versions?.[attachment.versions.length - 1]?.data);
};

const proposalIdOf = (attachment: StoryAttachment): string | undefined => {
  if (
    attachment.type !== PROPOSAL_ATTACHMENT_TYPE ||
    attachment.hidden ||
    attachment.active === false
  ) {
    return undefined;
  }
  return attachment.origin ?? stringField(currentData(attachment), 'proposalId');
};

/** Ids of the visible proposal attachments, whose content the story reads. */
export const collectProposalIds = (attachments: StoryAttachment[] = []): string[] => {
  const ids = attachments.flatMap((attachment) => {
    const id = proposalIdOf(attachment);
    return id ? [id] : [];
  });
  return [...new Set(ids)];
};

/** Ids of the proposals the story tells, which are the ones an attachment event added. */
export const collectStoryProposalIds = ({
  events,
  attachments = [],
}: {
  events: StoryEvent[];
  attachments?: StoryAttachment[];
}): string[] => {
  const addedIds = new Set(
    events.flatMap((event) => {
      const id =
        event.type === TimelineEventType.attachmentAdded
          ? stringField(asRecord(event.data), 'attachment_id')
          : undefined;
      return id ? [id] : [];
    })
  );
  return collectProposalIds(attachments.filter(({ id }) => addedIds.has(id)));
};

const isSuperseded = (proposal: StoryProposal): boolean =>
  proposal.supersededBy !== undefined || proposal.status === 'superseded';

const isTerminalStatus = (status: string): boolean => {
  const parsed = proposalStatusSchema.safeParse(status);
  return parsed.success && isTerminal(parsed.data);
};

const formatProposal = (proposal: StoryProposal): string => {
  const details = [
    proposal.decision || isTerminalStatus(proposal.status) ? `status: ${proposal.status}` : '',
    proposal.decision ? `decision: ${proposal.decision}` : '',
  ].filter(Boolean);
  const header =
    details.length > 0
      ? `Proposal: ${proposal.title} (${details.join(', ')})`
      : `Proposal: ${proposal.title}`;
  const comment = proposal.comment?.trim().slice(0, PROPOSAL_COMMENT_MAX_CHARS);
  return comment ? `${header}\n${comment}` : header;
};

const attachmentLabel = (attachment: StoryAttachment | undefined): string | undefined => {
  if (!attachment) {
    return undefined;
  }
  if (attachment.description?.trim()) {
    return attachment.description.trim();
  }
  const data = currentData(attachment);
  return stringField(data, 'title') ?? stringField(data, 'summary') ?? stringField(data, 'name');
};

const lineForEvent = (
  event: StoryEvent,
  attachmentsById: Map<string, StoryAttachment>,
  proposalsById: Map<string, StoryProposal>
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
    const proposalId = attachment ? proposalIdOf(attachment) : undefined;
    const proposal = proposalId ? proposalsById.get(proposalId) : undefined;
    if (proposal) {
      return isSuperseded(proposal) ? undefined : formatProposal(proposal);
    }
    const label = attachmentLabel(attachment);
    return label ? `Attachment added (${type}): ${label}` : `Attachment added (${type})`;
  }
  return undefined;
};

/**
 * The investigation story a summary is read from: journal user messages, comments, and
 * attachments that were added, with the content of proposals when it is available. Agent execution
 * events are not part of the story.
 */
export const formatInvestigationStory = ({
  events,
  attachments = [],
  proposals = {},
}: {
  events: StoryEvent[];
  attachments?: StoryAttachment[];
  /** Proposal content by proposal id; a proposal missing here is told by its label. */
  proposals?: Record<string, StoryProposal>;
}): string => {
  const attachmentsById = new Map(attachments.map((attachment) => [attachment.id, attachment]));
  const proposalsById = new Map(Object.entries(proposals));
  const lines = [...events]
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .flatMap((event) => {
      const line = lineForEvent(event, attachmentsById, proposalsById);
      return line ? [line] : [];
    });
  const story = lines.join('\n\n');
  if (story.length <= STORY_MAX_CHARS) {
    return story;
  }
  return `[earlier timeline omitted]\n${story.slice(story.length - STORY_MAX_CHARS)}`;
};
