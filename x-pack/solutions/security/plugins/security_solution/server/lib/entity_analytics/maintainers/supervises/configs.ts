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
| EVAL managerKey = CASE(${WORKDAY_MANAGER_EMAIL_FIELD} IS NULL, ${WORKDAY_MANAGER_ID_FIELD}, ${WORKDAY_MANAGER_ID_FIELD} IS NULL, ${WORKDAY_MANAGER_EMAIL_FIELD}, MV_APPEND(${WORKDAY_MANAGER_EMAIL_FIELD}, ${WORKDAY_MANAGER_ID_FIELD}))
| MV_EXPAND managerKey
| EVAL ${ENGINE_COLUMNS.actor} = CONCAT("user:", managerKey, "@${WORKDAY_NAMESPACE}")
| WHERE COALESCE(${ENGINE_COLUMNS.actor}, "") != ""
    AND ${ENGINE_COLUMNS.actor} != "user:@${WORKDAY_NAMESPACE}"
    AND ${ENGINE_COLUMNS.actor} RLIKE ".+:.+@.+"
    AND COALESCE(targetEntityId, "") != ""
| STATS ${RELATIONSHIP_KEY} = VALUES(targetEntityId) BY ${ENGINE_COLUMNS.actor}
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
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
