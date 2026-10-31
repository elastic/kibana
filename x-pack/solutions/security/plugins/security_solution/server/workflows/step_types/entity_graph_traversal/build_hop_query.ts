/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFieldEvaluationsEsql } from '@kbn/entity-store/common/domain/euid';
import { euid, getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';
import type {
  EntityGraphTraversalEuidType,
  TraversalExclusion,
  TraversalHop,
} from '../../../../common/workflows/step_types/entity_graph_traversal/entity_graph_traversal_common';

export const HOP_SOURCE_COLUMN = '__source';
export const HOP_TARGET_COLUMN = '__target';
export const HOP_COUNT_COLUMN = '__count';
export const hopPayloadColumn = (index: number): string => `__payload_${index}`;

/**
 * Unmapped fields are loaded from `_source` instead of failing the query. Hops run over
 * whatever index pattern the scenario names, and the fields they read are often not mapped:
 * integration templates map `entity.*` with `dynamic: false` and leave relationship fields
 * such as `entity.relationships.can_assume.entity.id` unmapped, and EUID evaluation references
 * identity fields (user.email, host.id, event.module, ...) that a given index may not map.
 * Loading reads what the documents actually carry; a field absent from `_source` is null.
 */
export const HOP_QUERY_PREAMBLE = 'SET unmapped_fields="load";';

const quoteField = (field: string): string => `\`${field}\``;

/**
 * `24h` -> `24 hours`, the time-span literal ES|QL accepts in `NOW() - <span>`.
 */
export const lookbackToEsqlSpan = (lookback: string): string => {
  const match = lookback.match(/^([0-9]{1,5})(m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid lookback "${lookback}"; expected <number>(m|h|d)`);
  }
  const unit = { m: 'minutes', h: 'hours', d: 'days' }[match[2] as 'm' | 'h' | 'd'];
  return `${match[1]} ${unit}`;
};

export interface HopQuery {
  query: string;
  params: string[];
}

/** What one hop query reads as the target: a stored field, or an EUID computed per document. */
export type HopTarget = { field: string } | { euid: EntityGraphTraversalEuidType };

type MatchField = NonNullable<TraversalHop['match_fields']>[number];

const IPV4_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6_PATTERN = /^[0-9A-Fa-f:.]+$/;

const isIpValue = (value: string): boolean =>
  IPV4_PATTERN.test(value) || (value.includes(':') && IPV6_PATTERN.test(value));

/**
 * The frontier values that may be bound to a `match_fields` entry. ES|QL casts bound strings
 * to the field's type and fails the whole query when one cannot be cast, so an entry that
 * declares `value_type: ip` only receives values shaped like an address.
 */
export const frontierForMatchField = (match: MatchField, frontier: string[]): string[] =>
  match.value_type === 'ip' ? frontier.filter(isIpValue) : frontier;

/**
 * Build the ES|QL query that expands `frontier` across one target field of a hop.
 *
 * The frontier is bound as positional parameters so ids are never interpolated into the
 * query text. Field names and the index pattern come from the scenario and are validated
 * against a conservative pattern before they get here; the scenario filter is trusted
 * (it ships inside Kibana) but is wrapped in parentheses and rejected if it contains a
 * pipe, so it can only ever narrow the hop's `WHERE`.
 *
 * Three ways to match the frontier:
 * - `match_field`: `WHERE field IN (...)`, a stored field, pushed down to Lucene.
 * - `match_fields`: `WHERE f1 IN (...) OR f2 IN (...)`, several stored fields; the source of
 *   each edge is whichever field matched, so a frontier that mixes value kinds (hashes and
 *   addresses) can be matched against the field that holds each kind.
 * - `match_euid`: the entity store's EUID for the named entity type is computed per document
 *   with the same identity rules the store and the entity graph use, and the frontier (EUIDs
 *   such as `user:john.doe@acme.com@okta`) is matched against it. Documents that carry no
 *   identity for that type are excluded first. The match runs after the evaluation, so this
 *   path scans the index rather than seeking by term; it is meant for the entity-document
 *   indices (an Okta user stream, the entity store) rather than high-volume event streams.
 *
 * Two kinds of target: a stored field (`MV_EXPAND`-ed, so each value is one edge) or an EUID
 * computed per document (`target: { euid }`), which makes the reached nodes entity store ids.
 */
export const buildHopQuery = ({
  hop,
  target: hopTarget,
  frontier,
  limit,
  lookback,
  exclusions = [],
}: {
  hop: TraversalHop;
  target: HopTarget;
  frontier: string[];
  limit: number;
  lookback?: string;
  exclusions?: TraversalExclusion[];
}): HopQuery => {
  if (frontier.length === 0) {
    throw new Error('Cannot build a hop query for an empty frontier');
  }
  const targetField = 'field' in hopTarget ? hopTarget.field : undefined;
  const target = targetField !== undefined ? quoteField(targetField) : HOP_TARGET_COLUMN;
  const targetDefinition =
    'euid' in hopTarget ? getBuiltInEntityDefinition(hopTarget.euid) : undefined;
  // A stored target must be present to read; an EUID target needs a document that carries an
  // identity for its type, and the computed column is checked after the evaluation. The
  // identity filter is an OR chain, so it is parenthesized before it is AND-ed to anything.
  const targetPresence =
    targetDefinition !== undefined
      ? `(${euid.esql.getEuidDocumentsContainsIdFilter(targetDefinition)})`
      : `${target} IS NOT NULL`;
  const payloadStats = hop.payload_fields.map(
    (field, index) => `${hopPayloadColumn(index)} = VALUES(${quoteField(field)})`
  );

  // Parameters are positional, so every value is registered in the order its `?` appears.
  const params: string[] = [];
  const placeholders = (values: string[]): string => {
    params.push(...values);
    return values.map(() => '?').join(', ');
  };
  // An exclusion on the target field is applied after MV_EXPAND so only the excluded value
  // is dropped, not every document that lists it among others. Any other field filters
  // whole documents.
  const targetExclusions =
    targetField !== undefined ? exclusions.filter((e) => e.field === targetField) : [];
  const documentExclusions = exclusions.filter((e) => e.field !== targetField);

  const lines = [HOP_QUERY_PREAMBLE, `FROM ${hop.index}`];
  let sourceGrouping: string;

  if (hop.match_euid !== undefined) {
    const definition = getBuiltInEntityDefinition(hop.match_euid);
    lines.push(
      `| WHERE (${euid.esql.getEuidDocumentsContainsIdFilter(definition)}) AND ${targetPresence}`
    );
    pushOptionalFilters(lines, hop, lookback);
    pushDocumentExclusions(lines, documentExclusions, placeholders);
    pushEuidEvaluation(lines, definition, HOP_SOURCE_COLUMN);
    lines.push(`| WHERE ${HOP_SOURCE_COLUMN} IN (${placeholders(frontier)})`);
    sourceGrouping = HOP_SOURCE_COLUMN;
  } else if (hop.match_fields !== undefined) {
    const clauses = hop.match_fields
      .map((match) => ({ match, values: frontierForMatchField(match, frontier) }))
      .filter(({ values }) => values.length > 0);
    if (clauses.length === 0) {
      throw new Error(`Hop "${hop.name}": no frontier value can be bound to its match_fields`);
    }
    const matchClause = (field: string, values: string[]): string =>
      `${quoteField(field)} IN (${placeholders(values)})`;
    lines.push(
      `| WHERE (${clauses
        .map(({ match, values }) => matchClause(match.field, values))
        .join(' OR ')}) AND ${targetPresence}`
    );
    pushOptionalFilters(lines, hop, lookback);
    pushDocumentExclusions(lines, documentExclusions, placeholders);
    // The source is whichever field matched. The arms repeat the match clauses so the ids are
    // bound again, in order; the last field is the default once every other clause failed.
    const arms = clauses
      .slice(0, -1)
      .flatMap(({ match, values }) => [
        matchClause(match.field, values),
        `TO_STRING(${quoteField(match.field)})`,
      ]);
    const last = clauses[clauses.length - 1].match.field;
    const sourceExpression =
      arms.length > 0
        ? `CASE(${[...arms, `TO_STRING(${quoteField(last)})`].join(', ')})`
        : `TO_STRING(${quoteField(last)})`;
    sourceGrouping = `${HOP_SOURCE_COLUMN} = ${sourceExpression}`;
  } else if (hop.match_field !== undefined) {
    const match = quoteField(hop.match_field);
    lines.push(`| WHERE ${match} IN (${placeholders(frontier)}) AND ${targetPresence}`);
    pushOptionalFilters(lines, hop, lookback);
    pushDocumentExclusions(lines, documentExclusions, placeholders);
    sourceGrouping = `${HOP_SOURCE_COLUMN} = ${match}`;
  } else {
    throw new Error(`Hop "${hop.name}" sets none of match_field, match_fields or match_euid`);
  }

  if (targetDefinition !== undefined) {
    pushEuidEvaluation(lines, targetDefinition, HOP_TARGET_COLUMN);
    lines.push(`| WHERE ${HOP_TARGET_COLUMN} IS NOT NULL`);
  }

  lines.push(`| MV_EXPAND ${target}`);
  for (const { values } of targetExclusions) {
    lines.push(`| WHERE NOT ${target} IN (${placeholders(values)})`);
  }
  const targetGrouping =
    target === HOP_TARGET_COLUMN ? HOP_TARGET_COLUMN : `${HOP_TARGET_COLUMN} = ${target}`;
  lines.push(
    `| STATS ${[`${HOP_COUNT_COLUMN} = COUNT(*)`, ...payloadStats].join(
      ', '
    )} BY ${sourceGrouping}, ${targetGrouping}`,
    `| LIMIT ${limit}`
  );

  return { query: lines.join('\n'), params };
};

/** The identity field evaluations and the typed EUID of `definition`, assigned to `column`. */
const pushEuidEvaluation = (
  lines: string[],
  definition: ReturnType<typeof getBuiltInEntityDefinition>,
  column: string
): void => {
  const fieldEvaluations = getFieldEvaluationsEsql(definition);
  if (fieldEvaluations) {
    lines.push(`| EVAL ${fieldEvaluations}`);
  }
  lines.push(`| EVAL ${euid.esql.getEuidEvaluation(definition, column, { withTypeId: true })}`);
};

/**
 * Documents carrying one of the excluded values are dropped. The filter is null-safe (a
 * document without the field passes) and multi-value safe (`IN` on a multi-valued field
 * yields null, `MV_CONTAINS` does not).
 */
const pushDocumentExclusions = (
  lines: string[],
  exclusions: TraversalExclusion[],
  placeholders: (values: string[]) => string
): void => {
  for (const { field, values } of exclusions) {
    const quoted = quoteField(field);
    const contains = values.map(() => `MV_CONTAINS(${quoted}, ?)`).join(' OR ');
    placeholders(values);
    lines.push(`| WHERE ${quoted} IS NULL OR NOT (${contains})`);
  }
};

const pushOptionalFilters = (lines: string[], hop: TraversalHop, lookback?: string): void => {
  if (hop.filter) {
    lines.push(`| WHERE (${hop.filter})`);
  }
  if (lookback && hop.time_field) {
    lines.push(`| WHERE ${quoteField(hop.time_field)} >= NOW() - ${lookbackToEsqlSpan(lookback)}`);
  }
};
