/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { CodexObservation } from './codex_session_types';

const keyword = { type: 'keyword', ignore_above: 512 } as const;
const date = { type: 'date' } as const;
const count = { type: 'long' } as const;
const boolean = { type: 'boolean' } as const;
const captured = {
  text: { type: 'text', index: false } as const,
  source: keyword,
  recordHash: keyword,
  redacted: boolean,
  truncated: boolean,
};

export const CODEX_MAPPING: MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    '@timestamp': date,
    content: {
      properties: {
        mode: keyword,
        redaction_version: count,
        title: { properties: captured },
        prompts: { properties: { ...captured, id: keyword, timestamp: date } },
        prompts_total: count,
        prompts_truncated: boolean,
        input: { properties: { ...captured, kind: keyword } },
      },
    },
    event: {
      properties: {
        id: keyword,
        dataset: keyword,
        action: keyword,
        outcome: keyword,
        ingested: date,
      },
    },
    agent: { properties: { id: keyword, name: keyword, type: keyword, version: keyword } },
    owner: { properties: { id: keyword, name: keyword, provenance: keyword } },
    creator: { properties: { id: keyword, account_id: keyword, provenance: keyword } },
    session: {
      properties: {
        id: keyword,
        runtime_id: keyword,
        parent_id: keyword,
        nickname: keyword,
        role: keyword,
        agent_path: keyword,
        start: date,
        last_seen: date,
        completed: boolean,
        completion_known: boolean,
        summary_complete: boolean,
        tool_call_count: count,
        model_tool_call_count: count,
        native_tool_completion_count: count,
        success_count: count,
        failure_count: count,
        unknown_count: count,
        completed_turn_count: count,
        aborted_turn_count: count,
        models: keyword,
        tools: {
          properties: {
            name: keyword,
            count,
            success_count: count,
            failure_count: count,
            unknown_count: count,
          },
        },
      },
    },
    tool: { properties: { name: keyword, call: { properties: { id: keyword } }, type: keyword } },
    turn: { properties: { id: keyword } },
    process: { properties: { exit_code: { type: 'integer' } } },
    duration_ms: { type: 'double' },
    model: keyword,
    sandbox: { properties: { mode: keyword } },
    approval: { properties: { policy: keyword } },
    source: {
      properties: {
        kind: keyword,
        file_hash: keyword,
        record_hash: keyword,
        id_kind: keyword,
        observation_type: keyword,
        schema_version: count,
      },
    },
    kibana: { properties: { space_id: keyword } },
  },
};

/** Resolves the dedicated space-specific external Codex observation index. */
export const codexIndexName = (spaceId: string): string => {
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(spaceId)) throw new Error('Invalid space ID.');
  return `logs-codex.entity_intelligence-${spaceId}`;
};

/** Rejects non-loopback targets and embedded credentials unless remote export is explicitly enabled. */
export const validateCodexTarget = (target: string, allowRemote = false): URL => {
  const url = new URL(target);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'Elasticsearch URL must use HTTP(S) without embedded credentials, query or fragment.'
    );
  }
  if (!allowRemote && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error(
      'Only loopback Elasticsearch is allowed unless --allow-remote is explicitly set.'
    );
  }
  return url;
};

/** Installs an explicit normal-index template, separate from native Agent Builder tracing. */
export const ensureCodexIndex = async (client: Client, index: string): Promise<void> => {
  await client.indices.putIndexTemplate({
    name: `entity-intelligence-codex-${index.slice('logs-codex.entity_intelligence-'.length)}`,
    index_patterns: [index],
    priority: 501,
    template: { mappings: CODEX_MAPPING },
    _meta: {
      description: 'Privacy-filtered external Codex session metadata; not native OTel spans.',
    },
  });
  if (!(await client.indices.exists({ index }))) {
    await client.indices.create({ index });
  } else {
    await client.indices.putMapping({ index, ...CODEX_MAPPING });
  }
};

/** Upserts deterministic document IDs so repeated imports never duplicate observations. */
export const indexCodexObservations = async (
  client: Client,
  index: string,
  observations: readonly CodexObservation[]
): Promise<void> => {
  const groups = [
    observations.filter((document) => document.event.action !== 'session'),
    observations.filter((document) => document.event.action === 'session'),
  ];
  // Publish the summary only after all tool observations in this snapshot were accepted.
  for (const group of groups) {
    for (let offset = 0; offset < group.length; offset += 500) {
      const operations = group
        .slice(offset, offset + 500)
        .flatMap((document) => [{ index: { _index: index, _id: document.event.id } }, document]);
      const response = await client.bulk({ operations, refresh: false });
      if (response.errors) {
        const failures = response.items.filter((item) => item.index?.error).length;
        throw new Error(
          `Codex bulk import failed for ${failures} documents; no raw response was logged.`
        );
      }
    }
  }
};
