/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { CODEX_MAPPING } from './codex_index';
import type { CursorObservation } from './cursor_session_parser';

export const cursorIndexName = (spaceId: string): string => {
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(spaceId)) throw new Error('Invalid space ID.');
  return `logs-cursor.entity_intelligence-${spaceId}`;
};

/** Installs the dedicated Cursor observation mapping with redacted text retained only in source. */
export const ensureCursorIndex = async (client: Client, index: string): Promise<void> => {
  const mapping: MappingTypeMapping = {
    ...CODEX_MAPPING,
    properties: { ...CODEX_MAPPING.properties, content: { type: 'object', enabled: false } },
  };
  await client.indices.putIndexTemplate({
    name: `entity-intelligence-cursor-${index.slice('logs-cursor.entity_intelligence-'.length)}`,
    index_patterns: [index],
    priority: 501,
    template: { mappings: mapping },
    _meta: { description: 'Recorded local Cursor sessions with bounded redacted content.' },
  });
  if (!(await client.indices.exists({ index }))) await client.indices.create({ index });
  else await client.indices.putMapping({ index, ...mapping });
};

/** Publishes observed interactions before their summary with stable document IDs for repeat imports. */
export const indexCursorObservations = async (
  client: Client,
  index: string,
  observations: readonly CursorObservation[]
): Promise<void> => {
  for (const group of [
    observations.filter((item) => item.event.action === 'tool_call'),
    observations.filter((item) => item.event.action === 'session'),
  ]) {
    for (let offset = 0; offset < group.length; offset += 500) {
      const operations = group
        .slice(offset, offset + 500)
        .flatMap((document) => [{ index: { _index: index, _id: document.event.id } }, document]);
      const result = await client.bulk({ operations, refresh: false });
      if (result.errors)
        throw new Error('Cursor import rejected documents; raw responses are not logged.');
    }
  }
};
