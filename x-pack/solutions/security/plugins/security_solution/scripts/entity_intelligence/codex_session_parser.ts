/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHmac } from 'crypto';
import type {
  AgentCapturedInput,
  AgentCapturedPrompt,
  ContentRedactor,
} from '../../common/entity_intelligence/content_redaction';
import type {
  CodexLocalOwner,
  CodexObservation,
  CodexOutcome,
  CodexSessionCreator,
  CodexSessionRole,
  CodexToolSummary,
} from './codex_session_types';

type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
interface JsonObject {
  [key: string]: JsonValue;
}

const object = (value: JsonValue | undefined): JsonObject | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
const identifier = (value: JsonValue | undefined): string | undefined =>
  typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,255}$/.test(value)
    ? value
    : undefined;
const timestamp = (value: JsonValue | undefined): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const millis = Date.parse(value);
  return Number.isFinite(millis) ? new Date(millis).toISOString() : undefined;
};
const finite = (value: JsonValue | undefined): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

export const CODEX_PARSER_REVISION = 8;

export interface CodexParserOptions {
  agentId: string;
  owner?: CodexLocalOwner;
  spaceId: string;
  fileHash: string;
  hashSalt: string;
  expectedSessionId?: string;
  ingestedAt: string;
  maxToolCalls?: number;
  contentRedactor?: ContentRedactor;
  title?: string;
}

export interface CodexParseResult {
  observations: CodexObservation[];
  malformedLines: number;
  excludedInheritedRecords: number;
  summaryComplete: boolean;
}

export interface CodexSessionParser {
  consume: (line: string) => void;
  finalize: () => CodexParseResult;
  markIncomplete: () => void;
}

/** Creates a stable salted fingerprint without exporting the underlying local value. */
export const codexHash = (salt: string, value: string): string =>
  createHmac('sha256', salt).update(value).digest('hex');

/** Projects observed metadata and optionally redacted, bounded user prompts and tool inputs. */
export const createCodexSessionParser = (options: CodexParserOptions): CodexSessionParser => {
  let sessionId: string | undefined;
  let runtimeId: string | undefined;
  let parentId: string | undefined;
  let nickname: string | undefined;
  let role: CodexSessionRole | undefined;
  let agentPath: string | undefined;
  let creator: CodexSessionCreator | undefined;
  let version: string | undefined;
  let started: string | undefined;
  let lastSeen: string | undefined;
  let model: string | undefined;
  let sandbox: string | undefined;
  let approval: string | undefined;
  let turnId: string | undefined;
  let malformedLines = 0;
  let excludedInheritedRecords = 0;
  let complete = true;
  const models = new Set<string>();
  const completedTurns = new Set<string>();
  const abortedTurns = new Set<string>();
  const calls = new Map<string, CodexObservation>();
  const maxCalls = options.maxToolCalls ?? 50_000;
  const prompts = new Map<string, AgentCapturedPrompt>();
  const promptIds = new Set<string>();
  const recordPrompt = (
    id: string,
    text: string,
    at: string,
    line: string,
    source: string
  ): void => {
    if (!options.contentRedactor || !text.trim() || promptIds.has(id)) return;
    promptIds.add(id);
    prompts.set(id, {
      id,
      timestamp: at,
      ...options.contentRedactor.redact(text, 4000),
      source,
      recordHash: codexHash(options.hashSalt, line),
    });
    if (prompts.size > 50) {
      const first = prompts.keys().next().value;
      if (first) prompts.delete(first);
    }
  };

  const common = (at: string): CodexObservation => ({
    '@timestamp': at,
    content: { mode: options.contentRedactor ? 'redacted_local' : 'metadata_only' },
    event: {
      id: '',
      dataset: 'codex.session',
      action: 'tool_call',
      outcome: 'unknown',
      ingested: options.ingestedAt,
    },
    agent: { id: options.agentId, name: 'Codex', type: 'codex', ...(version ? { version } : {}) },
    ...(options.owner
      ? {
          owner: {
            id: options.owner.id,
            name: options.owner.name,
            provenance: options.owner.provenance,
          },
        }
      : {}),
    ...(creator ? { creator: { ...creator } } : {}),
    session: {
      id: sessionId ?? '',
      ...(nickname ? { nickname } : {}),
      ...(role ? { role } : {}),
      ...(agentPath ? { agent_path: agentPath } : {}),
      ...(runtimeId ? { runtime_id: runtimeId } : {}),
      ...(parentId ? { parent_id: parentId } : {}),
    },
    ...(turnId ? { turn: { id: turnId } } : {}),
    ...(model ? { model } : {}),
    ...(sandbox ? { sandbox: { mode: sandbox } } : {}),
    ...(approval ? { approval: { policy: approval } } : {}),
    source: { kind: 'codex_local_session', file_hash: options.fileHash, schema_version: 1 },
    kibana: { space_id: options.spaceId },
  });

  const recordCall = ({
    id,
    name,
    type,
    at,
    line,
    outcome = 'unknown',
    exitCode,
    duration,
    idKind,
    input,
  }: {
    id: string;
    name: string;
    type: string;
    at: string;
    line: string;
    outcome?: CodexOutcome;
    exitCode?: number;
    duration?: number;
    idKind: 'item' | 'call';
    input?: { text: string; kind: AgentCapturedInput['kind']; source: string };
  }): void => {
    const previous = calls.get(id);
    if (!previous && calls.size >= maxCalls) {
      complete = false;
      return;
    }
    const doc = previous ?? common(at);
    // Native completion records carry stronger evidence than response-call placeholders.
    if (!previous || idKind === 'item') {
      doc['@timestamp'] = at;
      doc.tool = { name, call: { id }, type };
      doc.source.observation_type =
        idKind === 'item' ? 'native_tool_completion' : 'model_tool_call';
      doc.source.record_hash = codexHash(options.hashSalt, line);
    }
    if (input && options.contentRedactor && (!doc.content?.input || idKind === 'item')) {
      doc.content = {
        mode: 'redacted_local',
        redaction_version: 1,
        input: {
          ...options.contentRedactor.redact(input.text, 8000),
          kind: input.kind,
          source: input.source,
          recordHash: codexHash(options.hashSalt, line),
        },
      };
    }
    if (outcome !== 'unknown') doc.event.outcome = outcome;
    if (exitCode !== undefined) doc.process = { exit_code: exitCode };
    if (duration !== undefined && duration >= 0) doc.duration_ms = duration;
    doc.event.id = codexHash(options.hashSalt, `${options.agentId}:${sessionId}:tool:${id}`);
    doc.source.id_kind = previous?.source.id_kind === 'call' ? 'call' : idKind;
    calls.set(id, doc);
  };

  const consume = (line: string): void => {
    if (!line.trim()) return;
    if (Buffer.byteLength(line) > 2 * 1024 * 1024) {
      complete = false;
      malformedLines++;
      return;
    }
    let value: JsonValue;
    try {
      value = JSON.parse(line);
    } catch {
      complete = false;
      malformedLines++;
      return;
    }
    const record = object(value);
    const payload = object(record?.payload);
    const at = timestamp(record?.timestamp);
    if (!record || !payload || !at) {
      complete = false;
      malformedLines++;
      return;
    }

    if (record.type === 'session_meta') {
      const id = identifier(payload.id);
      if (
        !id ||
        (options.expectedSessionId && id !== options.expectedSessionId) ||
        (sessionId && id !== sessionId)
      ) {
        excludedInheritedRecords++;
        return;
      }
      if (sessionId) return;
      sessionId = id;
      runtimeId = identifier(payload.session_id);
      parentId = identifier(payload.parent_thread_id);
      nickname =
        typeof payload.agent_nickname === 'string' &&
        /^[a-zA-Z0-9][a-zA-Z0-9 _-]{0,79}$/.test(payload.agent_nickname)
          ? payload.agent_nickname
          : undefined;
      role =
        payload.thread_source === 'user' ||
        payload.thread_source === 'subagent' ||
        payload.thread_source === 'guardian_review'
          ? payload.thread_source
          : undefined;
      agentPath =
        typeof payload.agent_path === 'string' &&
        payload.agent_path.length <= 256 &&
        /^\/root(?:\/[a-zA-Z0-9_-]{1,64}){0,12}$/.test(payload.agent_path)
          ? payload.agent_path
          : undefined;
      const creatorId = identifier(payload.creator_user_id);
      const creatorAccountId = identifier(payload.creator_account_id);
      if (creatorId) {
        creator = {
          id: creatorId,
          ...(creatorAccountId ? { account_id: creatorAccountId } : {}),
          provenance: 'codex_session_creator',
        };
      }
      version = identifier(payload.cli_version);
      started = timestamp(payload.timestamp) ?? at;
      lastSeen = started;
      return;
    }
    if (!sessionId || !started) return;
    if (
      at < started ||
      (typeof payload.thread_id === 'string' && payload.thread_id !== sessionId)
    ) {
      excludedInheritedRecords++;
      return;
    }
    if (!lastSeen || at > lastSeen) lastSeen = at;
    if (record.type === 'turn_context') {
      turnId = identifier(payload.turn_id);
      model = identifier(payload.model);
      if (model) models.add(model);
      const policy = object(payload.sandbox_policy);
      sandbox = identifier(policy?.type ?? payload.sandbox_policy);
      approval = identifier(payload.approval_policy);
      return;
    }
    if (record.type === 'event_msg') {
      const eventTurnId = identifier(payload.turn_id);
      if (payload.type === 'task_started' && eventTurnId) turnId = eventTurnId;
      if (payload.type === 'task_complete' && eventTurnId) completedTurns.add(eventTurnId);
      if (payload.type === 'turn_aborted' && eventTurnId) abortedTurns.add(eventTurnId);
      if (payload.type === 'user_message' && typeof payload.message === 'string') {
        recordPrompt(
          codexHash(options.hashSalt, line),
          payload.message,
          at,
          line,
          'event_msg.user_message'
        );
      }
      if (payload.type !== 'item_completed') return;
      const item = object(payload.item);
      const type = identifier(item?.type);
      const id = identifier(item?.id);
      if (!item || !id || !type) {
        complete = false;
        return;
      }
      if (type === 'UserMessage' && Array.isArray(item.content)) {
        const text = item.content
          .flatMap((part) => {
            const content = object(part);
            return content?.type === 'text' && typeof content.text === 'string'
              ? [content.text]
              : [];
          })
          .join('\n');
        recordPrompt(id, text, at, line, 'item_completed.UserMessage');
        return;
      }
      let input: { text: string; kind: AgentCapturedInput['kind']; source: string } | undefined;
      let name: string | undefined;
      let outcome: CodexOutcome = 'unknown';
      let exitCode: number | undefined;
      if (type === 'CommandExecution') {
        name = 'exec_command';
        if (Array.isArray(item.command) && item.command.every((part) => typeof part === 'string'))
          input = {
            text: JSON.stringify(item.command, null, 2),
            kind: 'command',
            source: 'item_completed.CommandExecution.command',
          };
        const exit = finite(item.exit_code);
        if (exit !== undefined && Number.isInteger(exit)) {
          exitCode = exit;
          outcome = exit === 0 ? 'success' : 'failure';
        }
      } else if (type === 'McpToolCall') {
        if (item.arguments !== undefined)
          input = {
            text: JSON.stringify(item.arguments, null, 2),
            kind: 'arguments',
            source: 'item_completed.McpToolCall.arguments',
          };
        const server = identifier(item.server);
        const tool = identifier(item.tool);
        if (tool) name = server ? `${server}.${tool}` : tool;
        const result = object(item.result);
        if (typeof result?.isError === 'boolean') outcome = result.isError ? 'failure' : 'success';
      } else if (type === 'FileChange') {
        name = 'apply_patch';
        if (item.status === 'completed') outcome = 'success';
        if (item.status === 'failed') outcome = 'failure';
      } else if (type === 'Extension') {
        name = identifier(item.kind);
      } else if (type === 'CollabAgentToolCall') {
        name = identifier(item.tool);
      } else if (type === 'ImageView') {
        name = 'view_image';
      } else {
        if (/Tool|Call|Execution/.test(type)) complete = false;
        return;
      }
      if (!name) {
        complete = false;
        return;
      }
      const elapsed = object(item.duration);
      const secs = finite(elapsed?.secs);
      const nanos = finite(elapsed?.nanos);
      const duration =
        secs !== undefined && nanos !== undefined && secs >= 0 && nanos >= 0 && nanos < 1e9
          ? secs * 1000 + nanos / 1e6
          : finite(item.durationMs);
      recordCall({ id, name, type, at, line, outcome, exitCode, duration, idKind: 'item', input });
      return;
    }
    if (record.type !== 'response_item') return;
    const id = identifier(payload.call_id);
    if (!id) return;
    if (payload.type === 'function_call' || payload.type === 'custom_tool_call') {
      const name = identifier(payload.name);
      if (!name) {
        complete = false;
        return;
      }
      const inputValue = payload.type === 'function_call' ? payload.arguments : payload.input;
      recordCall({
        id,
        name,
        type: payload.type,
        at,
        line,
        idKind: 'call',
        input:
          typeof inputValue === 'string'
            ? {
                text: inputValue,
                kind: 'arguments',
                source: `response_item.${payload.type}`,
              }
            : undefined,
      });
    }
    // Output text is deliberately never inspected or interpreted as success/failure.
  };

  const finalize = (): CodexParseResult => {
    if (!sessionId || !started || !lastSeen) {
      return { observations: [], malformedLines, excludedInheritedRecords, summaryComplete: false };
    }
    const toolCalls = [...calls.values()].sort((left, right) =>
      left['@timestamp'].localeCompare(right['@timestamp'])
    );
    const tools = new Map<string, CodexToolSummary>();
    const counts = { success: 0, failure: 0, unknown: 0 };
    for (const call of toolCalls) {
      counts[call.event.outcome]++;
      const name = call.tool?.name ?? '';
      const summary = tools.get(name) ?? {
        name,
        count: 0,
        success_count: 0,
        failure_count: 0,
        unknown_count: 0,
      };
      summary.count++;
      summary[`${call.event.outcome}_count`]++;
      tools.set(name, summary);
    }
    const summary = common(started);
    summary.event.action = 'session';
    summary.event.id = codexHash(options.hashSalt, `${options.agentId}:${sessionId}:session`);
    summary.session = {
      ...summary.session,
      start: started,
      last_seen: lastSeen,
      completed: false,
      completion_known: false,
      summary_complete: complete,
      tool_call_count: toolCalls.length,
      model_tool_call_count: toolCalls.filter(
        (call) => call.source.observation_type === 'model_tool_call'
      ).length,
      native_tool_completion_count: toolCalls.filter(
        (call) => call.source.observation_type === 'native_tool_completion'
      ).length,
      success_count: counts.success,
      failure_count: counts.failure,
      unknown_count: counts.unknown,
      completed_turn_count: completedTurns.size,
      aborted_turn_count: abortedTurns.size,
      models: [...models].sort(),
      tools: [...tools.values()].sort((left, right) => left.name.localeCompare(right.name)),
    };
    if (options.contentRedactor) {
      summary.content = {
        mode: 'redacted_local',
        redaction_version: 1,
        ...(options.title
          ? {
              title: {
                ...options.contentRedactor.redact(options.title, 240),
                source: 'codex_state.threads.title',
              },
            }
          : {}),
        prompts: [...prompts.values()],
        prompts_total: promptIds.size,
        prompts_truncated: promptIds.size > prompts.size,
      };
    }
    delete summary.turn;
    return {
      observations: [summary, ...toolCalls],
      malformedLines,
      excludedInheritedRecords,
      summaryComplete: complete,
    };
  };

  return {
    consume,
    finalize,
    markIncomplete: (): void => {
      complete = false;
    },
  };
};
