/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestEntityIndexPattern } from '@kbn/entity-store/common/domain/entity_index';
import type { RelationshipIntegrationConfig } from '../engine/types';
import { COMPOSITE_PAGE_SIZE } from '../engine/constants';
import { ENGINE_COLUMNS } from '../engine/columns';
import { buildRawIdentifiersExistenceGate } from '../engine/build_raw_identifiers_query';

const RELATIONSHIP_KEY = 'supervises';
// `entity.source` is derived from event.module ?? event.dataset ?? data_stream.dataset
// (see ENTITY_SOURCE_FIELD_EVALUATION). The Okta entity-analytics integration ships
// no event.module, so the value is the full data_stream.dataset — `entityanalytics_okta.user`,
// NOT the bare `entityanalytics_okta`. supervises is carried on user entities, so the
// user data stream is the source. Match it exactly (term/==), not the bare integration name.
const OKTA_ENTITY_SOURCE = 'entityanalytics_okta.user';
// Okta user entities live in the `okta` IDP namespace, so their EUID carries an
// `@okta` suffix (see user.ts non-Local EUID ranking). The raw_identifiers Okta
// emits — user.email (EUID rank-1), user.id (rank-2), user.name (rank-4) — must
// be suffixed with this namespace to reconstruct the target user EUID.
const OKTA_NAMESPACE = 'okta';

// Leaves the Okta pipeline writes under supervises.raw_identifiers. Existence is
// gated on any of the three; resolution picks ONE per the EUID ranking below.
const OKTA_SUPERVISES_EXISTENCE_FIELDS = ['user.email', 'user.id', 'user.name'];

/**
 * Step 2 ES|QL for Okta supervises.
 *
 * Two things differ from the generic `buildRawIdentifiersEsqlQuery`:
 *
 * 1. **Namespace suffix.** Host EUIDs are namespace-less (`host:<name>`), but
 *    user EUIDs in an IDP namespace are `user:<id>@<namespace>`. So the target
 *    is reconstructed as `CONCAT("user:", <key>, "@okta")` (cf. the Okta
 *    communicates_with override).
 *
 * 2. **One key per report, NOT one per identifier field.** The source
 *    `supervises[]` is an array of report OBJECTS, each `{email, id, name}`.
 *    Extraction flattens it into three PARALLEL arrays
 *    (`raw_identifiers.user.{email,id,name}`), so the per-report pairing is
 *    lost. Unioning email+id (MV_APPEND) would emit TWO EUIDs per report (one
 *    from its email, one from its id) — double-counting the same entity. Since
 *    every report carries the same identity in each array, we pick exactly ONE
 *    field for the whole bag, by the user EUID ranking (user.ts non-Local):
 *    email (rank-1) → id (rank-2) → name (rank-4). For Okta `user.name` = login
 *    = email, so the name fallback (rank-4 `user:<name>@okta`) matches the
 *    target's own EUID. The rank-3 `name@domain` form is unavailable here (the
 *    bag carries no `user.domain`).
 *
 * The chosen field is then MV_EXPAND-ed BEFORE the CONCAT: ES|QL `CONCAT`
 * returns NULL on any multi-valued argument, and a supervisor has many reports,
 * so each value must be singular at concat time.
 */
function buildOktaSupervisesEsqlQuery(namespace: string, lastProcessedTimestamp?: string): string {
  const entityIndex = getLatestEntityIndexPattern(namespace);
  const rawIdentifiersPrefix = `entity.relationships.${RELATIONSHIP_KEY}.raw_identifiers`;
  const emailField = `${rawIdentifiersPrefix}.user.email`;
  const idField = `${rawIdentifiersPrefix}.user.id`;
  const nameField = `${rawIdentifiersPrefix}.user.name`;

  const watermarkClause = lastProcessedTimestamp
    ? `\n    AND entity.lifecycle.last_seen > "${lastProcessedTimestamp}"`
    : '';

  return `FROM ${entityIndex}
| WHERE (${emailField} IS NOT NULL OR ${idField} IS NOT NULL OR ${nameField} IS NOT NULL)
    AND entity.source == "${OKTA_ENTITY_SOURCE}"${watermarkClause}
| EVAL ${ENGINE_COLUMNS.actor} = entity.id
| EVAL rawTargetKey = CASE(
    MV_COUNT(${emailField}) > 0, ${emailField},
    MV_COUNT(${idField}) > 0, ${idField},
    ${nameField}
  )
| MV_EXPAND rawTargetKey
| EVAL targetEntityId = CONCAT("user:", rawTargetKey, "@${OKTA_NAMESPACE}")
| WHERE COALESCE(targetEntityId, "") != ""
    AND targetEntityId != "user:@${OKTA_NAMESPACE}"
    AND targetEntityId RLIKE ".+:.+@.+"
| STATS ${RELATIONSHIP_KEY} = VALUES(targetEntityId) BY ${ENGINE_COLUMNS.actor}
| WHERE COALESCE(${ENGINE_COLUMNS.actor}, "") != ""
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}

export function buildSupervisesConfigs(
  lastProcessedTimestamp?: string
): RelationshipIntegrationConfig[] {
  return [
    {
      kind: 'override',
      id: 'entityanalytics_okta',
      name: 'Okta Entity Analytics',
      // Step 1 actor discovery reads the entity index (actors are user entity
      // docs), not raw logs.
      indexPattern: getLatestEntityIndexPattern,
      // supervises is user → user; targets resolve to the user namespace.
      targetEntityType: 'user',
      relationshipKey: RELATIONSHIP_KEY,
      // Discover actors by entity.id (present on every entity). Without this the
      // engine defaults to USER_IDENTITY_FIELDS, which on the entity index are
      // not the actor key — entity.id is.
      customActor: {
        fields: ['entity.id'],
      },
      // Entity-index source: disable the engine's @timestamp now-30d lookback (a
      // log-index assumption that would drop entities) and gate on last_seen.
      disableLookbackWindow: true,
      compositeAggAdditionalFilters: [
        // Scope to Okta-sourced entities. entity.source is a single value per
        // entity, so each integration's maintainer processes a disjoint actor
        // set — no cross-maintainer overwrite risk even though the ids write is
        // a replace, not a union.
        { term: { 'entity.source': OKTA_ENTITY_SOURCE } },
        buildRawIdentifiersExistenceGate({
          relationshipKey: RELATIONSHIP_KEY,
          fields: OKTA_SUPERVISES_EXISTENCE_FIELDS,
        }),
        ...(lastProcessedTimestamp
          ? [{ range: { 'entity.lifecycle.last_seen': { gt: lastProcessedTimestamp } } }]
          : []),
      ],
      esqlQueryOverride: (ns) => buildOktaSupervisesEsqlQuery(ns, lastProcessedTimestamp),
    },
  ];
}

// Static export for tests that don't need a watermark.
export const SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS = buildSupervisesConfigs();
