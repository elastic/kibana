/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EntityGraphTraversalEuidType,
  ResolvedTraversalNode,
  TraversalEntity,
  TraversalNode,
} from '../../../../common/workflows/step_types/entity_graph_traversal/entity_graph_traversal_common';
import { ENTITY_GRAPH_TRAVERSAL_EUID_TYPES } from '../../../../common/workflows/step_types/entity_graph_traversal/entity_graph_traversal_common';
import { HOP_QUERY_PREAMBLE } from './build_hop_query';
import type { EsqlResult } from './run_hop';

export const ENTITY_ID_FIELD = 'entity.id';
export const RESOLVED_TO_FIELD = 'entity.relationships.resolution.resolved_to';

/** Columns read from the entity store for each resolved node, in `KEEP` order. */
export const RESOLVE_QUERY_COLUMNS = [
  ENTITY_ID_FIELD,
  'entity.name',
  'entity.type',
  'entity.sub_type',
  'entity.EngineMetadata.Type',
  'entity.source',
  'asset.criticality',
  'entity.risk.calculated_level',
  'entity.risk.calculated_score_norm',
  RESOLVED_TO_FIELD,
] as const;

export const DEFAULT_RESOLVE_CHUNK_SIZE = 500;

export interface ResolveQuery {
  query: string;
  params: string[];
}

export type ExecuteResolveQuery = (query: ResolveQuery) => Promise<EsqlResult>;

export interface ResolveNodesInput {
  nodes: TraversalNode[];
  /** Latest entity index pattern of the execution space. */
  indexPattern: string;
  chunkSize?: number;
}

export interface ResolveNodesResult {
  nodes: ResolvedTraversalNode[];
  stats: {
    requested: number;
    resolved: number;
    unresolved: number;
    aliases: number;
    queries: number;
  };
}

/**
 * One ES|QL lookup of a chunk of node ids in the entity store. Ids travel as parameters.
 */
export const buildResolveQuery = (indexPattern: string, ids: string[]): ResolveQuery => {
  if (ids.length === 0) {
    throw new Error('Cannot build a resolve query for no ids');
  }
  const placeholders = ids.map(() => '?').join(', ');
  const query = [
    HOP_QUERY_PREAMBLE,
    `FROM ${indexPattern}`,
    `| WHERE ${ENTITY_ID_FIELD} IN (${placeholders})`,
    `| KEEP ${RESOLVE_QUERY_COLUMNS.join(', ')}`,
    `| LIMIT ${ids.length}`,
  ].join('\n');
  return { query, params: ids };
};

/**
 * Look every traversed node up in the entity store and annotate it. Nodes keep their order;
 * duplicates are looked up once.
 */
export const resolveNodes = async (
  { nodes, indexPattern, chunkSize = DEFAULT_RESOLVE_CHUNK_SIZE }: ResolveNodesInput,
  execute: ExecuteResolveQuery
): Promise<ResolveNodesResult> => {
  const ids = Array.from(new Set(nodes.map((node) => node.id)));
  const found = new Map<string, StoredEntity>();
  let queries = 0;

  for (let start = 0; start < ids.length; start += chunkSize) {
    const chunk = ids.slice(start, start + chunkSize);
    const result = await execute(buildResolveQuery(indexPattern, chunk));
    queries += 1;
    for (const stored of parseStoredEntities(result)) {
      if (!found.has(stored.id)) {
        found.set(stored.id, stored);
      }
    }
  }

  let aliases = 0;
  const resolved = nodes.map((node): ResolvedTraversalNode => {
    const stored = found.get(node.id);
    if (!stored) {
      return { ...node, euid: node.id, resolved: false };
    }
    if (stored.resolvedTo !== undefined) aliases += 1;
    return {
      ...node,
      euid: node.id,
      resolved: true,
      ...(stored.resolvedTo !== undefined && { canonical_euid: stored.resolvedTo }),
      entity: stored.entity,
    };
  });

  const resolvedCount = resolved.filter((node) => node.resolved).length;
  return {
    nodes: resolved,
    stats: {
      requested: nodes.length,
      resolved: resolvedCount,
      unresolved: nodes.length - resolvedCount,
      aliases,
      queries,
    },
  };
};

interface StoredEntity {
  id: string;
  resolvedTo?: string;
  entity: TraversalEntity;
}

const parseStoredEntities = (result: EsqlResult): StoredEntity[] => {
  const column = (name: string) => result.columns.findIndex((c) => c.name === name);
  const idIndex = column(ENTITY_ID_FIELD);
  if (idIndex < 0) {
    throw new Error(`Resolve query result lacks the ${ENTITY_ID_FIELD} column`);
  }
  const indexes = {
    name: column('entity.name'),
    type: column('entity.type'),
    subType: column('entity.sub_type'),
    engineType: column('entity.EngineMetadata.Type'),
    sources: column('entity.source'),
    criticality: column('asset.criticality'),
    riskLevel: column('entity.risk.calculated_level'),
    riskScore: column('entity.risk.calculated_score_norm'),
    resolvedTo: column(RESOLVED_TO_FIELD),
  };
  const cell = (row: unknown[], index: number): unknown => (index >= 0 ? row[index] : undefined);

  const entities: StoredEntity[] = [];
  for (const row of result.values) {
    const id = firstString(cell(row, idIndex));
    if (id !== undefined) {
      const engineType = firstString(cell(row, indexes.engineType));
      const riskScore = cell(row, indexes.riskScore);
      const sources = allStrings(cell(row, indexes.sources));
      const entity: TraversalEntity = {
        ...(firstString(cell(row, indexes.name)) !== undefined && {
          name: firstString(cell(row, indexes.name)),
        }),
        ...(firstString(cell(row, indexes.type)) !== undefined && {
          type: firstString(cell(row, indexes.type)),
        }),
        ...(firstString(cell(row, indexes.subType)) !== undefined && {
          sub_type: firstString(cell(row, indexes.subType)),
        }),
        ...(isEuidType(engineType) && { engine_type: engineType }),
        ...(sources.length > 0 && { sources }),
        ...(firstString(cell(row, indexes.criticality)) !== undefined && {
          criticality: firstString(cell(row, indexes.criticality)),
        }),
        ...(firstString(cell(row, indexes.riskLevel)) !== undefined && {
          risk_level: firstString(cell(row, indexes.riskLevel)),
        }),
        ...(typeof riskScore === 'number' &&
          Number.isFinite(riskScore) && {
            risk_score: riskScore,
          }),
      };
      const resolvedTo = firstString(cell(row, indexes.resolvedTo));
      entities.push({ id, entity, ...(resolvedTo !== undefined && { resolvedTo }) });
    }
  }
  return entities;
};

const isEuidType = (value: string | undefined): value is EntityGraphTraversalEuidType =>
  value !== undefined && (ENTITY_GRAPH_TRAVERSAL_EUID_TYPES as readonly string[]).includes(value);

/** ES|QL multi-values arrive as arrays; take the first string, ignore anything else. */
const firstString = (value: unknown): string | undefined => {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === 'string' && first.length > 0 ? first : undefined;
};

const allStrings = (value: unknown): string[] => {
  const values = Array.isArray(value) ? value : [value];
  return values.filter((v): v is string => typeof v === 'string' && v.length > 0);
};
