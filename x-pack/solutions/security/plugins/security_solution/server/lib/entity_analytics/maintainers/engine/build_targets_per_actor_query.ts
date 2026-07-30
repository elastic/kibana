/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';
import { getFieldEvaluationsEsql } from '@kbn/entity-store/common/domain/euid';

import type {
  RelationshipIntegrationConfig,
  StandardRelationshipIntegrationConfig,
  BucketedRelationshipIntegrationConfig,
} from './types';
import { COMPOSITE_PAGE_SIZE, ESQL_ENGINE_PREAMBLE } from './constants';
import { ENGINE_COLUMNS } from './columns';

/**
 * "At least one of these fields exists and is non-empty" ES|QL fragment.
 *
 * Used as the actor-presence gate (the `AND (...)` clause appended after
 * `esqlWhereClause`) when the config supplies its own `customActor.fields`.
 * The default path (no `customActor`) keeps using
 * `euid.esql.getEuidDocumentsContainsIdFilter('user')` — same rationale as
 * the parallel helper in `build_actor_discovery_query.ts`. Today no shipped
 * `kind: 'standard' | 'bucketed'` config combines `customActor` with the
 * default builder, but Step 1 and Step 2 must agree about the actor-presence
 * gate so the inconsistency cannot reappear silently in a future config.
 *
 * Identifiers are backtick-wrapped so dotted-numeric segments (rare for
 * actor fields today, but cheap insurance) round-trip safely.
 */
function buildAnyActorFieldNonEmptyEsql(fields: string[]): string {
  return fields.map((field) => `(\`${field}\` IS NOT NULL AND \`${field}\` != "")`).join(' OR ');
}

function buildRelationshipEsql(
  config: StandardRelationshipIntegrationConfig | BucketedRelationshipIntegrationConfig,
  namespace: string
): string {
  const indexPattern = config.indexPattern(namespace);
  // TODO(#266748): 'user' hardcoded for actor — thread actorEntityType through config.
  const userFieldEvals = !config.customActor?.evalOverride
    ? getFieldEvaluationsEsql('user')
    : undefined;
  const userFieldEvalsLine = userFieldEvals ? `| EVAL ${userFieldEvals}\n` : '';
  const userIdFilter = config.customActor
    ? buildAnyActorFieldNonEmptyEsql(config.customActor.fields)
    : euid.esql.getEuidDocumentsContainsIdFilter('user');
  const actorEvalClause = config.customActor?.evalOverride
    ? `| EVAL ${ENGINE_COLUMNS.actor} = ${config.customActor.evalOverride}`
    : `| EVAL ${euid.esql.getEuidEvaluation('user', ENGINE_COLUMNS.actor, { withTypeId: true })}`;
  const targetEvalClause = config.targetEvalOverride
    ? `| EVAL targetEntityId = ${config.targetEvalOverride}`
    : `| EVAL ${euid.esql.getEuidEvaluation(config.targetEntityType, 'targetEntityId', {
        withTypeId: true,
      })}`;
  const additionalTargetFilter = config.additionalTargetFilter
    ? `\n    ${config.additionalTargetFilter}`
    : '';

  const targetIdFilterLine = config.requireTargetEntityIdExists
    ? `    AND (${euid.esql.getEuidDocumentsContainsIdFilter(config.targetEntityType)})\n`
    : '';

  const statsClause =
    config.kind === 'bucketed'
      ? (() => {
          const {
            threshold,
            aboveThresholdRelationship: above,
            belowThresholdRelationship: below,
          } = config.bucketTargetByThreshold;
          const aboveCol = ENGINE_COLUMNS.bucketAbove(above);
          const belowCol = ENGINE_COLUMNS.bucketBelow(below);
          return `| STATS access_count = COUNT(*) BY ${ENGINE_COLUMNS.actor}, targetEntityId
| EVAL access_type = CASE(
    access_count >= ${threshold}, "${above}",
    "${below}"
  )
| STATS targets = VALUES(targetEntityId) BY access_type, ${ENGINE_COLUMNS.actor}
| STATS
    ${aboveCol} = VALUES(targets) WHERE access_type == "${above}",
    ${belowCol} = VALUES(targets) WHERE access_type == "${below}"
  BY ${ENGINE_COLUMNS.actor}`;
        })()
      : `| STATS ${ENGINE_COLUMNS.flat(config.relationshipKey)} = VALUES(targetEntityId) BY ${
          ENGINE_COLUMNS.actor
        }`;

  // NOTE: We use `COALESCE(col, "") != ""` rather than the more natural
  // `col IS NOT NULL AND col != ""` because ES|QL has a quirk where
  // `WHERE col IS NOT NULL` evaluates to FALSE for all rows when `col` is
  // produced by a CONCAT() over a CASE() expression with nested CASE arms
  // (as our user EUID actorEval does). That would silently drop every row
  // from the pipeline. COALESCE is semantically equivalent to the original
  // intent (treat NULL as empty, then check non-empty) and sidesteps the bug.
  return `FROM ${indexPattern}
| WHERE ${config.esqlWhereClause}
    AND (${userIdFilter})
${targetIdFilterLine}${userFieldEvalsLine}${actorEvalClause}
| WHERE COALESCE(${ENGINE_COLUMNS.actor}, "") != ""
${targetEvalClause}
| MV_EXPAND targetEntityId
| WHERE COALESCE(targetEntityId, "") != ""${additionalTargetFilter}
${statsClause}
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}

/**
 * Minimized ES|QL builder for local-namespace configs (system_auth, system_security).
 *
 * Skips the full namespace/EUID EVAL chain. Hardcodes `@local` as namespace,
 * reads only `user.email`, `user.name`, `host.id`. Measured ~26× faster than
 * the full builder on logs-system.auth (~700M docs, 30d lookback).
 *
 * Only valid for integrations whose data exclusively uses the `@local`
 * namespace. The flag `localNamespaceFastPath` on the config opts in.
 */
function buildLocalNamespaceFastPathEsql(
  config: StandardRelationshipIntegrationConfig | BucketedRelationshipIntegrationConfig,
  namespace: string
): string {
  const indexPattern = config.indexPattern(namespace);
  const actorFields = config.customActor?.fields ?? ['user.email', 'user.name'];

  const actorPresenceGate = actorFields
    .map((f) => `(\`${f}\` IS NOT NULL AND \`${f}\` != "")`)
    .join(' OR ');

  // For host-targeted configs with requireTargetEntityIdExists, gate on host.id directly
  // (avoids the full EUID-exists DSL — we know the target is always host.id for these configs).
  const targetGate =
    config.requireTargetEntityIdExists && config.targetEntityType === 'host'
      ? '\n    AND (`host.id` IS NOT NULL AND `host.id` != "")'
      : '';

  // Actor EUID: CONCAT("user:", COALESCE(user.email, user.name), "@", host.id, "@local")
  // Uses COALESCE over actor fields in declaration order.
  const coalesceArgs = actorFields.map((f) => `TO_STRING(\`${f}\`)`).join(', ');
  const actorEval = `| EVAL ${ENGINE_COLUMNS.actor} = CONCAT("user:", COALESCE(${coalesceArgs}), "@", TO_STRING(\`host.id\`), "@local")`;

  const targetEval =
    config.targetEntityType === 'host'
      ? `| EVAL targetEntityId = CONCAT("host:", TO_STRING(\`host.id\`))`
      : `| EVAL ${euid.esql.getEuidEvaluation(config.targetEntityType, 'targetEntityId', { withTypeId: true })}`;

  const statsClause =
    config.kind === 'bucketed'
      ? (() => {
          const {
            threshold,
            aboveThresholdRelationship: above,
            belowThresholdRelationship: below,
          } = config.bucketTargetByThreshold;
          const aboveCol = ENGINE_COLUMNS.bucketAbove(above);
          const belowCol = ENGINE_COLUMNS.bucketBelow(below);
          return `| STATS access_count = COUNT(*) BY ${ENGINE_COLUMNS.actor}, targetEntityId
| EVAL access_type = CASE(
    access_count >= ${threshold}, "${above}",
    "${below}"
  )
| STATS targets = VALUES(targetEntityId) BY access_type, ${ENGINE_COLUMNS.actor}
| STATS
    ${aboveCol} = VALUES(targets) WHERE access_type == "${above}",
    ${belowCol} = VALUES(targets) WHERE access_type == "${below}"
  BY ${ENGINE_COLUMNS.actor}`;
        })()
      : `| STATS ${ENGINE_COLUMNS.flat(config.relationshipKey)} = VALUES(targetEntityId) BY ${ENGINE_COLUMNS.actor}`;

  return `FROM ${indexPattern}
| WHERE ${config.esqlWhereClause}
    AND (${actorPresenceGate})${targetGate}
${actorEval}
| WHERE COALESCE(${ENGINE_COLUMNS.actor}, "") != ""
${targetEval}
| MV_EXPAND targetEntityId
| WHERE COALESCE(targetEntityId, "") != ""
${statsClause}
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}

/**
 * Builds the ES|QL query for the given integration config.
 *
 * The engine always prepends `ESQL_ENGINE_PREAMBLE` to the result so that
 * `IS NOT NULL` / `COALESCE` semantics are consistent across queries —
 * override authors cannot accidentally omit it.
 *
 * - `kind: 'override'` → delegates the body to `config.esqlQueryOverride(namespace)`.
 *   The override must emit columns `actorUserId` and `<relationshipKey>`
 *   (e.g. `communicates_with`); mismatched column names produce silent empty
 *   results (see `parseTargetsPerActorRows` for the warning safety net).
 *   Override functions MUST NOT include `SET unmapped_fields="nullify"`
 *   themselves — the engine prepends it.
 * - `kind: 'standard' | 'bucketed'` with `localNamespaceFastPath` → uses the
 *   minimized fast-path builder (skips namespace/EUID EVAL chain, hardcodes
 *   `@local`). Measured ~26× faster on large indices.
 * - `kind: 'standard' | 'bucketed'` → uses the default ES|QL builder.
 */
export const buildTargetsPerActorQuery = (
  config: RelationshipIntegrationConfig,
  namespace: string
): string => {
  let body: string;
  if (config.kind === 'override') {
    body = config.esqlQueryOverride(namespace);
  } else if (config.localNamespaceFastPath) {
    body = buildLocalNamespaceFastPathEsql(config, namespace);
  } else {
    body = buildRelationshipEsql(config, namespace);
  }
  return `${ESQL_ENGINE_PREAMBLE}\n${body}`;
};
