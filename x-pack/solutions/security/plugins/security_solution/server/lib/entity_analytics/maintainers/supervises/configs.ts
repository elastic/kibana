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
  {
    id: 'sailpoint_identity_sc',
    name: 'SailPoint Identity Security Cloud',
    // `entity.source` comes from `event.module`, which is the bare package name;
    // the `.identities` dataset form is listed for the case where it is absent.
    entitySources: ['sailpoint_identity_sc', 'sailpoint_identity_sc.identities'],
    namespace: 'sailpoint_identity_sc',
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
 * 3. Empty-string raw values are dropped right after the expand. A raw `""` is not
 *    null, so the `IS NOT NULL` gates keep it (SailPoint's CEL emits `""` for a
 *    report without an email) and it would otherwise reach the EUID build.
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
| WHERE rawTargetKey != ""
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
 * Every row is one actor, and `scopeToPageActorValues` keeps only actors whose
 * manager value is one of the page's bucket values. A bucket
 * `(Manager_Email, Manager_ID)` carries at most one value per field, so a page
 * yields at most `COMPOSITE_PAGE_SIZE × WORKDAY_ACTOR_EXPANSION_FACTOR` rows and
 * this LIMIT never truncates. Composite paging is one-way (`after_key`), so a
 * truncated row would be a manager whose reports are never written.
 *
 * Must stay ≤ 10,000: ES|QL silently caps any higher LIMIT at
 * `esql.query.result_truncation_max_size`.
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
 * Expanding the actor also means a document matched through one manager field
 * contributes its other field's value, which can belong to another page (a
 * manager whose email changed within the window, or an email on a page
 * boundary). Those rows have no bound, so the grouped rows are filtered to the
 * page's own values (`scopeToPageActorValues`). Nothing is lost: every document
 * naming a value matches the page filter on that value's own page, so its full
 * set of reports is built there. See `WORKDAY_ESQL_LIMIT` for the resulting cap.
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
 * page being processed. When a worker moves between managers on different pages,
 * the previous manager's page sees only the old snapshot and attributes the
 * worker to them again, until that snapshot leaves the `event.ingested` window.
 * `resetRelationshipsBeforeRun` clears all Workday `supervises` relationships
 * once per integration run, before pagination starts, so that staleness lasts at
 * most the window instead of forever. A run that fails partway leaves the
 * relationship *incomplete* until the next clean run.
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
 * at write time. The engine streams writes per composite page, and the per-page
 * collapse above can still attribute a worker to a previous manager, so any
 * retraction work here must resolve that first.
 *
 * `Worker_s_Manager` is deliberately unused: it is a display name
 * ("Alex Manager (000687)"), not a resolvable identifier.
 *
 * `user:<Manager_ID>@workday` will 404 when the manager entity is keyed by
 * email. That is the intended drop path for managers not in the store.
 */
function buildWorkdaySupervisesEsqlQuery(
  namespace: string,
  pageActorValues: readonly string[],
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
  // `actorUserId` is derived from `managerKey` alone, so grouping by both groups
  // exactly as by `actorUserId`; `managerKey` is kept so the page scope can
  // compare raw values. Scoping after the final STATS checks one row per actor
  // instead of one per expanded worker row.
  const pageActorParams = pageActorValues.map(() => '?').join(', ');

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
| STATS ${RELATIONSHIP_KEY} = VALUES(targetEntityId) BY ${ENGINE_COLUMNS.actor}, managerKey
| WHERE managerKey IN (${pageActorParams})
| DROP managerKey
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
    // Required for the Step 2 row bound; see `WORKDAY_ESQL_LIMIT`.
    scopeToPageActorValues: true,
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
    esqlQueryOverride: (ns, pageActorValues = []) =>
      buildWorkdaySupervisesEsqlQuery(ns, pageActorValues, lastProcessedTimestamp),
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
