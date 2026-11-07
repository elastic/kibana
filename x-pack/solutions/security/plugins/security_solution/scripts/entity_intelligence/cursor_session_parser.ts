/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContentRedactor } from '../../common/entity_intelligence/content_redaction';
import type {
  AgentCapturedContent,
  AgentCapturedPrompt,
} from '../../common/entity_intelligence/content_redaction';
import { codexHash } from './codex_session_parser';
import type { CodexLocalOwner, CodexObservation, CodexToolSummary } from './codex_session_types';

export interface CursorHeader {
  composerId: string;
  name?: string;
  createdAt?: number;
  lastUpdatedAt?: number;
  isDraft?: boolean;
  isSubagent?: boolean;
  subagentInfo?: { parentComposerId?: string };
}

export interface CursorComposer {
  composerId?: string;
  name?: string;
  createdAt?: number;
  lastUpdatedAt?: number;
  fullConversationHeadersOnly?: Array<{ bubbleId?: string; type?: number }>;
  subagentInfo?: { parentComposerId?: string };
}

interface CursorToolParams {
  command?: string;
}
interface CursorToolResult {
  exitCode?: number;
  exit_code?: number;
  success?: boolean;
  isError?: boolean;
}
export interface CursorBubble {
  bubbleId?: string;
  type?: number;
  createdAt?: string;
  text?: string;
  modelInfo?: { modelName?: string };
  toolFormerData?: {
    name?: string;
    toolCallId?: string;
    status?: string;
    rawArgs?: string;
    params?: string;
    result?: string;
  };
}
export type CursorObservation = Omit<CodexObservation, 'agent' | 'event' | 'source' | 'content'> & {
  event: Omit<CodexObservation['event'], 'dataset'> & { dataset: 'cursor.session' };
  agent: { id: string; name: 'Cursor'; type: 'cursor'; version?: string };
  content?: AgentCapturedContent;
  source: Omit<CodexObservation['source'], 'kind'> & { kind: 'cursor_local_session' };
};

export interface CursorParserContext {
  agentId: string;
  spaceId: string;
  hashSalt: string;
  fileHash: string;
  ingestedAt: string;
  owner?: CodexLocalOwner;
  version?: string;
  complete: boolean;
}

const validDate = (value?: string): value is string =>
  Boolean(value && Number.isFinite(Date.parse(value)));
const numericDate = (value?: number): string | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 8_640_000_000_000_000
    ? new Date(value).toISOString()
    : undefined;
const readParams = (text?: string): CursorToolParams => {
  if (!text || text.length > 256_000) return {};
  try {
    const result: CursorToolParams = JSON.parse(text);
    return result && typeof result === 'object' ? result : {};
  } catch {
    return {};
  }
};
const readResult = (text?: string): CursorToolResult => {
  if (!text || text.length > 256_000) return {};
  try {
    const result: CursorToolResult = JSON.parse(text);
    return result && typeof result === 'object' ? result : {};
  } catch {
    return {};
  }
};

/** Normalizes recorded Cursor bubbles without treating a completed request as a successful tool execution. */
export const parseCursorSession = (
  header: CursorHeader,
  composer: CursorComposer,
  bubbles: readonly CursorBubble[],
  context: CursorParserContext
): CursorObservation[] => {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(header.composerId) || header.isDraft) return [];
  const redactor = createContentRedactor();
  const title = header.name ?? composer.name;
  if (title) redactor.observe(title);
  for (const bubble of bubbles) {
    if (bubble.type === 1 && typeof bubble.text === 'string') redactor.observe(bubble.text);
    for (const value of [
      bubble.toolFormerData?.rawArgs,
      bubble.toolFormerData?.params,
      bubble.toolFormerData?.result,
    ]) {
      if (typeof value === 'string') redactor.observe(value);
    }
  }
  const timestamps = bubbles.flatMap((bubble) =>
    validDate(bubble.createdAt) ? [bubble.createdAt] : []
  );
  const created = numericDate(header.createdAt ?? composer.createdAt);
  const start = created ?? timestamps.slice().sort()[0];
  const lastSeen = timestamps.slice().sort().pop();
  if (!start || !lastSeen || Date.parse(lastSeen) < Date.parse(start)) return [];
  const parentId = header.subagentInfo?.parentComposerId ?? composer.subagentInfo?.parentComposerId;
  const parent =
    parentId && /^[a-zA-Z0-9_-]{1,128}$/.test(parentId) && parentId !== header.composerId
      ? parentId
      : undefined;
  const base = {
    agent: {
      id: context.agentId,
      name: 'Cursor' as const,
      type: 'cursor' as const,
      version: context.version,
    },
    owner: context.owner,
    session: {
      id: header.composerId,
      parent_id: parent,
      role: parent || header.isSubagent ? ('subagent' as const) : ('user' as const),
    },
    kibana: { space_id: context.spaceId },
  };
  const source = {
    kind: 'cursor_local_session' as const,
    file_hash: context.fileHash,
    schema_version: 1 as const,
  };
  const observations: CursorObservation[] = [];
  const tools = new Map<string, CodexToolSummary>();
  const seen = new Set<string>();
  let complete = context.complete;
  const models = new Set<string>();
  let lastModel: string | undefined;
  let lastModelAt = 0;
  const prompts: AgentCapturedPrompt[] = [];
  let promptsTotal = 0;
  const ordered = [...bubbles].sort(
    (a, b) => (Date.parse(a.createdAt ?? '') || 0) - (Date.parse(b.createdAt ?? '') || 0)
  );
  for (const bubble of ordered) {
    if (!bubble.bubbleId || seen.has(bubble.bubbleId)) {
      complete = false;
    } else {
      seen.add(bubble.bubbleId);
      const timestamp = validDate(bubble.createdAt) ? bubble.createdAt : undefined;
      const model = bubble.modelInfo?.modelName;
      if (typeof model === 'string' && /^[a-zA-Z0-9_.:/-]{1,160}$/.test(model)) {
        models.add(model);
        if (timestamp && Date.parse(timestamp) >= lastModelAt) {
          lastModel = model;
          lastModelAt = Date.parse(timestamp);
        }
      }
      if (bubble.type === 1 && typeof bubble.text === 'string' && bubble.text.trim()) {
        promptsTotal++;
        if (timestamp)
          prompts.push({
            id: bubble.bubbleId,
            timestamp,
            source: 'cursor.user_bubble.text',
            ...redactor.redact(bubble.text, 8000),
          });
      }
      const tool = bubble.toolFormerData;
      if (tool) {
        if (
          !timestamp ||
          typeof tool.name !== 'string' ||
          !/^[a-zA-Z0-9_.:/-]{1,256}$/.test(tool.name)
        ) {
          complete = false;
        } else {
          const result = readResult(tool.result);
          const exitCode = Number.isSafeInteger(result.exitCode)
            ? result.exitCode
            : Number.isSafeInteger(result.exit_code)
            ? result.exit_code
            : undefined;
          const outcome =
            tool.status === 'error' ||
            result.isError === true ||
            result.success === false ||
            (exitCode !== undefined && exitCode !== 0)
              ? 'failure'
              : result.success === true || exitCode === 0
              ? 'success'
              : 'unknown';
          const summary = tools.get(tool.name) ?? {
            name: tool.name,
            count: 0,
            failure_count: 0,
            success_count: 0,
            unknown_count: 0,
          };
          summary.count++;
          summary[`${outcome}_count`]++;
          tools.set(tool.name, summary);
          const params = readParams(tool.params);
          const command = typeof params.command === 'string' ? params.command : undefined;
          const input =
            command ??
            (typeof tool.rawArgs === 'string' && tool.rawArgs.trim() ? tool.rawArgs : tool.params);
          observations.push({
            ...base,
            '@timestamp': timestamp,
            event: {
              id: codexHash(
                context.hashSalt,
                `cursor:${context.agentId}:${header.composerId}:${bubble.bubbleId}`
              ),
              dataset: 'cursor.session',
              action: 'tool_call',
              outcome,
              ingested: context.ingestedAt,
            },
            tool: {
              name: tool.name,
              call: { id: tool.toolCallId || bubble.bubbleId },
              type: 'cursor_recorded_tool',
            },
            model:
              typeof model === 'string' && /^[a-zA-Z0-9_.:/-]{1,160}$/.test(model)
                ? model
                : undefined,
            process: exitCode === undefined ? undefined : { exit_code: exitCode },
            content: input
              ? {
                  mode: 'redacted_local',
                  redaction_version: 1,
                  input: {
                    ...redactor.redact(input, 8000),
                    source: command ? 'cursor.tool.params.command' : 'cursor.tool.arguments',
                    kind: command ? 'command' : 'arguments',
                  },
                }
              : undefined,
            source: {
              ...source,
              observation_type: 'model_tool_call',
              record_hash: codexHash(context.hashSalt, JSON.stringify(bubble)),
              id_kind: 'call',
            },
          });
        }
      }
    }
  }
  const toolSummaries = [...tools.values()];
  observations.push({
    ...base,
    '@timestamp': lastSeen,
    event: {
      id: codexHash(context.hashSalt, `cursor:${context.agentId}:${header.composerId}:session`),
      dataset: 'cursor.session',
      action: 'session',
      outcome: 'unknown',
      ingested: context.ingestedAt,
    },
    session: {
      ...base.session,
      start,
      last_seen: lastSeen,
      completed: false,
      completion_known: false,
      summary_complete: complete,
      tool_call_count: observations.length,
      model_tool_call_count: observations.length,
      success_count: toolSummaries.reduce((sum, item) => sum + item.success_count, 0),
      failure_count: toolSummaries.reduce((sum, item) => sum + item.failure_count, 0),
      unknown_count: toolSummaries.reduce((sum, item) => sum + item.unknown_count, 0),
      tools: toolSummaries,
      models: [...models],
    },
    model: lastModel,
    content: {
      mode: 'redacted_local',
      redaction_version: 1,
      title: title ? { ...redactor.redact(title, 240), source: 'cursor.composer.name' } : undefined,
      prompts: prompts.slice(-50),
      prompts_total: promptsTotal,
      prompts_truncated: promptsTotal > Math.min(prompts.length, 50) || !complete,
    },
    source,
  });
  return observations;
};
