/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetadataFieldValue } from '@kbn/agent-builder-common';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { z, lazySchema } from '@kbn/zod/v4';
import {
  collectStoryProposalIds,
  formatInvestigationStory,
  type StoryAttachment,
  type StoryEvent,
  type StoryProposal,
} from './format_story';

const SUMMARY_MAX = 10_000;

const MAX_PROPOSALS_READ = 20;

const SUMMARY_TEMPLATES = new Set(['investigation', 'escalation']);

const OUTPUT_SCHEMA = lazySchema(() =>
  z.object({
    summary: z.string(),
  })
);

export interface InvestigationConversationReader {
  get(conversationId: string): Promise<{
    template_id?: string;
    events?: StoryEvent[];
    attachments?: StoryAttachment[];
  }>;
  patchMetadata(
    conversationId: string,
    updates: Record<string, MetadataFieldValue>,
    options?: { access?: 'owner' | 'converse' }
  ): Promise<unknown>;
}

export interface RunInvestigationSummaryDeps {
  getConversationClient: (request: KibanaRequest) => Promise<InvestigationConversationReader>;
  /** The model the summary is written with; undefined when no connector is available. */
  resolveChatModel: (request: KibanaRequest) => Promise<ScopedModel['chatModel'] | undefined>;
  /** Reads the proposals for the story by id; one that is missing or off-limits is left out. */
  getProposals?: (
    proposalIds: string[],
    spaceId: string,
    request: KibanaRequest
  ) => Promise<Record<string, StoryProposal>>;
  logger?: Logger;
}

export interface InvestigationSummaryResult {
  skipped: boolean;
  reason?: 'template' | 'empty' | 'no_connector' | 'incomplete';
  summary?: string;
}

const clip = (value: string, max: number): string => value.trim().slice(0, max);

const readOutput = (value: unknown): { summary: string } | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const record = value as { summary?: unknown };
  if (typeof record.summary !== 'string') {
    return undefined;
  }
  const summary = clip(record.summary, SUMMARY_MAX);
  if (!summary) {
    return undefined;
  }
  return { summary };
};

const SYSTEM_PROMPT = [
  'Write the short summary an analyst reads when they open a security investigation.',
  'You will receive the story so far: journal notes (User), comments (Comment), attachments that were added, and proposals with their content.',
  'Write in ASD-STE100 Simplified Technical English: short sentences of 20 words or fewer, active voice, one idea per sentence, common words.',
  'Say only what matters: what was detected or found, what was done, and what is proposed.',
  'Describe the outcome of a proposal only when the story says it was decided. Never say that a proposal is pending, awaiting, or waiting.',
  'Leave out IDs, attachment types, and details of how the work was done.',
  'Format: one to three short markdown paragraphs, 120 words at most. You may use **bold** for key rules. Do not use headings, lists, tables, or fenced code blocks.',
  'Wrap every host name, user name, process or file name (for example `schtasks.exe`), IP address, and domain in single backticks, for example `web-01` or `jdoe`. Do not put backticks around anything else.',
  'Never mention the story, the timeline, events, attachments, notes, metadata, or this summary. Never ask for more input. Never say that information is missing or could not be read.',
  'When there is little to tell, write one or two sentences on what the investigation is about and its current step.',
  'Do not invent events, hosts, users, findings, or conclusions that are not in the story.',
].join('\n');

const summarize = async ({
  chatModel,
  story,
  logger,
}: {
  chatModel: ScopedModel['chatModel'];
  story: string;
  logger?: Logger;
}): Promise<unknown> => {
  try {
    return await chatModel
      .withStructuredOutput(OUTPUT_SCHEMA, { name: 'investigation_summary' })
      .invoke([
        ['system', SYSTEM_PROMPT],
        ['human', story],
      ]);
  } catch (error) {
    logger?.warn(
      `AlertZero investigation summary model call failed. ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return undefined;
  }
};

/**
 * Reads the investigation timeline and stores the summary on its metadata.
 * One structured model call, so the run is not appended to the investigation chat.
 */
export const runInvestigationSummary = async ({
  request,
  spaceId,
  conversationId,
  deps,
}: {
  request: KibanaRequest;
  spaceId: string;
  conversationId: string;
  deps: RunInvestigationSummaryDeps;
}): Promise<InvestigationSummaryResult> => {
  const client = await deps.getConversationClient(request);
  const conversation = await client.get(conversationId);
  const templateId = conversation.template_id;
  if (!templateId || !SUMMARY_TEMPLATES.has(templateId)) {
    return { skipped: true, reason: 'template' };
  }

  const proposalIds = collectStoryProposalIds({
    events: conversation.events ?? [],
    attachments: conversation.attachments,
  }).slice(0, MAX_PROPOSALS_READ);
  const proposals =
    deps.getProposals && proposalIds.length > 0
      ? await deps.getProposals(proposalIds, spaceId, request)
      : {};
  const story = formatInvestigationStory({
    events: conversation.events ?? [],
    attachments: conversation.attachments,
    proposals,
  });
  if (!story) {
    return { skipped: true, reason: 'empty' };
  }

  const chatModel = await deps.resolveChatModel(request);
  if (!chatModel) {
    return { skipped: true, reason: 'no_connector' };
  }
  const output = readOutput(await summarize({ chatModel, story, logger: deps.logger }));
  if (!output) {
    return { skipped: true, reason: 'incomplete' };
  }

  await client.patchMetadata(conversationId, { summary: output.summary }, { access: 'converse' });

  return { skipped: false, summary: output.summary };
};
