/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { RegisteredEntityDefinition } from '@kbn/entity-store/server';
import type { EntityRow, EsqlValue } from '../alerts/types';
import { ENTITY_ID_COLUMN, generateListQueries, getDynamicBlock, planSources } from './generator';
import type { GeneratedQuery, QueryEngine, TimeWindow } from './generator';

/** `TS` only when every index behind the pattern is a time series index, as the generator requires. */
const resolveEngine = async (
  esClient: ElasticsearchClient,
  indexPattern: string
): Promise<QueryEngine> => {
  const settings = await esClient.indices.getSettings({
    index: indexPattern,
    filter_path: '*.settings.index.mode',
    allow_no_indices: true,
    ignore_unavailable: true,
  });
  const modes = Object.values(settings).map((index) => index.settings?.index?.mode);
  return modes.length > 0 && modes.every((mode) => mode === 'time_series') ? 'TS' : 'FROM';
};

const LAST_SEEN_COLUMN = 'last_seen';

const isLater = (value: EsqlValue, current: EsqlValue | undefined): boolean =>
  typeof value === 'string' && (typeof current !== 'string' || value > current);

/** Folds the rows of one entity from several sources: first value wins, `last_seen` is the latest. */
const mergeRows = (rows: readonly EntityRow[]): EntityRow[] => {
  const merged = new Map<string, Record<string, EsqlValue>>();

  for (const row of rows) {
    const id = String(row[ENTITY_ID_COLUMN]);
    const target = merged.get(id) ?? {};
    for (const [column, value] of Object.entries(row)) {
      const current = target[column];
      const takesNewest = column === LAST_SEEN_COLUMN && isLater(value, current);
      if (current === undefined || current === null || takesNewest) {
        target[column] = value;
      }
    }
    merged.set(id, target);
  }

  return [...merged.values()];
};

/** The ES|QL that lists the entities of one definition over a window, one query per source. */
export const generateEntityQueries = async ({
  esClient,
  definition,
  window,
  limit,
}: {
  esClient: ElasticsearchClient;
  definition: RegisteredEntityDefinition;
  window: TimeWindow;
  limit: number;
}): Promise<GeneratedQuery[]> => {
  const { sources } = getDynamicBlock(definition);
  const engines = await Promise.all(
    sources.map(({ indexPattern }) => resolveEngine(esClient, indexPattern))
  );
  return generateListQueries(definition, planSources(definition, engines), window, limit);
};

/** Runs entity list queries and folds the rows of each entity into one. */
export const runEntityQueries = async (
  esClient: ElasticsearchClient,
  queries: readonly GeneratedQuery[]
): Promise<EntityRow[]> => {
  const rowsPerQuery = await Promise.all(
    queries.map(async ({ esql, params }) => {
      const { columns, values } = await esClient.esql.query({
        query: esql,
        params,
        format: 'json',
      });
      return values.map(
        (row): EntityRow => Object.fromEntries(columns.map(({ name }, index) => [name, row[index]]))
      );
    })
  );

  return mergeRows(rowsPerQuery.flat());
};

/** Lists the entities of one definition over a window by running its generated list queries. */
export const listEntities = async (
  params: Parameters<typeof generateEntityQueries>[0]
): Promise<EntityRow[]> => runEntityQueries(params.esClient, await generateEntityQueries(params));
