/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { CODEX_MAPPING } from './codex_index';
import type { GoogleAdkObservation } from './google_adk_run_parser';

export const googleAdkIndexName = (spaceId: string): string => {
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(spaceId)) throw new Error('Invalid space ID.');
  return `logs-google_adk.entity_intelligence-${spaceId}`;
};

/** Stores bounded cloud identity and audit joins separately from indexed agent/session fields. */
export const ensureGoogleAdkIndex = async (client: Client, index: string): Promise<void> => {
  const event = CODEX_MAPPING.properties?.event;
  const session = CODEX_MAPPING.properties?.session;
  const source = CODEX_MAPPING.properties?.source;
  const keyword = { type: 'keyword', ignore_above: 512 } as const;
  const mapping: MappingTypeMapping = {
    ...CODEX_MAPPING,
    properties: {
      ...CODEX_MAPPING.properties,
      user: { properties: { id: keyword, name: keyword } },
      content: { type: 'object', enabled: false },
      google_adk: { type: 'object', enabled: false },
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
          is_chat_session: { type: 'boolean' },
        },
      },
      source: {
        properties: {
          ...(source && 'properties' in source ? source.properties : {}),
          native_event_id: keyword,
          input_sha256: keyword,
          result_sha256: keyword,
        },
      },
    },
  };
  await client.indices.putIndexTemplate({
    name: `entity-intelligence-google-adk-${index.slice(
      'logs-google_adk.entity_intelligence-'.length
    )}`,
    index_patterns: [index],
    priority: 501,
    template: { mappings: mapping },
    _meta: {
      description: 'Executed Google ADK function tools and explicit cloud attribution evidence.',
    },
  });
  if (!(await client.indices.exists({ index }))) await client.indices.create({ index });
  else await client.indices.putMapping({ index, ...mapping });
};

/** Reimports stable native tool IDs before publishing session summaries. */
export const indexGoogleAdkObservations = async (
  client: Client,
  index: string,
  observations: readonly GoogleAdkObservation[]
): Promise<void> => {
  for (const action of ['tool_call', 'session'] as const) {
    const group = observations.filter((item) => item.event.action === action);
    for (let offset = 0; offset < group.length; offset += 500) {
      const operations = group
        .slice(offset, offset + 500)
        .flatMap((document) => [{ index: { _index: index, _id: document.event.id } }, document]);
      const response = await client.bulk({ operations, refresh: false });
      if (response.errors)
        throw new Error('Google ADK import rejected documents; raw responses are not logged.');
    }
  }
};
