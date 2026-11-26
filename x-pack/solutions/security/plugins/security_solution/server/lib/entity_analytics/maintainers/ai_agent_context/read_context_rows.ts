/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  QueryDslQueryContainer,
  SearchHit,
  SortResults,
} from '@elastic/elasticsearch/lib/api/types';
import type { AgentContextRow, RelatedContextRow } from './compute_ai_agent_context';

const PAGE_SIZE = 1_000;
/** Keeps each `terms` clause well below the cluster's `index.max_terms_count`. */
const TERMS_CHUNK_SIZE = 5_000;

const FIELDS = {
  id: 'entity.id',
  type: 'entity.EngineMetadata.Type',
  userName: 'user.name',
  personIds: 'entity.relationships.acts_on_behalf_of.ids',
  personEmails: 'entity.relationships.acts_on_behalf_of.raw_identifiers.user.email',
  hostIds: 'entity.relationships.depends_on.ids',
  resolvedTo: 'entity.relationships.resolution.resolved_to',
  watchlists: 'entity.attributes.watchlists',
  criticality: 'asset.criticality',
  mfaEnabled: 'entity.attributes.mfa_enabled',
} as const;

type HitFields = SearchHit['fields'];

const readStrings = (fields: HitFields, name: string): string[] => {
  const values: unknown[] = fields?.[name] ?? [];
  return values.filter((value): value is string => typeof value === 'string' && value !== '');
};

const readString = (fields: HitFields, name: string): string | undefined =>
  readStrings(fields, name)[0];

const readBoolean = (fields: HitFields, name: string): boolean | undefined => {
  const values: unknown[] = fields?.[name] ?? [];
  return values.find((value): value is boolean => typeof value === 'boolean');
};

export const toAgentContextRow = (fields: HitFields): AgentContextRow | undefined => {
  const id = readString(fields, FIELDS.id);
  if (!id) {
    return undefined;
  }
  return {
    id,
    userName: readString(fields, FIELDS.userName),
    personIds: readStrings(fields, FIELDS.personIds),
    personEmails: readStrings(fields, FIELDS.personEmails),
    hostIds: readStrings(fields, FIELDS.hostIds),
  };
};

export const toRelatedContextRow = (fields: HitFields): RelatedContextRow | undefined => {
  const id = readString(fields, FIELDS.id);
  if (!id) {
    return undefined;
  }
  return {
    id,
    resolvedTo: readString(fields, FIELDS.resolvedTo),
    watchlists: readStrings(fields, FIELDS.watchlists),
    criticality: readString(fields, FIELDS.criticality),
    mfaEnabled: readBoolean(fields, FIELDS.mfaEnabled),
  };
};

const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
};

async function* searchAllFields(
  esClient: ElasticsearchClient,
  index: string,
  query: QueryDslQueryContainer,
  fields: readonly string[],
  signal?: AbortSignal
): AsyncGenerator<HitFields> {
  let searchAfter: SortResults | undefined;
  while (!signal?.aborted) {
    const { hits } = await esClient.search(
      {
        index,
        size: PAGE_SIZE,
        query,
        _source: false,
        fields: [...fields],
        sort: [{ [FIELDS.id]: 'asc' }],
        ...(searchAfter ? { search_after: searchAfter } : {}),
      },
      { signal }
    );
    for (const hit of hits.hits) {
      yield hit.fields;
    }
    if (hits.hits.length < PAGE_SIZE) {
      return;
    }
    searchAfter = hits.hits[hits.hits.length - 1].sort;
  }
}

/** Reads every `ai_agent` row in the latest index. */
export const readAgentRows = async (
  esClient: ElasticsearchClient,
  index: string,
  signal?: AbortSignal
): Promise<AgentContextRow[]> => {
  const rows: AgentContextRow[] = [];
  for await (const fields of searchAllFields(
    esClient,
    index,
    { term: { [FIELDS.type]: 'ai_agent' } },
    [FIELDS.id, FIELDS.userName, FIELDS.personIds, FIELDS.personEmails, FIELDS.hostIds],
    signal
  )) {
    const row = toAgentContextRow(fields);
    if (row) {
      rows.push(row);
    }
  }
  return rows;
};

const RELATED_FIELDS = [
  FIELDS.id,
  FIELDS.resolvedTo,
  FIELDS.watchlists,
  FIELDS.criticality,
  FIELDS.mfaEnabled,
];

const readRowsMatching = async (
  esClient: ElasticsearchClient,
  index: string,
  ids: readonly string[],
  matchFields: readonly string[],
  signal?: AbortSignal
): Promise<RelatedContextRow[]> => {
  const rows: RelatedContextRow[] = [];
  for (const idChunk of chunk(ids, TERMS_CHUNK_SIZE)) {
    const query: QueryDslQueryContainer = {
      bool: {
        should: matchFields.map((field) => ({ terms: { [field]: idChunk } })),
        minimum_should_match: 1,
      },
    };
    for await (const fields of searchAllFields(esClient, index, query, RELATED_FIELDS, signal)) {
      const row = toRelatedContextRow(fields);
      if (row) {
        rows.push(row);
      }
    }
  }
  return rows;
};

/**
 * Reads the person rows the agents act for, every row in their resolution groups, and the hosts
 * the agents depend on. The first read finds each person's resolution target, the second reads
 * the target and every row resolved to it.
 */
export const readRelatedRows = async (
  esClient: ElasticsearchClient,
  index: string,
  agents: readonly AgentContextRow[],
  signal?: AbortSignal
): Promise<RelatedContextRow[]> => {
  const personIds = [...new Set(agents.flatMap(({ personIds: ids }) => ids))];
  const hostIds = [...new Set(agents.flatMap(({ hostIds: ids }) => ids))];

  const directRows = await readRowsMatching(
    esClient,
    index,
    [...new Set([...personIds, ...hostIds])],
    [FIELDS.id],
    signal
  );
  const directById = new Map(directRows.map((row) => [row.id, row]));
  const targets = [...new Set(personIds.map((id) => directById.get(id)?.resolvedTo ?? id))];
  const groupRows = await readRowsMatching(
    esClient,
    index,
    targets,
    [FIELDS.id, FIELDS.resolvedTo],
    signal
  );

  return [...new Map([...directRows, ...groupRows].map((row) => [row.id, row])).values()];
};
