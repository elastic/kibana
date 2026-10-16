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
import { filter, lastValueFrom } from 'rxjs';
import { formatInvestigationStory, type StoryAttachment, type StoryEvent } from './format_story';

const SUMMARY_MAX = 10_000;

const SUMMARY_TEMPLATES = new Set(['investigation', 'escalation']);

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary'],
  properties: {
    summary: { type: 'string' },
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

const promptFor = (story: string): string =>
  [
    'Read this AlertZero investigation timeline and write the summary.',
    'The timeline is the story: journal notes posted as user messages, comments, and attachments that were added.',
    'Do not invent events, hosts, or conclusions that are not in the timeline.',
    'summary is a few sentences reading that story.',
    'Do not write conversation metadata yourself.',
    '',
    story,
  ].join('\n');

/**
 * Reads the investigation timeline and stores the summary on its metadata.
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

  await client.patchMetadata(conversationId, { summary: output.summary }, { access: 'converse' });

  return { skipped: false, summary: output.summary };
};
