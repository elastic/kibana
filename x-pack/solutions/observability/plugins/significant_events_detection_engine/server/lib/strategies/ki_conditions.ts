/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, EsqlQuery } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryLink } from '@kbn/significant-events-schema';
import { mapWithConcurrency } from '../concurrency';
import { getErrorMessage } from '../errors';
import { queryRows } from '../esql';

/** Validation queries run at reconciliation only, a few at a time. */
const VALIDATION_CONCURRENCY = 5;

/** A match KI reduced to the condition it filters its source with. */
export interface KiCondition {
  link: QueryLink;
  /** The KI's WHERE clauses, each in parentheses and joined with AND. */
  condition: string;
}

/** Why a KI query cannot be counted by the engine's shared rule. */
export interface KiConditionSkip {
  link: QueryLink;
  reason: string;
}

/**
 * Extracts the filter of a match KI. Only `FROM <the source's view> | WHERE ... [| WHERE ...]`
 * qualifies: the condition then means the same thing inside one shared `STATS ... WHERE`, so a
 * single rule can count every KI of a source. Anything else (EVAL, a different FROM) is skipped
 * rather than rewritten, because rewriting could change what the KI matches.
 */
export function extractKiCondition(
  link: QueryLink,
  viewName: string
): KiCondition | KiConditionSkip {
  const query = EsqlQuery.fromSrc(link.query.esql.query);
  if (query.errors.length > 0) {
    return { link, reason: `does not parse: ${query.errors[0].message}` };
  }
  const [from, ...rest] = query.ast.commands;
  if (!from || from.name !== 'from') {
    return { link, reason: 'does not start with FROM' };
  }
  if (BasicPrettyPrinter.command(from) !== `FROM ${viewName}`) {
    return { link, reason: 'reads something other than its source' };
  }
  if (rest.length === 0 || rest.some((command) => command.name !== 'where')) {
    return { link, reason: 'is more than FROM and WHERE' };
  }
  return {
    link,
    // Printing the whole command keeps to the parser's public types; only the keyword is cut.
    condition: rest
      .map((command) => `(${BasicPrettyPrinter.command(command).replace(/^WHERE\s+/i, '')})`)
      .join(' AND '),
  };
}

/**
 * Drops conditions the source cannot evaluate, such as a KI naming a field that no longer
 * exists. One bad condition would otherwise fail the whole shared rule.
 */
export async function validateKiConditions({
  esClient,
  viewName,
  conditions,
  signal,
}: {
  esClient: ElasticsearchClient;
  viewName: string;
  conditions: KiCondition[];
  signal: AbortSignal;
}): Promise<{ valid: KiCondition[]; invalid: KiConditionSkip[] }> {
  const results = await mapWithConcurrency(
    conditions,
    VALIDATION_CONCURRENCY,
    async (item): Promise<KiCondition | KiConditionSkip> => {
      try {
        await queryRows({
          esClient,
          query: `FROM ${viewName}\n| WHERE ${item.condition}\n| LIMIT 0`,
          signal,
        });
        return item;
      } catch (error) {
        return { link: item.link, reason: getErrorMessage(error).slice(0, 200) };
      }
    }
  );
  return {
    valid: results.filter((item): item is KiCondition => 'condition' in item),
    invalid: results.filter((item): item is KiConditionSkip => 'reason' in item),
  };
}
