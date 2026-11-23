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

/**
 * Resolves the four actor/target ES|QL fragments that vary by config. Everything
 * else in the pipeline (WHERE composition, MV_EXPAND, STATS, LIMIT) is identical
 * across configs, so it lives in `buildRelationshipEsql` and is shared.
 *
 * `hostScopedUsersOnly` configs get minimized fragments from
 * `euid.experimental.getHostScopedUserEuidEsql()` — ~2 EVAL columns per row instead of ~35,
 * measured ~26× faster on logs-system.auth (~700M docs, 30d lookback). See
 * `hostScopedUsersOnly` in `types.ts` for the data assumptions that make this valid.
 *
 * `config.customActor.fields` is deliberately ignored for those configs: which
 * fields form the host-scoped user EUID is a property of the entity definition,
 * not of the integration. Configs still declare `customActor.fields` because the
 * Step 1 composite-agg builder uses them as bucket sources.
 */
function resolveActorAndTargetEsql(
  config: StandardRelationshipIntegrationConfig | BucketedRelationshipIntegrationConfig
): {
  actorPresenceGate: string;
  actorEvalLines: string;
  targetGateLine: string;
  targetEvalClause: string;
} {
  if (config.hostScopedUsersOnly) {
    const { evalAssignment, presenceGate } = euid.experimental.getHostScopedUserEuidEsql();

    return {
      // Requires both `user.name` and `host.id`. For a host target that doubles as
      // the target gate — `host.id` is the only field either EUID reads — so
      // `targetGateLine` stays empty rather than emitting a redundant check.
      actorPresenceGate: presenceGate,
      actorEvalLines: `| EVAL ${ENGINE_COLUMNS.actor} = ${evalAssignment}`,
      targetGateLine:
        config.requireTargetEntityIdExists && config.targetEntityType !== 'host'
          ? `    AND (${euid.esql.getEuidDocumentsContainsIdFilter(config.targetEntityType)})\n`
          : '',
      targetEvalClause:
        config.targetEntityType === 'host'
          ? `| EVAL targetEntityId = CONCAT("host:", TO_STRING(\`host.id\`))`
          : `| EVAL ${euid.esql.getEuidEvaluation(config.targetEntityType, 'targetEntityId', {
              withTypeId: true,
            })}`,
    };
  }

  // TODO(#266748): 'user' hardcoded for actor — thread actorEntityType through config.
  const userFieldEvals = !config.customActor?.evalOverride
    ? getFieldEvaluationsEsql('user')
    : undefined;
  const userFieldEvalsLine = userFieldEvals ? `| EVAL ${userFieldEvals}\n` : '';
  const actorEvalClause = config.customActor?.evalOverride
    ? `| EVAL ${ENGINE_COLUMNS.actor} = ${config.customActor.evalOverride}`
    : `| EVAL ${euid.esql.getEuidEvaluation('user', ENGINE_COLUMNS.actor, { withTypeId: true })}`;

  return {
    actorPresenceGate: config.customActor
      ? buildAnyActorFieldNonEmptyEsql(config.customActor.fields)
      : euid.esql.getEuidDocumentsContainsIdFilter('user'),
    actorEvalLines: `${userFieldEvalsLine}${actorEvalClause}`,
    targetGateLine: config.requireTargetEntityIdExists
      ? `    AND (${euid.esql.getEuidDocumentsContainsIdFilter(config.targetEntityType)})\n`
      : '',
    targetEvalClause: config.targetEvalOverride
      ? `| EVAL targetEntityId = ${config.targetEvalOverride}`
      : `| EVAL ${euid.esql.getEuidEvaluation(config.targetEntityType, 'targetEntityId', {
          withTypeId: true,
        })}`,
  };
}

function buildRelationshipEsql(
  config: StandardRelationshipIntegrationConfig | BucketedRelationshipIntegrationConfig,
  namespace: string
): string {
  const indexPattern = config.indexPattern(namespace);
  const { actorPresenceGate, actorEvalLines, targetGateLine, targetEvalClause } =
    resolveActorAndTargetEsql(config);
  const additionalTargetFilter = config.additionalTargetFilter
    ? `\n    ${config.additionalTargetFilter}`
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
    AND (${actorPresenceGate})
${targetGateLine}${actorEvalLines}
| WHERE COALESCE(${ENGINE_COLUMNS.actor}, "") != ""
${targetEvalClause}
| MV_EXPAND targetEntityId
| WHERE COALESCE(targetEntityId, "") != ""${additionalTargetFilter}
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
 * - `kind: 'standard' | 'bucketed'` → uses `buildRelationshipEsql`, which routes
 *   its actor/target fragments through `resolveActorAndTargetEsql`. Configs with
 *   `hostScopedUsersOnly` get the minimized host-scoped fragments there.
 */
export const buildTargetsPerActorQuery = (
  config: RelationshipIntegrationConfig,
  namespace: string
): string => {
  const body =
    config.kind === 'override'
      ? config.esqlQueryOverride(namespace)
      : buildRelationshipEsql(config, namespace);
  return `${ESQL_ENGINE_PREAMBLE}\n${body}`;
};
