/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { StreamsKnowledgeIndicatorsReader } from '@kbn/streams-plugin/server';
import {
  isAndCondition,
  isOrCondition,
  isNotCondition,
  isFilterCondition,
  isAlwaysCondition,
  isNeverCondition,
  type Condition,
  type FilterCondition,
} from '@kbn/streamlang';
import { entityStoreConditionToESQL } from '../../../common/esql/condition_to_esql';
import { castField } from '../../../common/esql/cast';
import { esqlIsNotNullOrEmpty } from '../../../common/esql/strings';
import { executeEsqlQuery } from '../../infra/elasticsearch/esql';
import type { IdentityLinkClue } from './load_entity_resolution_clues';
import type { IdentityLinkRule } from './load_identity_link_rules';

/**
 * Maximum distinct `(user_name, user_email)` pairs materialized per rule per
 * run. Bounds the ES|QL result and the downstream clue set; matches the
 * order-of-magnitude of the log-extraction `docsLimit` / feature-store limits.
 */
export const DEFAULT_MAX_LINK_PAIRS = 10_000;

/** Output column aliases used by the extraction query. */
const USER_NAME_COLUMN = 'user_name';
const USER_EMAIL_COLUMN = 'user_email';
const DOC_COUNT_COLUMN = 'doc_count';

/**
 * Safe ES field-path pattern. Rule field names are interpolated directly into
 * the ES|QL string, so they must be a plain dotted identifier — never a
 * function call, quote, or other ES|QL syntax. Anything else is rejected (the
 * rule is skipped) rather than escaped.
 */
const SAFE_FIELD_NAME = /^[a-zA-Z_][a-zA-Z0-9_.@-]*$/;

export const isSafeFieldName = (field: string): boolean => SAFE_FIELD_NAME.test(field);

/**
 * Removes every condition that references one of `fields` from a filter tree,
 * recomposing the surrounding `and` / `or` / `not` groups.
 *
 * The LLM attaches the *entity's* filter to the rule, and that filter is usually
 * scoped to the single discovered identity (e.g. `data_stream.dataset ==
 * "github.audit" AND user.name == "opauloh"`). Reusing it verbatim would pin the
 * deterministic extraction to one user, defeating the "every user in the stream"
 * goal. Stripping the identity-field conditions keeps the broad, stream-wide
 * scope (dataset / event.category) while dropping the per-user pin. The
 * identity fields are still required to be non-null by the extraction WHERE, so
 * removing them here never broadens beyond "rows that carry both identifiers".
 *
 * Returns `undefined` when nothing remains (i.e. the filter was only an identity
 * pin), meaning the extraction runs unscoped over the stream.
 */
export const stripIdentityFieldConditions = (
  condition: Condition,
  fields: ReadonlySet<string>
): Condition | undefined => {
  if (isAlwaysCondition(condition) || isNeverCondition(condition)) {
    return condition;
  }
  if (isFilterCondition(condition)) {
    return fields.has((condition as FilterCondition).field) ? undefined : condition;
  }
  if (isNotCondition(condition)) {
    const inner = stripIdentityFieldConditions(condition.not, fields);
    return inner ? { not: inner } : undefined;
  }
  if (isAndCondition(condition)) {
    const kept = condition.and
      .map((child) => stripIdentityFieldConditions(child, fields))
      .filter((child): child is Condition => child !== undefined);
    if (kept.length === 0) return undefined;
    return kept.length === 1 ? kept[0] : { and: kept };
  }
  if (isOrCondition(condition)) {
    const kept = condition.or
      .map((child) => stripIdentityFieldConditions(child, fields))
      .filter((child): child is Condition => child !== undefined);
    if (kept.length === 0) return undefined;
    return kept.length === 1 ? kept[0] : { or: kept };
  }
  return condition;
};

/**
 * Builds the deterministic identity-link extraction ES|QL for one rule:
 *
 * ```
 * FROM <indexPatterns>
 * | WHERE (<filter>) AND <nameField> not null/empty AND <emailField> not null/empty
 * | STATS doc_count = COUNT(*) BY user_name = TO_STRING(<nameField>), user_email = TO_STRING(<emailField>)
 * | LIMIT <limit>
 * ```
 *
 * Returns the unique `(user_name, user_email)` pairs (with an observation count)
 * across the whole stream — the deterministic equivalent of the per-user
 * `identity_link` clue, for every user.
 *
 * Throws if either field name is unsafe; callers should pre-filter with
 * {@link isSafeFieldName}.
 */
export const buildIdentityLinkExtractionEsql = (
  rule: IdentityLinkRule,
  indexPatterns: string[],
  limit: number = DEFAULT_MAX_LINK_PAIRS
): string => {
  if (!isSafeFieldName(rule.userNameField) || !isSafeFieldName(rule.userEmailField)) {
    throw new Error(
      `[buildIdentityLinkExtractionEsql] unsafe field name(s): ` +
        `${rule.userNameField} / ${rule.userEmailField}`
    );
  }

  const whereParts: string[] = [];
  if (rule.filter) {
    // Strip the per-identity pin (e.g. `user.name == "opauloh"`) so the rule
    // applies to every user in the stream, keeping only the broad scope.
    const scopeFilter = stripIdentityFieldConditions(
      rule.filter,
      new Set([rule.userNameField, rule.userEmailField])
    );
    if (scopeFilter) {
      whereParts.push(`(${entityStoreConditionToESQL(scopeFilter)})`);
    }
  }
  whereParts.push(esqlIsNotNullOrEmpty(rule.userNameField));
  whereParts.push(esqlIsNotNullOrEmpty(rule.userEmailField));

  return [
    `FROM ${indexPatterns.join(', ')}`,
    `| WHERE ${whereParts.join(' AND ')}`,
    `| STATS ${DOC_COUNT_COLUMN} = COUNT(*) BY ${USER_NAME_COLUMN} = ${castField(
      rule.userNameField
    )}, ${USER_EMAIL_COLUMN} = ${castField(rule.userEmailField)}`,
    `| LIMIT ${limit}`,
  ].join('\n');
};

export interface ExtractIdentityLinkCluesDeps {
  esClient: ElasticsearchClient;
  reader: StreamsKnowledgeIndicatorsReader;
  rules: IdentityLinkRule[];
  logger: Logger;
  abortController: AbortController;
  /** Per-rule cap on materialized pairs. Defaults to {@link DEFAULT_MAX_LINK_PAIRS}. */
  maxPairsPerRule?: number;
}

const asStringValues = (cell: unknown): string[] => {
  if (cell === null || cell === undefined) {
    return [];
  }
  const values = Array.isArray(cell) ? cell : [cell];
  return values.filter((value): value is string => typeof value === 'string');
};

/**
 * Confirms both rule fields exist in the stream's mapping before querying, so a
 * stale rule (the field was renamed/removed) is skipped instead of producing an
 * ES|QL error or — worse — silently matching nothing.
 */
const ruleFieldsExist = async (
  esClient: ElasticsearchClient,
  indexPatterns: string[],
  rule: IdentityLinkRule,
  logger: Logger
): Promise<boolean> => {
  try {
    const caps = await esClient.fieldCaps({
      index: indexPatterns,
      fields: [rule.userNameField, rule.userEmailField],
      ignore_unavailable: true,
    });
    const present = caps.fields ?? {};
    const missing = [rule.userNameField, rule.userEmailField].filter(
      (field) => present[field] === undefined
    );
    if (missing.length > 0) {
      logger.warn(
        `extractIdentityLinkClues: rule on '${rule.streamName}' references field(s) ` +
          `not present in the mapping: ${missing.join(', ')} — skipping`
      );
      return false;
    }
    return true;
  } catch (err) {
    logger.warn(
      `extractIdentityLinkClues: field_caps check failed for '${rule.streamName}': ` +
        `${err?.message ?? err} — skipping rule`
    );
    return false;
  }
};

/**
 * Executes identity-link *rules* deterministically against their streams and
 * returns materialized {@link IdentityLinkClue}s — one per distinct, valid
 * `(user_name, user_email)` pair observed across the entire stream, for EVERY
 * user (no sampling).
 *
 * Per rule: validates field names, confirms both fields exist (field_caps),
 * builds + runs the extraction ES|QL, then maps rows to clues reusing the same
 * normalization as the per-user clue loader (lower-case both sides, require an
 * `@` in the email). Results are deduplicated by `(userName, userEmail)`,
 * keeping the highest-confidence source rule.
 */
export const extractIdentityLinkClues = async (
  deps: ExtractIdentityLinkCluesDeps
): Promise<IdentityLinkClue[]> => {
  const { esClient, reader, rules, logger, abortController, maxPairsPerRule } = deps;
  const limit = maxPairsPerRule ?? DEFAULT_MAX_LINK_PAIRS;

  const byPair = new Map<string, IdentityLinkClue>();

  for (const rule of rules) {
    if (abortController.signal.aborted) {
      logger.debug('extractIdentityLinkClues: aborted mid-run');
      break;
    }

    if (!isSafeFieldName(rule.userNameField) || !isSafeFieldName(rule.userEmailField)) {
      logger.warn(
        `extractIdentityLinkClues: rule on '${rule.streamName}' has unsafe field name(s) ` +
          `('${rule.userNameField}' / '${rule.userEmailField}') — skipping`
      );
      continue;
    }

    const indexPatterns = await reader.resolveIndexPatterns(rule.streamName);
    if (indexPatterns.length === 0) {
      logger.debug(
        `extractIdentityLinkClues: stream '${rule.streamName}' has no backing index — skipping rule`
      );
      continue;
    }

    if (!(await ruleFieldsExist(esClient, indexPatterns, rule, logger))) {
      continue;
    }

    const query = buildIdentityLinkExtractionEsql(rule, indexPatterns, limit);
    let response: ESQLSearchResponse;
    try {
      response = await executeEsqlQuery({ esClient, query, abortController });
    } catch (err) {
      logger.warn(
        `extractIdentityLinkClues: extraction query failed for '${rule.streamName}': ` +
          `${err?.message ?? err} — skipping rule`
      );
      continue;
    }

    const nameIdx = response.columns.findIndex((col) => col.name === USER_NAME_COLUMN);
    const emailIdx = response.columns.findIndex((col) => col.name === USER_EMAIL_COLUMN);
    if (nameIdx === -1 || emailIdx === -1) {
      logger.warn(
        `extractIdentityLinkClues: extraction response for '${rule.streamName}' missing expected columns — skipping`
      );
      continue;
    }

    let pairsFromRule = 0;
    const usersFromRule = new Set<string>();

    for (const row of response.values) {
      for (const rawName of asStringValues(row[nameIdx])) {
        const userName = rawName.trim().toLowerCase();
        if (!userName) {
          continue;
        }
        for (const rawEmail of asStringValues(row[emailIdx])) {
          const userEmail = rawEmail.trim().toLowerCase();
          if (!userEmail || !userEmail.includes('@')) {
            continue;
          }

          const key = `${userName}\u0000${userEmail}`;
          const existing = byPair.get(key);
          if (
            !existing ||
            rule.confidence > existing.confidence ||
            (rule.confidence === existing.confidence && rule.featureUuid < existing.featureUuid)
          ) {
            byPair.set(key, {
              userName,
              userEmail,
              ...(rule.namespaceHint ? { namespaceHint: rule.namespaceHint } : {}),
              featureUuid: rule.featureUuid,
              streamName: rule.streamName,
              confidence: rule.confidence,
            });
          }
          pairsFromRule++;
          usersFromRule.add(userName);
        }
      }
    }

    // Dry-run-style visibility: a rule that would link many users at once is the
    // high-blast-radius case operators care about.
    logger.debug(
      `extractIdentityLinkClues: rule on '${rule.streamName}' ` +
        `(${rule.userNameField} -> ${rule.userEmailField}) yielded ${pairsFromRule} pair(s) ` +
        `across ${usersFromRule.size} username(s)`
    );
  }

  const clues = Array.from(byPair.values());
  logger.debug(
    `extractIdentityLinkClues: ${clues.length} deterministic clue(s) from ${rules.length} rule(s)`
  );

  return clues;
};
