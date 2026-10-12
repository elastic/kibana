/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AgentExecutionMode,
  createNonInteractiveConfig,
  isMessageCompleteEvent,
  type MetadataFieldValue,
} from '@kbn/agent-builder-common';
import type { ExecuteAgentParams, ExecuteAgentResult } from '@kbn/agent-builder-server';
import type { KibanaRequest } from '@kbn/core/server';
import { INVESTIGATION_DESCRIPTION_MAX_LENGTH } from '@kbn/alertzero-common';
import { filter, lastValueFrom } from 'rxjs';
import { formatInvestigationStory, type StoryAttachment, type StoryEvent } from './format_story';

const SUMMARY_MAX = 10_000;

const SUMMARY_TEMPLATES = new Set(['investigation', 'escalation']);

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'description'],
  properties: {
    summary: {
      type: 'string',
      description:
        'The story of the investigation so far, told in order as a short paragraph of several sentences.',
    },
    description: {
      type: 'string',
      maxLength: INVESTIGATION_DESCRIPTION_MAX_LENGTH,
      description: `A one-line headline of the story, at most ${INVESTIGATION_DESCRIPTION_MAX_LENGTH} characters.`,
    },
  },
};

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
  executeAgent: (params: ExecuteAgentParams) => Promise<ExecuteAgentResult>;
  resolveConnectorId?: (request: KibanaRequest) => Promise<string | undefined>;
}

export interface InvestigationSummaryResult {
  skipped: boolean;
  reason?: 'template' | 'empty' | 'incomplete';
  summary?: string;
  description?: string;
}

const clip = (value: string, max: number): string => value.trim().slice(0, max);

/** One line, cut at a word boundary, ending in an ellipsis when it had to be cut. */
const clipDescription = (value: string): string => {
  const line = value.replace(/\s+/g, ' ').trim();
  if (line.length <= INVESTIGATION_DESCRIPTION_MAX_LENGTH) {
    return line;
  }
  const cut = line.slice(0, INVESTIGATION_DESCRIPTION_MAX_LENGTH - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s.,;:]+$/, '')}…`;
};

const readOutput = (value: unknown): { summary: string; description?: string } | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const record = value as { summary?: unknown; description?: unknown };
  if (typeof record.summary !== 'string') {
    return undefined;
  }
  const summary = clip(record.summary, SUMMARY_MAX);
  if (!summary) {
    return undefined;
  }
  const description =
    typeof record.description === 'string' ? clipDescription(record.description) : '';
  return { summary, ...(description ? { description } : {}) };
};

const promptFor = (story: string): string =>
  [
    'Read this AlertZero investigation timeline and write two things: the summary and the description.',
    'The timeline is the story: journal notes posted as user messages, comments, and attachments that were added.',
    'Do not invent events, hosts, or conclusions that are not in the timeline.',
    '',
    'summary: tell the story of the investigation so far, in the order it happened, as one short paragraph of about four to eight sentences.',
    'Cover what raised it, what was looked at and found, what was done or decided and by whom when the timeline says so, and where things stand now.',
    'Use plain prose, no markdown and no bullet points. Be specific: name the rules, hosts, users and actions the timeline names.',
    'The summary is the full account and has no character limit.',
    '',
    `description: after the summary, write a one-line headline of that story, at most ${INVESTIGATION_DESCRIPTION_MAX_LENGTH} characters, no markdown and no line breaks. The limit applies to the description only, never to the summary.`,
    '',
    'Do not write conversation metadata yourself.',
    '',
    story,
  ].join('\n');

/**
 * Reads the investigation timeline and stores the summary and one-line description on its metadata.
 * Standalone, so the run is not appended to the investigation chat.
 */
export const runInvestigationSummary = async ({
  request,
  conversationId,
  deps,
}: {
  request: KibanaRequest;
  conversationId: string;
  deps: RunInvestigationSummaryDeps;
}): Promise<InvestigationSummaryResult> => {
  const client = await deps.getConversationClient(request);
  const conversation = await client.get(conversationId);
  const templateId = conversation.template_id;
  if (!templateId || !SUMMARY_TEMPLATES.has(templateId)) {
    return { skipped: true, reason: 'template' };
  }

  const story = formatInvestigationStory({
    events: conversation.events ?? [],
    attachments: conversation.attachments,
  });
  if (!story) {
    return { skipped: true, reason: 'empty' };
  }

  const connectorId = await deps.resolveConnectorId?.(request);
  const { events$ } = await deps.executeAgent({
    request,
    mode: AgentExecutionMode.standalone,
    useTaskManager: false,
    interactive: createNonInteractiveConfig(),
    params: {
      ...(connectorId ? { connectorId } : {}),
      structuredOutput: true,
      outputSchema: OUTPUT_SCHEMA,
      nextInput: { message: promptFor(story) },
    },
  });

  const completed = await lastValueFrom(events$.pipe(filter(isMessageCompleteEvent)), {
    defaultValue: undefined,
  });
  const output = readOutput(completed?.data.structured_output);
  if (!output) {
    return { skipped: true, reason: 'incomplete' };
  }

  const { summary, description } = output;
  await client.patchMetadata(
    conversationId,
    { summary, ...(description ? { description } : {}) },
    { access: 'converse' }
  );

  return { skipped: false, summary, ...(description ? { description } : {}) };
};
