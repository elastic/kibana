/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { CODEX_MAPPING } from './codex_index';
import type { ClaudeDesktopObservation } from './claude_desktop_session_parser';

export const claudeDesktopIndexName = (spaceId: string): string => {
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(spaceId)) throw new Error('Invalid space ID.');
  return `logs-claude_desktop.entity_intelligence-${spaceId}`;
};

/** Maps local MCP evidence separately from Claude chat history and native Agent Builder traces. */
export const ensureClaudeDesktopIndex = async (client: Client, index: string): Promise<void> => {
  const keyword = { type: 'keyword', ignore_above: 512 } as const;
  const boolean = { type: 'boolean' } as const;
  const session = CODEX_MAPPING.properties?.session;
  const event = CODEX_MAPPING.properties?.event;
  const mapping: MappingTypeMapping = {
    ...CODEX_MAPPING,
    properties: {
      ...CODEX_MAPPING.properties,
      content: { type: 'object', enabled: false },
      event: {
        properties: {
          ...(event && 'properties' in event ? event.properties : {}),
          completed_at: { type: 'date' },
        },
      },
      session: {
        properties: {
          ...(session && 'properties' in session ? session.properties : {}),
          kind: keyword,
          is_chat_session: boolean,
        },
      },
      mcp: {
        properties: {
          connection: { properties: { id: keyword, kind: keyword, is_chat_session: boolean } },
          client: {
            properties: { name: keyword, version: keyword, provenance: keyword, verified: boolean },
          },
          request_id: keyword,
          request_id_type: keyword,
          human_requester: { properties: { status: keyword, authenticated: boolean } },
          service_account: { properties: { status: keyword } },
          conversation: { properties: { status: keyword } },
          prompt: { properties: { status: keyword } },
          resource: {
            properties: {
              path: keyword,
              classification: keyword,
              content_sha256: keyword,
              accessed: boolean,
            },
          },
          result: {
            properties: {
              value: { type: 'object', enabled: false },
              sha256: keyword,
              is_error: boolean,
              error_code: keyword,
            },
          },
        },
      },
      source: {
        properties: {
          kind: keyword,
          file_hash: keyword,
          record_hash: keyword,
          id_kind: keyword,
          observation_type: keyword,
          schema_version: { type: 'long' },
          native_event_id: keyword,
          input_sha256: keyword,
          result_sha256: keyword,
          attribution: keyword,
          client_identity_verified: boolean,
        },
      },
    },
  };
  await client.indices.putIndexTemplate({
    name: `entity-intelligence-claude-desktop-${index.slice(
      'logs-claude_desktop.entity_intelligence-'.length
    )}`,
    index_patterns: [index],
    priority: 501,
    template: { mappings: mapping },
    _meta: {
      description:
        'Recorded local Claude Desktop MCP tool evidence; connections are not chat sessions.',
    },
  });
  if (!(await client.indices.exists({ index }))) await client.indices.create({ index });
  else await client.indices.putMapping({ index, ...mapping });
};

/** Upserts stable calls before their connection summary so repeated imports never duplicate evidence. */
export const indexClaudeDesktopObservations = async (
  client: Client,
  index: string,
  observations: readonly ClaudeDesktopObservation[]
): Promise<void> => {
  for (const action of ['tool_call', 'session'] as const) {
    const group = observations.filter((item) => item.event.action === action);
    for (let offset = 0; offset < group.length; offset += 500) {
      const operations = group
        .slice(offset, offset + 500)
        .flatMap((document) => [{ index: { _index: index, _id: document.event.id } }, document]);
      const response = await client.bulk({ operations, refresh: false });
      if (response.errors)
        throw new Error('Claude Desktop import rejected documents; raw responses are not logged.');
    }
  }
};
