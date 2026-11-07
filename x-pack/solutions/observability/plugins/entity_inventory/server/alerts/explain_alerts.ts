/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { entityTuple } from './attribute_alerts';
import type { GeneratedQuery, NamedParams } from '../inventory/generator';
import { buildExplainQuery, buildGroupQuery } from './classic_matcher';
import { aliasVariants } from './field_aliases';
import type { EntityRow, KeySource, MatchKey, MatchKeyEntry } from './types';
import { buildV2ExplainQuery, buildV2GroupQuery } from './v2_matcher';

/** `key` is the key as the definition writes it; `alias` is a spelling the alias table adds. */
export type Origin = 'key' | 'alias';
type Source = 'classic' | 'v2';

export interface KeyExplanation {
  columns: MatchKey;
  source: KeySource;
  /** The entity's value for each column, or `null` when it lacks one and the key cannot match. */
  values: readonly string[] | null;
  variants: Array<{ columns: MatchKey; origin: Origin }>;
}

export interface MatchedAlert {
  source: Source;
  alertId: string;
  ruleName: string | null;
  ruleId: string | null;
  key: MatchKey;
  variant: MatchKey;
  origin: Origin;
  groupValues: readonly string[];
}

export interface SourceError {
  source: Source;
  message: string;
}

/** An ES|QL query with what it is for, so a reader can see which key and source it belongs to. */
export interface LabeledQuery {
  source: Source;
  key: MatchKey;
  variant: MatchKey;
  origin: Origin;
  esql: string;
  params: NamedParams;
}

interface Lookup {
  key: MatchKey;
  variant: MatchKey;
  origin: Origin;
  values: readonly string[];
}

const MAX_ERROR_LENGTH = 300;

const originOf = (index: number): Origin => (index === 0 ? 'key' : 'alias');

const toText = (value: string | number | boolean | null | undefined): string | null =>
  value === null || value === undefined ? null : String(value);

/** The spellings an alert may have grouped a key by: the key itself, and an alias unless another key is it. */
const variantsOf = (key: MatchKey, keys: readonly MatchKey[]) =>
  aliasVariants(key, keys).map((columns, index) => ({ columns, origin: originOf(index) }));

/** Each key, where it came from, the entity's values for it, and the spellings an alert may have used. */
export const explainKeys = (
  entries: readonly MatchKeyEntry[],
  entity: EntityRow
): KeyExplanation[] => {
  const keys = entries.map(({ columns }) => columns);
  return entries.map(({ columns, source }) => ({
    columns,
    source,
    values: entityTuple(entity, columns),
    variants: variantsOf(columns, keys),
  }));
};

const explainClassic = async (
  esClient: ElasticsearchClient,
  { key, variant, origin, values }: Lookup,
  { esql, params }: GeneratedQuery
): Promise<MatchedAlert[]> => {
  const { values: rows } = await esClient.esql.query({ query: esql, params, format: 'json' });
  return rows.map(([alertId, ruleName, ruleId]) => ({
    source: 'classic',
    alertId: String(alertId),
    ruleName: toText(ruleName),
    ruleId: toText(ruleId),
    key,
    variant,
    origin,
    groupValues: values,
  }));
};

const explainV2 = async (
  esClient: ElasticsearchClient,
  { key, variant, origin, values }: Lookup,
  { esql, params }: GeneratedQuery
): Promise<MatchedAlert[]> => {
  const { values: rows } = await esClient.esql.query({ query: esql, params, format: 'json' });
  return rows.map(([alertId, ruleId]) => ({
    source: 'v2',
    alertId: String(alertId),
    ruleName: null,
    ruleId: toText(ruleId),
    key,
    variant,
    origin,
    groupValues: values,
  }));
};

/**
 * The active alerts of one entity and how each was matched: which key, in which spelling, from
 * which source and rule. An alert reached through several keys is listed once per key. A source
 * that fails is reported in `errors` and does not hide the other.
 */
export const explainEntity = async ({
  esClient,
  keys,
  entity,
  spaceId,
  from,
}: {
  esClient: ElasticsearchClient;
  keys: readonly MatchKey[];
  entity: EntityRow;
  spaceId: string;
  from: string;
}): Promise<{ alerts: MatchedAlert[]; errors: SourceError[]; queries: LabeledQuery[] }> => {
  const lookups = keys.flatMap((columns): Lookup[] => {
    const values = entityTuple(entity, columns);
    return values
      ? variantsOf(columns, keys).map(({ columns: variant, origin }) => ({
          key: columns,
          variant,
          origin,
          values,
        }))
      : [];
  });

  const tasks = lookups.flatMap(
    (
      lookup
    ): Array<{ source: Source; query: LabeledQuery; run: () => Promise<MatchedAlert[]> }> => {
      const label = { key: lookup.key, variant: lookup.variant, origin: lookup.origin };
      const classic = buildExplainQuery(lookup.variant, lookup.values, spaceId);
      const v2 = buildV2ExplainQuery(lookup.variant, lookup.values, { from, spaceId });
      return [
        {
          source: 'classic',
          query: { source: 'classic', ...label, ...classic },
          run: () => explainClassic(esClient, lookup, classic),
        },
        {
          source: 'v2',
          query: { source: 'v2', ...label, ...v2 },
          run: () => explainV2(esClient, lookup, v2),
        },
      ];
    }
  );

  const outcomes = await Promise.all(
    tasks.map(
      async ({ source, run }): Promise<{ alerts: MatchedAlert[]; error: SourceError | null }> => {
        try {
          return { alerts: await run(), error: null };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { alerts: [], error: { source, message: message.slice(0, MAX_ERROR_LENGTH) } };
        }
      }
    )
  );

  const errors = new Map<string, SourceError>();
  outcomes.forEach(({ error }) => {
    if (error) {
      errors.set(`${error.source}:${error.message}`, error);
    }
  });

  return {
    alerts: outcomes.flatMap(({ alerts }) => alerts),
    errors: [...errors.values()],
    queries: tasks.map(({ query }) => query),
  };
};

/** The queries that produce the per-entity counts: every key in every spelling, for both sources. */
export const buildCountQueries = ({
  keys,
  spaceId,
  from,
}: {
  keys: readonly MatchKey[];
  spaceId: string;
  from: string;
}): LabeledQuery[] =>
  keys.flatMap((key) =>
    aliasVariants(key, keys).flatMap((variant, index): LabeledQuery[] => {
      const label = { key, variant, origin: originOf(index) };
      return [
        { source: 'classic', ...label, ...buildGroupQuery(variant, spaceId) },
        { source: 'v2', ...label, ...buildV2GroupQuery(variant, { from, spaceId }) },
      ];
    })
  );
