/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { resolve } from 'path';
import { z } from '@kbn/zod';
import { createContentRedactor } from '../../common/entity_intelligence/content_redaction';
import type {
  AgentCapturedContent,
  AgentCapturedText,
} from '../../common/entity_intelligence/content_redaction';
import { codexHash } from './codex_session_parser';
import type { CodexLocalOwner, CodexObservation, CodexToolSummary } from './codex_session_types';

export const CLAUDE_DESKTOP_FIXTURE_PATH = resolve(
  __dirname,
  '../../../../../../..',
  'data/entity_intelligence/ei-demo-sensitive/customer_records.txt'
);
export const CLAUDE_DESKTOP_PARSER_REVISION = 2;
const digest = (value: string): string => createHash('sha256').update(value).digest('hex');
const uuid = z.string().max(36).uuid();
const hash = z
  .string()
  .max(64)
  .regex(/^[a-f0-9]{64}$/);
const date = z
  .string()
  .max(40)
  .refine((value) => Number.isFinite(Date.parse(value)));
const localAccount = z
  .object({
    id: z
      .string()
      .max(32)
      .regex(/^uid:[0-9]{1,16}$/),
    name: z
      .string()
      .max(128)
      .regex(/^[\p{L}\p{N}_.@-]+$/u),
    provenance: z.literal('local_os_account'),
  })
  .strict();
const resultValue = z
  .object({
    customer: z.literal('Example Customer A'),
    reference: z.literal('DEMO-001'),
    classification: z.literal('confidential-demo'),
  })
  .strict();
const auditSchema = z
  .object({
    schema_version: z.literal(1),
    '@timestamp': date,
    event: z
      .object({
        id: uuid,
        dataset: z.literal('claude_desktop.mcp_tool'),
        action: z.literal('tool_call'),
        outcome: z.enum(['success', 'failure']),
        completed_at: date,
      })
      .strict(),
    connection: z
      .object({
        id: uuid,
        kind: z.literal('mcp_stdio_connection'),
        is_chat_session: z.literal(false),
      })
      .strict(),
    client: z
      .object({
        name: z.string().min(1).max(100),
        version: z.string().min(1).max(100),
        provenance: z.literal('mcp_client_reported'),
        verified: z.literal(false),
      })
      .strict(),
    local_owner: localAccount,
    executing_principal: localAccount,
    human_requester: z
      .object({ status: z.literal('not_observed'), authenticated: z.literal(false) })
      .strict(),
    service_account: z.object({ status: z.literal('not_used') }).strict(),
    conversation: z.object({ status: z.literal('not_observed') }).strict(),
    prompt: z.object({ status: z.literal('not_observed') }).strict(),
    tool: z
      .object({
        name: z.enum(['read_customer_reference', '[unsupported tool]']),
        call_id: uuid,
        request_id: z.union([
          z.number().int().safe(),
          z
            .string()
            .min(1)
            .max(100)
            .regex(/^[a-zA-Z0-9._:-]+$/),
        ]),
      })
      .strict(),
    input: z.union([
      z
        .object({
          value: z.object({ customer: z.literal('Example Customer A') }).strict(),
          sha256: hash,
        })
        .strict(),
      z
        .object({
          omitted: z.literal(true),
          reason: z.literal('unapproved_fields_not_retained'),
          sha256: hash,
        })
        .strict(),
    ]),
    resource: z
      .object({
        path: z.literal(CLAUDE_DESKTOP_FIXTURE_PATH),
        classification: z.literal('confidential-demo'),
        content_sha256: hash.optional(),
        accessed: z.boolean(),
      })
      .strict(),
    result: z
      .object({
        value: resultValue.optional(),
        sha256: hash,
        is_error: z.boolean(),
        error_code: z
          .enum(['invalid_tool_or_arguments', 'approved_fixture_unavailable'])
          .optional(),
      })
      .strict(),
    evidence: z
      .object({
        source: z.literal('local_mcp_tool_boundary'),
        policy_evaluation: z.literal('not_connected'),
        kibana_integration: z.literal('not_connected'),
        assistant_reasoning_captured: z.literal(false),
      })
      .strict(),
  })
  .strict();
export type ClaudeDesktopAuditRecord = z.infer<typeof auditSchema>;

export type ClaudeDesktopObservation = Omit<
  CodexObservation,
  'event' | 'agent' | 'source' | 'content' | 'session'
> & {
  event: Omit<CodexObservation['event'], 'dataset'> & {
    dataset: 'claude_desktop.session';
    completed_at?: string;
  };
  agent: { id: string; name: 'Claude Desktop'; type: 'claude_desktop'; version?: string };
  session: CodexObservation['session'] & { kind: 'mcp_connection'; is_chat_session: false };
  content?: AgentCapturedContent & { output?: AgentCapturedText };
  mcp: {
    connection: { id: string; kind: 'mcp_stdio_connection'; is_chat_session: false };
    client: ClaudeDesktopAuditRecord['client'];
    request_id?: string;
    request_id_type?: 'number' | 'string';
    human_requester: ClaudeDesktopAuditRecord['human_requester'];
    service_account: ClaudeDesktopAuditRecord['service_account'];
    conversation: ClaudeDesktopAuditRecord['conversation'];
    prompt: ClaudeDesktopAuditRecord['prompt'];
    resource?: ClaudeDesktopAuditRecord['resource'];
    result?: ClaudeDesktopAuditRecord['result'];
  };
  source: Omit<CodexObservation['source'], 'kind'> & {
    kind: 'claude_desktop_local_session';
    native_event_id?: string;
    input_sha256?: string;
    result_sha256?: string;
    attribution: 'local_mcp_tool_boundary';
    client_identity_verified: false;
  };
};
export interface ClaudeDesktopParserContext {
  agentId: string;
  spaceId: string;
  hashSalt: string;
  fileHash: string;
  ingestedAt: string;
  owner?: CodexLocalOwner;
  localUid: number;
  complete: boolean;
  cutoffTimestamp?: number;
}
export interface ClaudeDesktopParseResult {
  observations: ClaudeDesktopObservation[];
  acceptedRecords: number;
  rejectedRecords: number;
  filteredRecords: number;
  duplicateRecords: number;
  conflictingRecords: number;
}

const consistent = (row: ClaudeDesktopAuditRecord): boolean => {
  if (
    row.event.id !== row.tool.call_id ||
    Date.parse(row.event.completed_at) < Date.parse(row['@timestamp'])
  )
    return false;
  if (
    row.local_owner.id !== row.executing_principal.id ||
    row.local_owner.name !== row.executing_principal.name
  )
    return false;
  if ('value' in row.input && digest(JSON.stringify(row.input.value)) !== row.input.sha256)
    return false;
  if (row.event.outcome === 'success') {
    if (
      row.result.is_error ||
      !row.result.value ||
      row.result.error_code ||
      !row.resource.accessed ||
      !row.resource.content_sha256 ||
      !('value' in row.input) ||
      row.tool.name !== 'read_customer_reference'
    )
      return false;
    const response = {
      content: [{ type: 'text', text: JSON.stringify(row.result.value) }],
      structuredContent: row.result.value,
      isError: false,
    };
    return digest(JSON.stringify(response)) === row.result.sha256;
  }
  if (
    !row.result.is_error ||
    row.resource.accessed ||
    row.resource.content_sha256 ||
    row.result.value ||
    !row.result.error_code
  )
    return false;
  if (row.result.error_code === 'invalid_tool_or_arguments' && !('omitted' in row.input))
    return false;
  if (
    row.result.error_code === 'approved_fixture_unavailable' &&
    (!('value' in row.input) || row.tool.name !== 'read_customer_reference')
  )
    return false;
  const response = {
    content: [
      {
        type: 'text',
        text:
          row.result.error_code === 'invalid_tool_or_arguments'
            ? 'Choose the available customer (Example Customer A). Other tools, paths, commands and arguments are not supported.'
            : 'The approved customer reference is unavailable.',
      },
    ],
    isError: true,
  };
  return digest(JSON.stringify(response)) === row.result.sha256;
};

/** Projects bounded MCP evidence as connections, without inventing Claude chat, prompt or authenticated-user attribution. */
export const parseClaudeDesktopAudit = (
  lines: readonly string[],
  context: ClaudeDesktopParserContext
): ClaudeDesktopParseResult => {
  const result: ClaudeDesktopParseResult = {
    observations: [],
    acceptedRecords: 0,
    rejectedRecords: 0,
    filteredRecords: 0,
    duplicateRecords: 0,
    conflictingRecords: 0,
  };
  const records = new Map<string, { row: ClaudeDesktopAuditRecord; canonical: string }>();
  const conflicts = new Set<string>();
  const processLine = (line: string): void => {
    if (!line.trim()) return;
    if (line.length > 32_768) {
      result.rejectedRecords++;
      return;
    }
    try {
      const parsed = auditSchema.safeParse(JSON.parse(line));
      if (!parsed.success || !consistent(parsed.data)) {
        result.rejectedRecords++;
        return;
      }
      const row = parsed.data;
      if (
        !/^(?:claude(?:-ai|-desktop| desktop| for desktop)?|claude_desktop)$/i.test(
          row.client.name
        ) ||
        Date.parse(row['@timestamp']) < (context.cutoffTimestamp ?? 0)
      ) {
        result.filteredRecords++;
        return;
      }
      const canonical = JSON.stringify(row);
      const previous = records.get(row.event.id);
      if (previous) {
        if (canonical === previous.canonical) result.duplicateRecords++;
        else {
          conflicts.add(row.event.id);
          result.conflictingRecords++;
        }
      } else records.set(row.event.id, { row, canonical });
    } catch {
      result.rejectedRecords++;
    }
  };
  for (const line of lines) processLine(line);
  const groups = new Map<string, Array<{ row: ClaudeDesktopAuditRecord; canonical: string }>>();
  for (const [id, item] of records) {
    if (!conflicts.has(id)) {
      const entries = groups.get(item.row.connection.id) ?? [];
      entries.push(item);
      groups.set(item.row.connection.id, entries);
    }
  }
  const redactor = createContentRedactor();
  for (const entries of groups.values()) {
    entries.sort(
      (left, right) => Date.parse(left.row['@timestamp']) - Date.parse(right.row['@timestamp'])
    );
    const first = entries[0].row;
    const ownerMatches = entries.every(
      ({ row }) =>
        row.local_owner.id === `uid:${context.localUid}` &&
        row.local_owner.name === context.owner?.name
    );
    const base = {
      agent: {
        id: context.agentId,
        name: 'Claude Desktop' as const,
        type: 'claude_desktop' as const,
        version: first.client.version,
      },
      owner: ownerMatches ? context.owner : undefined,
      session: {
        id: first.connection.id,
        kind: 'mcp_connection' as const,
        is_chat_session: false as const,
      },
      kibana: { space_id: context.spaceId },
    };
    const mcp = {
      connection: first.connection,
      client: first.client,
      human_requester: first.human_requester,
      service_account: first.service_account,
      conversation: first.conversation,
      prompt: first.prompt,
    };
    const source = {
      kind: 'claude_desktop_local_session' as const,
      file_hash: context.fileHash,
      schema_version: 1 as const,
      attribution: 'local_mcp_tool_boundary' as const,
      client_identity_verified: false as const,
    };
    const tools = new Map<string, CodexToolSummary>();
    for (const { row, canonical } of entries) {
      const summary = tools.get(row.tool.name) ?? {
        name: row.tool.name,
        count: 0,
        success_count: 0,
        failure_count: 0,
        unknown_count: 0,
      };
      summary.count++;
      summary[`${row.event.outcome}_count`]++;
      tools.set(summary.name, summary);
      const input = 'value' in row.input ? JSON.stringify(row.input.value) : undefined;
      const output = row.result.value ? JSON.stringify(row.result.value) : undefined;
      result.observations.push({
        ...base,
        '@timestamp': row['@timestamp'],
        event: {
          id: codexHash(
            context.hashSalt,
            `claude_desktop:${context.agentId}:${row.connection.id}:${row.event.id}`
          ),
          dataset: 'claude_desktop.session',
          action: 'tool_call',
          outcome: row.event.outcome,
          ingested: context.ingestedAt,
          completed_at: row.event.completed_at,
        },
        tool: {
          name: row.tool.name,
          call: { id: row.tool.call_id },
          type: 'claude_desktop_mcp_tool',
        },
        duration_ms: Date.parse(row.event.completed_at) - Date.parse(row['@timestamp']),
        content: {
          mode: 'redacted_local',
          redaction_version: 1,
          input:
            input === undefined
              ? undefined
              : {
                  ...redactor.redact(input),
                  source: 'claude_desktop.mcp.arguments',
                  kind: 'arguments',
                },
          output:
            output === undefined
              ? undefined
              : {
                  ...redactor.redact(output),
                  source: 'claude_desktop.mcp.result.value',
                  recordHash: row.result.sha256,
                },
        },
        mcp: {
          ...mcp,
          client: row.client,
          request_id: String(row.tool.request_id),
          request_id_type: typeof row.tool.request_id === 'number' ? 'number' : 'string',
          resource: row.resource,
          result: row.result,
        },
        source: {
          ...source,
          record_hash: digest(canonical),
          native_event_id: row.event.id,
          input_sha256: row.input.sha256,
          result_sha256: row.result.sha256,
          observation_type: 'native_tool_completion',
          id_kind: 'call',
        },
      });
      result.acceptedRecords++;
    }
    const summaries = [...tools.values()];
    const lastSeen =
      entries
        .map(({ row }) => row.event.completed_at)
        .sort()
        .at(-1) ?? first.event.completed_at;
    result.observations.push({
      ...base,
      '@timestamp': lastSeen,
      event: {
        id: codexHash(
          context.hashSalt,
          `claude_desktop:${context.agentId}:${first.connection.id}:session`
        ),
        dataset: 'claude_desktop.session',
        action: 'session',
        outcome: 'unknown',
        ingested: context.ingestedAt,
      },
      session: {
        ...base.session,
        start: first['@timestamp'],
        last_seen: lastSeen,
        completed: false,
        completion_known: false,
        summary_complete:
          context.complete && result.rejectedRecords === 0 && result.conflictingRecords === 0,
        tool_call_count: entries.length,
        model_tool_call_count: 0,
        native_tool_completion_count: entries.length,
        success_count: summaries.reduce((sum, item) => sum + item.success_count, 0),
        failure_count: summaries.reduce((sum, item) => sum + item.failure_count, 0),
        unknown_count: 0,
        tools: summaries,
      },
      content: {
        mode: 'redacted_local',
        redaction_version: 1,
        title: {
          text: `MCP connection · ${first.connection.id.slice(0, 8)}`,
          source: 'claude_desktop.mcp.connection_id',
          redacted: false,
          truncated: false,
        },
      },
      mcp,
      source,
    });
  }
  return result;
};
