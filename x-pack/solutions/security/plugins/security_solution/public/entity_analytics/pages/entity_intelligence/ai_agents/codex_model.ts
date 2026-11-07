/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { googleAdkContextSchema } from '../../../../../common/entity_intelligence/google_adk';
import { createContentRedactor } from '../../../../../common/entity_intelligence/content_redaction';
import type {
  AgentCapturedContent,
  AgentCapturedInput,
  AgentCapturedPrompt,
  AgentCapturedText,
} from '../../../../../common/entity_intelligence/content_redaction';
import { externalAgentSourceKind } from './external_agent_provider';
import type { ExternalAgentProvider } from './external_agent_provider';
import { CODEX_BASELINE_LIMIT } from './codex_queries';
import type { CodexSearchResponse, CodexSession, CodexToolEvent } from './codex_types';

const validIdentityId = (value?: string): value is string =>
  typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,255}$/.test(value);

const validDate = (value?: string): value is string =>
  Boolean(value && Number.isFinite(Date.parse(value)));
const validCount = (value?: number): value is number =>
  value !== undefined && Number.isSafeInteger(value) && value >= 0;

const capturedContent = (content?: AgentCapturedContent): AgentCapturedContent | undefined => {
  if (content?.mode !== 'redacted_local' || content.redaction_version !== 1) return undefined;
  const redactor = createContentRedactor();
  const values = [
    content.title,
    content.input,
    content.output,
    ...(content.prompts ?? []).slice(-50),
  ];
  values.forEach((value) => {
    if (typeof value?.text === 'string') redactor.observe(value.text);
  });
  const text = (
    value: AgentCapturedText | undefined,
    limit: number
  ): AgentCapturedText | undefined => {
    if (
      !value ||
      typeof value.text !== 'string' ||
      typeof value.source !== 'string' ||
      value.source.length > 160 ||
      typeof value.redacted !== 'boolean' ||
      typeof value.truncated !== 'boolean'
    )
      return undefined;
    const filtered = redactor.redact(value.text, limit);
    return {
      ...filtered,
      redacted: value.redacted || filtered.redacted,
      truncated: value.truncated || filtered.truncated,
      source: value.source,
      recordHash: validIdentityId(value.recordHash) ? value.recordHash : undefined,
    };
  };
  const prompts: AgentCapturedPrompt[] = (content.prompts ?? []).slice(-50).flatMap((prompt) => {
    const captured = text(prompt, 4000);
    return captured && validIdentityId(prompt.id) && validDate(prompt.timestamp)
      ? [{ ...captured, id: prompt.id, timestamp: prompt.timestamp }]
      : [];
  });
  const input = text(content.input, 8000);
  const kind = content.input?.kind;
  const capturedInput: AgentCapturedInput | undefined =
    input && (kind === 'command' || kind === 'arguments') ? { ...input, kind } : undefined;
  return {
    mode: 'redacted_local',
    redaction_version: 1,
    title: text(content.title, 240),
    prompts,
    input: capturedInput,
    output: text(content.output, 8000),
    prompts_total: validCount(content.prompts_total) ? content.prompts_total : prompts.length,
    prompts_truncated:
      content.prompts_truncated === true || (content.prompts?.length ?? 0) > prompts.length,
  };
};

/** Uses the recorded title before source-reported agent labels and an opaque-ID fallback. */
export const getCodexSessionTitle = (session: CodexSession): string =>
  session.title?.trim() ||
  session.nickname ||
  session.agentPath?.split('/').filter(Boolean).at(-1) ||
  i18n.translate('xpack.securitySolution.entityAnalytics.intelligence.codex.sessionFallback', {
    defaultMessage: 'Session {id}',
    values: { id: `${session.id.slice(0, 8)}…${session.id.slice(-4)}` },
  });

export const codexTotal = (response: CodexSearchResponse): number =>
  typeof response.hits.total === 'number'
    ? response.hits.total
    : response.hits.total?.value ?? response.hits.hits.length;

export const codexSearchIncomplete = (response: CodexSearchResponse): boolean =>
  Boolean(
    response.timed_out ||
      (response._shards?.failed ?? 0) > 0 ||
      (typeof response.hits.total === 'object' && response.hits.total.relation !== 'eq') ||
      codexTotal(response) > response.hits.hits.length
  );

export const parseCodexSessions = (
  response: CodexSearchResponse,
  spaceId: string,
  provider: ExternalAgentProvider = 'codex'
): CodexSession[] =>
  response.hits.hits.flatMap((hit) => {
    const doc = hit._source;
    if (
      !doc ||
      doc.kibana?.space_id !== spaceId ||
      doc.event?.action !== 'session' ||
      doc.source?.kind !== externalAgentSourceKind(provider) ||
      (provider === 'claude_desktop' &&
        (doc.session?.kind !== 'mcp_connection' || doc.session.is_chat_session !== false)) ||
      (provider === 'google_adk' &&
        (doc.session?.kind !== 'agent_run' || doc.session.is_chat_session !== true)) ||
      !doc.agent?.id ||
      !doc.session?.id ||
      !validDate(doc.session.start) ||
      !validDate(doc.session.last_seen) ||
      Date.parse(doc.session.last_seen) < Date.parse(doc.session.start) ||
      !validCount(doc.session.tool_call_count) ||
      !validCount(doc.session.failure_count) ||
      !validCount(doc.session.success_count) ||
      !validCount(doc.session.unknown_count)
    )
      return [];
    const googleAdk =
      provider === 'google_adk' ? googleAdkContextSchema.safeParse(doc.google_adk) : undefined;
    if (provider === 'google_adk' && !googleAdk?.success) return [];
    const content = capturedContent(doc.content);
    const originalTools = doc.session.tools ?? [];
    const tools = originalTools.filter(
      (tool) =>
        typeof tool.name === 'string' &&
        Boolean(tool.name.trim()) &&
        validCount(tool.count) &&
        validCount(tool.failure_count) &&
        validCount(tool.success_count) &&
        validCount(tool.unknown_count) &&
        tool.count === tool.failure_count + tool.success_count + tool.unknown_count
    );
    const countsMatch =
      tools.length === originalTools.length &&
      tools.reduce((sum, tool) => sum + tool.success_count, 0) === doc.session.success_count &&
      tools.reduce((sum, tool) => sum + tool.failure_count, 0) === doc.session.failure_count &&
      tools.reduce((sum, tool) => sum + tool.unknown_count, 0) === doc.session.unknown_count &&
      tools.reduce((sum, tool) => sum + tool.count, 0) === doc.session.tool_call_count &&
      doc.session.tool_call_count ===
        doc.session.failure_count + doc.session.success_count + doc.session.unknown_count;
    return [
      {
        id: doc.session.id,
        googleAdk: googleAdk?.success ? googleAdk.data : undefined,
        finalResponse: content?.output,
        contentMode: content?.mode ?? 'metadata_only',
        title: content?.title?.text,
        titleSource: content?.title?.source,
        titleRedacted: content?.title?.redacted,
        titleTruncated: content?.title?.truncated,
        prompts: content?.prompts,
        promptsTotal: content?.prompts_total,
        promptsTruncated: content?.prompts_truncated,
        provider,
        agentId: doc.agent.id,
        parentId: doc.session.parent_id,
        runtimeId: doc.session.runtime_id,
        owner:
          provider !== 'google_adk' &&
          doc.owner?.provenance === 'local_os_account' &&
          validIdentityId(doc.owner.id) &&
          typeof doc.owner.name === 'string' &&
          /^[\p{L}\p{N}_.@-]{1,128}$/u.test(doc.owner.name)
            ? {
                id: doc.owner.id,
                name: doc.owner.name,
                provenance: doc.owner.provenance,
              }
            : undefined,
        creator:
          provider !== 'google_adk' &&
          doc.creator?.provenance === 'codex_session_creator' &&
          validIdentityId(doc.creator.id)
            ? {
                id: doc.creator.id,
                accountId: validIdentityId(doc.creator.account_id)
                  ? doc.creator.account_id
                  : undefined,
                provenance: doc.creator.provenance,
              }
            : undefined,
        nickname:
          typeof doc.session.nickname === 'string' &&
          /^[a-zA-Z0-9][a-zA-Z0-9 _-]{0,79}$/.test(doc.session.nickname)
            ? doc.session.nickname
            : undefined,
        role:
          doc.session.role === 'user' ||
          doc.session.role === 'subagent' ||
          doc.session.role === 'guardian_review'
            ? doc.session.role
            : undefined,
        agentPath:
          typeof doc.session.agent_path === 'string' &&
          doc.session.agent_path.length <= 256 &&
          /^\/root(?:\/[a-zA-Z0-9_-]{1,64}){0,12}$/.test(doc.session.agent_path)
            ? doc.session.agent_path
            : undefined,
        start: doc.session.start,
        lastSeen: doc.session.last_seen,
        ingestedAt: doc.event.ingested,
        version: doc.agent.version,
        model: doc.model,
        models: [
          ...new Set([...(doc.session.models ?? []), ...(doc.model ? [doc.model] : [])]),
        ].filter((model) => typeof model === 'string' && Boolean(model.trim())),
        sandbox: doc.sandbox?.mode,
        approval: doc.approval?.policy,
        toolCount: doc.session.tool_call_count,
        modelToolCallCount: validCount(doc.session.model_tool_call_count)
          ? doc.session.model_tool_call_count
          : undefined,
        nativeToolCompletionCount: validCount(doc.session.native_tool_completion_count)
          ? doc.session.native_tool_completion_count
          : undefined,
        failures: doc.session.failure_count,
        successes: doc.session.success_count,
        unknowns: doc.session.unknown_count,
        completedTurns: doc.session.completed_turn_count ?? 0,
        abortedTurns: doc.session.aborted_turn_count ?? 0,
        tools: tools.map(({ name, count, failure_count, success_count, unknown_count }) => ({
          name,
          count,
          failure_count,
          success_count,
          unknown_count,
        })),
        summaryComplete: doc.session.summary_complete === true && countsMatch,
        source: { index: hit._index, id: hit._id },
        fileHash: doc.source.file_hash,
      },
    ];
  });

export const parseCodexTools = (
  response: CodexSearchResponse,
  spaceId: string,
  agentId: string,
  sessionId: string,
  provider: ExternalAgentProvider = 'codex'
): CodexToolEvent[] =>
  response.hits.hits.flatMap((hit) => {
    const doc = hit._source;
    if (
      !doc ||
      doc.kibana?.space_id !== spaceId ||
      doc.agent?.id !== agentId ||
      doc.session?.id !== sessionId ||
      doc.event?.action !== 'tool_call' ||
      !doc.tool?.name?.trim() ||
      !(doc.tool.call?.id || doc.event.id) ||
      doc.source?.kind !== externalAgentSourceKind(provider) ||
      (provider === 'claude_desktop' &&
        (doc.session?.kind !== 'mcp_connection' || doc.session.is_chat_session !== false)) ||
      (provider === 'google_adk' &&
        (doc.session?.kind !== 'agent_run' || doc.session.is_chat_session !== true)) ||
      !validDate(doc['@timestamp'])
    )
      return [];
    const googleAdk =
      provider === 'google_adk' ? googleAdkContextSchema.safeParse(doc.google_adk) : undefined;
    if (provider === 'google_adk' && !googleAdk?.success) return [];
    return [
      {
        googleAdk: googleAdk?.success ? googleAdk.data : undefined,
        id: doc.tool.call?.id || doc.event.id,
        contentMode: doc.content?.mode === 'redacted_local' ? 'redacted_local' : 'metadata_only',
        input: capturedContent(doc.content)?.input,
        output: capturedContent(doc.content)?.output,
        provider,
        sessionId,
        agentId,
        timestamp: doc['@timestamp'],
        toolName: doc.tool.name,
        toolType: doc.tool.type,
        observationType:
          doc.source.observation_type === 'model_tool_call' ||
          doc.source.observation_type === 'native_tool_completion'
            ? doc.source.observation_type
            : undefined,
        model: doc.model,
        sandbox: doc.sandbox?.mode,
        approval: doc.approval?.policy,
        outcome:
          doc.event.outcome === 'success' || doc.event.outcome === 'failure'
            ? doc.event.outcome
            : 'unknown',
        durationMs:
          typeof doc.duration_ms === 'number' &&
          Number.isFinite(doc.duration_ms) &&
          doc.duration_ms >= 0
            ? doc.duration_ms
            : undefined,
        source: { index: hit._index, id: hit._id },
        exitCode: Number.isSafeInteger(doc.process?.exit_code) ? doc.process?.exit_code : undefined,
        turnId: doc.turn?.id,
        recordHash: doc.source.record_hash,
      },
    ];
  });

/** Lists recorded models while retaining a legacy last-observed model when present. */
export const getCodexSessionModels = (session: CodexSession): string[] => [
  ...new Set([...(session.models ?? []), ...(session.model ? [session.model] : [])]),
];

/** Selects earlier sessions with matching single models and recorded roles. */
export const selectCodexBaseline = (
  sessions: CodexSession[],
  selected: CodexSession
): CodexSession[] =>
  sessions
    .filter(
      (session) =>
        Boolean(selected.model) &&
        getCodexSessionModels(selected).length === 1 &&
        getCodexSessionModels(session).length === 1 &&
        session.model === selected.model &&
        session.role === selected.role &&
        (selected.role !== undefined || Boolean(session.parentId) === Boolean(selected.parentId)) &&
        session.agentId === selected.agentId &&
        (session.provider ?? 'codex') === (selected.provider ?? 'codex') &&
        session.id !== selected.id &&
        Date.parse(session.lastSeen) < Date.parse(selected.start)
    )
    .sort((left, right) => Date.parse(right.lastSeen) - Date.parse(left.lastSeen))
    .filter(
      (session, index, eligible) => eligible.findIndex((item) => item.id === session.id) === index
    )
    .slice(0, CODEX_BASELINE_LIMIT);
