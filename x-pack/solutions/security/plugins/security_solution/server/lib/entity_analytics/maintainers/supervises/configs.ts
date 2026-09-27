/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common/domain/entity_index';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import type { RelationshipIntegrationConfig } from '../engine/types';
import { COMPOSITE_PAGE_SIZE } from '../engine/constants';
import { ENGINE_COLUMNS } from '../engine/columns';
import { buildRawIdentifiersExistenceGate } from '../engine/build_raw_identifiers_query';

const RELATIONSHIP_KEY = 'supervises';

/**
 * One source feeding `supervises` (user → user). Sources are structurally
 * identical — they flatten an expanded direct-reports array into the same three
 * raw_identifier fields — and differ only by `entitySource` and `namespace`.
 */
interface SupervisesSource {
  id: string;
  name: string;
  /**
   * `entity.source` values to match (any one). `entity.source` is derived from
   * `event.module ?? event.dataset ?? data_stream.dataset` (see
   * ENTITY_SOURCE_FIELD_EVALUATION), so depending on what the integration emits
   * it can be either the bare integration name or the full `<integration>.user`
   * dataset — both are listed so the match is robust to either.
   */
  entitySources: string[];
  /** Namespace suffix on the target user EUID (`user:<id>@<namespace>`). */
  namespace: string;
}

const SUPERVISES_EXISTENCE_FIELDS = ['user.email', 'user.id', 'user.name'];

const SUPERVISES_SOURCES: SupervisesSource[] = [
  {
    id: 'entityanalytics_okta',
    name: 'Okta Entity Analytics',
    entitySources: ['entityanalytics_okta', 'entityanalytics_okta.user'],
    namespace: 'okta',
  },
  {
    id: 'entityanalytics_entra_id',
    name: 'Entra ID Entity Analytics',
    entitySources: ['entityanalytics_entra_id', 'entityanalytics_entra_id.user'],
    namespace: 'entra_id',
  },
];

/**
 * Step 2 ES|QL. Differs from the generic `buildRawIdentifiersEsqlQuery` in two ways:
 *
 * 1. User EUIDs carry a namespace suffix (`user:<id>@<namespace>`), so each target
 *    is built as `CONCAT("user:", <value>, "@<namespace>")`.
 * 2. All three raw identifier fields (email, id, name) are unioned into one
 *    multi-valued column before a single MV_EXPAND. ES|QL `MV_APPEND(null, x)`
 *    returns null, so each field is appended only when non-null via a CASE guard.
 *    VALUES() in the STATS clause deduplicates identical EUIDs (e.g. when email
 *    and name hold the same value, as is common in Okta where login == email).
 */
function buildSupervisesEsqlQuery(
  source: SupervisesSource,
  namespace: string,
  lastProcessedTimestamp?: string
): string {
  const entityIndex = getEntitiesAlias(ENTITY_LATEST, namespace);
  const rawIdentifiersPrefix = `entity.relationships.${RELATIONSHIP_KEY}.raw_identifiers`;
  const emailField = `${rawIdentifiersPrefix}.user.email`;
  const idField = `${rawIdentifiersPrefix}.user.id`;
  const nameField = `${rawIdentifiersPrefix}.user.name`;
  const ns = source.namespace;

  const watermarkClause = lastProcessedTimestamp
    ? `\n    AND entity.lifecycle.last_seen > "${lastProcessedTimestamp}"`
    : '';

  const entitySourceList = source.entitySources.map((s) => `"${s}"`).join(', ');

  // Union all three raw fields into one multi-valued column before expanding.
  // ES|QL MV_APPEND(null, x) returns null, so the accumulator is built
  // incrementally: start with email (may be null), then append each subsequent
  // field only when the accumulator is non-null (CASE(acc IS NULL, field, MV_APPEND(acc, field)))
  // OR when the field itself is non-null. The streamlang Append transpiler uses
  // CASE(target IS NULL, newValue, MV_APPEND(target, newValue)) for exactly this.
  return `FROM ${entityIndex}
| WHERE (${emailField} IS NOT NULL OR ${idField} IS NOT NULL OR ${nameField} IS NOT NULL)
    AND entity.source IN (${entitySourceList})${watermarkClause}
| EVAL ${ENGINE_COLUMNS.actor} = entity.id
| EVAL rawTargetKey = CASE(${emailField} IS NULL, ${idField}, ${idField} IS NULL, ${emailField}, MV_APPEND(${emailField}, ${idField}))
| EVAL rawTargetKey = CASE(${nameField} IS NULL, rawTargetKey, rawTargetKey IS NULL, ${nameField}, MV_APPEND(rawTargetKey, ${nameField}))
| MV_EXPAND rawTargetKey
| EVAL targetEntityId = CONCAT("user:", rawTargetKey, "@${ns}")
| WHERE COALESCE(targetEntityId, "") != ""
    AND targetEntityId != "user:@${ns}"
    AND targetEntityId RLIKE ".+:.+@.+"
| STATS ${RELATIONSHIP_KEY} = VALUES(targetEntityId) BY ${ENGINE_COLUMNS.actor}
| WHERE COALESCE(${ENGINE_COLUMNS.actor}, "") != ""
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}

const WORKDAY_MANAGER_EMAIL_FIELD = 'workday.user.Manager_Email';
const WORKDAY_MANAGER_ID_FIELD = 'workday.user.Manager_ID';
const WORKDAY_NAMESPACE = 'workday';
const WORKDAY_ENTITY_SOURCE = 'workday';
/**
 * Step 2 row cap for the Workday config.
 *
 * Unlike every other maintainer, this config's actor EUID is NOT a function of a
 * single identity field: `MV_EXPAND managerKey` turns one composite bucket
 * `(Manager_Email, Manager_ID)` into up to two distinct `actorUserId` groups.
 * That breaks the "EUID collapse" invariant documented in
 * `engine/build_actor_discovery_query.ts`, which the shared `COMPOSITE_PAGE_SIZE`
 * limit assumes — a full page of 3500 buckets can produce up to 7000 grouped
 * rows, and a 3500 limit would silently discard half of them. Composite paging is
 * one-way (`after_key`), so the dropped actors are never revisited and their
 * reports are simply never written.
 *
 * The factor is the number of fields unioned into `managerKey`; keep it in sync
 * if another manager identifier is added.
 */
const WORKDAY_ACTOR_EXPANSION_FACTOR = 2;
const WORKDAY_ESQL_LIMIT = COMPOSITE_PAGE_SIZE * WORKDAY_ACTOR_EXPANSION_FACTOR;
/**
 * Generous against a 24h poll: tolerates sync outages and backfills without
 * losing relationships. Declared once as a day count so the DSL and ES|QL forms
 * of the same window cannot drift — Step 1 and Step 2 must narrow identically.
 */
const WORKDAY_INGESTED_LOOKBACK_DAYS = 30;
const WORKDAY_INGESTED_LOOKBACK_DSL = `now-${WORKDAY_INGESTED_LOOKBACK_DAYS}d`;
const WORKDAY_INGESTED_LOOKBACK_ESQL = `NOW() - ${WORKDAY_INGESTED_LOOKBACK_DAYS} day`;

/**
 * Step 2 ES|QL for Workday `supervises`.
 *
 * Workday emits one row per worker naming only that worker's manager, so the
 * relationship must be inverted: the row's own user is the TARGET and the
 * manager is the ACTOR.
 *
 * The actor is a union of two manager fields, which is why this is a
 * `kind: 'override'` config — the standard builder only `MV_EXPAND`s the target,
 * so a multi-valued actor would mis-group under `STATS ... BY actorUserId`.
 *
 * Expanding the actor also makes this the one config where a Step 1 bucket can
 * yield more than one `actorUserId`, so the Step 2 row cap is
 * `WORKDAY_ESQL_LIMIT` rather than the shared `COMPOSITE_PAGE_SIZE`. See that
 * constant for why reusing the page size silently drops managers.
 *
 * **Latest-row collapse is load-bearing, not an optimisation.** The CEL input
 * re-fetches the whole inventory on every poll, so the index accumulates one
 * document per worker per poll. Grouping those snapshots directly would emit a
 * worker under *every* manager they have ever had: if Alice's older row names
 * Bob and her newer row names Carol, both `user:bob@workday` and
 * `user:carol@workday` get Alice as a report. Writes are additive (nothing is
 * retracted), so that wrong edge is permanent. `VALUES()` cannot save us — it
 * deduplicates a report *within* one manager's group, never across groups.
 * The `LAST(managerKey, event.ingested) BY targetEntityId` stage therefore
 * collapses each worker to the manager named by their newest snapshot before the
 * actor is expanded and grouped.
 *
 * **Known limits of that collapse — it is per-page, not global.** The engine
 * passes `buildActorPageFilter` (`Manager_Email IN (…) OR Manager_ID IN (…)`) as
 * the ES|QL `filter` parameter, which applies at the source, before this query's
 * `STATS`. So `LAST` only ever sees a worker's snapshots whose manager is in the
 * page being processed. Cross-page reassignments and manager removals (both
 * previously tracked as open gaps) are now handled by the pre-run reset:
 * `resetRelationshipsBeforeRun` clears all Workday `supervises` edges once per
 * integration run, before pagination starts, so each run repopulates from a clean
 * slate. A run that fails partway leaves the relationship *incomplete* until the
 * next clean run — temporarily incomplete rather than permanently incorrect.
 * https://github.com/elastic/kibana/issues/292358 remains open for event-stream
 * sources, where absence carries no information and clearing would erase real
 * observations.
 *
 * **Why Workday is retractable in principle and `accesses` is not.** Unlike the
 * log-based maintainers, this source emits a *complete inventory* on every 24h
 * poll — a report, not a stream of occurrences. Absence is therefore positive
 * evidence: if a worker's newest row does not name Bob, Bob is genuinely no
 * longer their manager. Contrast `accesses` on `logs-system.auth`, where a login
 * is a historical fact that stays true forever and absence means only "not used
 * in this window". That is why the engine's additive default is correct there and
 * costly here, and it makes this config the motivating case for #292358.
 *
 * Snapshot semantics alone are not enough to retract, though. An authoritative
 * write (including `{ ids: [] }`, which `engine/update_entities.ts` deliberately
 * never emits) is only safe when the run holds the actor's *complete* target set
 * at write time. The engine streams writes per composite page, and this config's
 * `MV_EXPAND` + row cap mean a saturated page can return an incomplete group —
 * so an authoritative write over truncated output would delete real
 * relationships rather than merely leave stale ones. Any retraction work here
 * must resolve that first.
 *
 * `Worker_s_Manager` is deliberately unused: it is a display name
 * ("Alex Manager (000687)"), not a resolvable identifier.
 *
 * `user:<Manager_ID>@workday` will 404 when the manager entity is keyed by
 * email. That is the intended drop path for managers not in the store.
 */
function buildWorkdaySupervisesEsqlQuery(
  namespace: string,
  lastProcessedTimestamp?: string
): string {
  const logIndex = `logs-workday.user-${namespace}`;
  // The row's own user is the target, so the canonical helper applies directly —
  // it reproduces the full user EUID ranking and emits the entity.namespace
  // evaluation it depends on.
  const targetEuidEval = euid.esql.getEuidEvaluation('user', 'targetEntityId', {
    withTypeId: true,
  });
  // Presence of a watermark means this is not the first run: narrow to recently
  // re-synced workers. A fixed window (not `> lastProcessedTimestamp`) so a
  // delayed or skipped run cannot open a gap.
  const ingestedClause = lastProcessedTimestamp
    ? `\n    AND event.ingested >= ${WORKDAY_INGESTED_LOOKBACK_ESQL}`
    : '';

  return `FROM ${logIndex}
| WHERE (${WORKDAY_MANAGER_EMAIL_FIELD} IS NOT NULL OR ${WORKDAY_MANAGER_ID_FIELD} IS NOT NULL)${ingestedClause}
| EVAL ${targetEuidEval}
| WHERE COALESCE(targetEntityId, "") != ""
| EVAL managerKey = CASE(${WORKDAY_MANAGER_EMAIL_FIELD} IS NULL, ${WORKDAY_MANAGER_ID_FIELD}, ${WORKDAY_MANAGER_ID_FIELD} IS NULL, ${WORKDAY_MANAGER_EMAIL_FIELD}, MV_APPEND(${WORKDAY_MANAGER_EMAIL_FIELD}, ${WORKDAY_MANAGER_ID_FIELD}))
| STATS managerKey = LAST(managerKey, event.ingested) BY targetEntityId
| MV_EXPAND managerKey
| EVAL ${ENGINE_COLUMNS.actor} = CONCAT("user:", managerKey, "@${WORKDAY_NAMESPACE}")
| WHERE COALESCE(${ENGINE_COLUMNS.actor}, "") != ""
    AND ${ENGINE_COLUMNS.actor} != "user:@${WORKDAY_NAMESPACE}"
    AND ${ENGINE_COLUMNS.actor} RLIKE ".+:.+@.+"
| STATS ${RELATIONSHIP_KEY} = VALUES(targetEntityId) BY ${ENGINE_COLUMNS.actor}
| LIMIT ${WORKDAY_ESQL_LIMIT}`;
}

function buildWorkdaySupervisesConfig(
  lastProcessedTimestamp?: string
): RelationshipIntegrationConfig {
  return {
    kind: 'override',
    id: 'workday',
    name: 'Workday',
    indexPattern: (namespace) => `logs-workday.user-${namespace}`,
    targetEntityType: 'user',
    relationshipKey: RELATIONSHIP_KEY,
    // Managers, not reports: step 1 must bucket the actor.
    customActor: {
      fields: [WORKDAY_MANAGER_EMAIL_FIELD, WORKDAY_MANAGER_ID_FIELD],
    },
    // @timestamp is Hire_Date, so the engine's 30d lookback would select only
    // recently-hired workers. Replaced by the event.ingested window below.
    disableLookbackWindow: true,
    validateTargetIds: true,
    // Workday re-emits the complete inventory each poll, so absence from the
    // newest snapshot means the relationship ended. The engine cannot retract
    // (#292358), so clear this source's supervises edges and repopulate from
    // the current scan instead.
    resetRelationshipsBeforeRun: { entitySource: WORKDAY_ENTITY_SOURCE },
    compositeAggAdditionalFilters: [
      // Duplicates the actor-presence filter that `buildActorDiscoveryQuery` already
      // derives from `customActor.fields` (exists AND != "" per field, minimum_should_match 1).
      // Kept for explicitness and parity with the Entra ID `owns` config — not load-bearing.
      {
        bool: {
          should: [
            { exists: { field: WORKDAY_MANAGER_EMAIL_FIELD } },
            { exists: { field: WORKDAY_MANAGER_ID_FIELD } },
          ],
          minimum_should_match: 1,
        },
      },
      ...(lastProcessedTimestamp
        ? [{ range: { 'event.ingested': { gte: WORKDAY_INGESTED_LOOKBACK_DSL } } }]
        : []),
    ],
    esqlQueryOverride: (ns) => buildWorkdaySupervisesEsqlQuery(ns, lastProcessedTimestamp),
  };
}

function buildSupervisesConfig(
  source: SupervisesSource,
  lastProcessedTimestamp?: string
): RelationshipIntegrationConfig {
  return {
    kind: 'override',
    id: source.id,
    name: source.name,
    // Actors are entity docs, so Step 1 discovers by entity.id over the entity
    // index, and the entity-index @timestamp lookback is disabled in favour of a
    // last_seen watermark.
    indexPattern: (namespace) => getEntitiesAlias(ENTITY_LATEST, namespace),
    targetEntityType: 'user',
    relationshipKey: RELATIONSHIP_KEY,
    customActor: {
      fields: ['entity.id'],
    },
    disableLookbackWindow: true,
    validateTargetIds: true,
    compositeAggAdditionalFilters: [
      { terms: { 'entity.source': source.entitySources } },
      buildRawIdentifiersExistenceGate({
        relationshipKey: RELATIONSHIP_KEY,
        fields: SUPERVISES_EXISTENCE_FIELDS,
      }),
      ...(lastProcessedTimestamp
        ? [{ range: { 'entity.lifecycle.last_seen': { gt: lastProcessedTimestamp } } }]
        : []),
    ],
    esqlQueryOverride: (ns) => buildSupervisesEsqlQuery(source, ns, lastProcessedTimestamp),
  };
}

export function buildSupervisesConfigs(
  lastProcessedTimestamp?: string
): RelationshipIntegrationConfig[] {
  return [
    ...SUPERVISES_SOURCES.map((source) => buildSupervisesConfig(source, lastProcessedTimestamp)),
    buildWorkdaySupervisesConfig(lastProcessedTimestamp),
  ];
}

// Static export for tests that don't need a watermark.
export const SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS = buildSupervisesConfigs();
