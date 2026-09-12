/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/common/domain/entity_index';
import type { RelationshipIntegrationConfig } from '../engine/types';
import {
  buildRawIdentifiersEsqlQuery,
  buildRawIdentifiersExistenceGate,
  type DirectEuidRule,
} from '../engine/build_raw_identifiers_query';
import { COMPOSITE_PAGE_SIZE } from '../engine/constants';
import { ENGINE_COLUMNS } from '../engine/columns';

const RELATIONSHIP_KEY = 'owns';
const OKTA_ENTITY_SOURCE = 'entityanalytics_okta';
const ENTRA_ID_ENTITY_SOURCE = 'entityanalytics_entra_id';
const ENTRA_ID_DEVICE_DATASET = 'entityanalytics_entra_id.device';
const OWNERS = 'device.registered_owners';
const OWNER_MAIL_FIELD = `${OWNERS}.mail`;
const OWNER_ID_FIELD = `${OWNERS}.id`;
const OWNER_UPN_FIELD = `${OWNERS}.user_principal_name`;

// Okta device entities are keyed by host.id (`host:<device.id>`), so host.id is
// directly resolvable as a EUID. host.name (display name) is not — skip it.
const OKTA_OWNS_RULES: DirectEuidRule[] = [{ field: 'host.id', euidType: 'host' }];

/**
 * Step 2 ES|QL for the Entra ID `owns` maintainer.
 *
 * Reads device documents and inverts device→user: ownership exists only on the
 * device object, so the maintainer emits user-keyed relationship writes.
 *
 * `registered_owners` has a plain object mapping (not nested), so the indexed
 * representation ES|QL reads flattens the array — `id`, `mail`, and
 * `user_principal_name` become independent multi-valued columns of potentially
 * different lengths. A ranked CASE over the whole column would short-circuit on
 * the first non-null one and silently drop owners who lack that field.
 *
 * The union must be null-guarded: `MV_APPEND` returns null if ANY argument is
 * null, and under the engine's `unmapped_fields="nullify"` preamble an absent
 * column is null — so an unguarded `MV_APPEND` drops every owner on any document
 * missing one of the three fields. Each step therefore falls back to the other
 * operand when one side is null.
 *
 * Lower-ranked identifiers of owners whose higher-ranked one resolves will 404 —
 * that is expected and harmless.
 */
function buildEntraIdOwnsEsqlQuery(namespace: string): string {
  const logIndex = `logs-${ENTRA_ID_DEVICE_DATASET}-${namespace}`;

  return `FROM ${logIndex}
| WHERE host.id IS NOT NULL
    AND (${OWNER_MAIL_FIELD} IS NOT NULL OR ${OWNER_ID_FIELD} IS NOT NULL OR ${OWNER_UPN_FIELD} IS NOT NULL)
| EVAL targetEntityId = CONCAT("host:", TO_STRING(host.id))
| EVAL mailAndId = CASE(${OWNER_MAIL_FIELD} IS NULL, ${OWNER_ID_FIELD}, ${OWNER_ID_FIELD} IS NULL, ${OWNER_MAIL_FIELD}, MV_APPEND(${OWNER_MAIL_FIELD}, ${OWNER_ID_FIELD}))
| EVAL ownerKey = CASE(mailAndId IS NULL, ${OWNER_UPN_FIELD}, ${OWNER_UPN_FIELD} IS NULL, mailAndId, MV_APPEND(mailAndId, ${OWNER_UPN_FIELD}))
| MV_EXPAND ownerKey
| EVAL ${ENGINE_COLUMNS.actor} = CONCAT("user:", ownerKey, "@entra_id")
| WHERE COALESCE(${ENGINE_COLUMNS.actor}, "") != ""
    AND ${ENGINE_COLUMNS.actor} != "user:@entra_id"
    AND ${ENGINE_COLUMNS.actor} RLIKE ".+:.+@.+"
| STATS ${RELATIONSHIP_KEY} = VALUES(targetEntityId) BY ${ENGINE_COLUMNS.actor}
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
}

export function buildOwnsConfigs(lastProcessedTimestamp?: string): RelationshipIntegrationConfig[] {
  return [
    {
      kind: 'override',
      id: OKTA_ENTITY_SOURCE,
      name: 'Okta Entity Analytics',
      indexPattern: (namespace) => getEntitiesAlias(ENTITY_LATEST, namespace),
      targetEntityType: 'host',
      relationshipKey: RELATIONSHIP_KEY,
      customActor: { fields: ['entity.id'] },
      disableLookbackWindow: true,
      validateTargetIds: true,
      compositeAggAdditionalFilters: [
        { term: { 'entity.source': OKTA_ENTITY_SOURCE } },
        buildRawIdentifiersExistenceGate({
          relationshipKey: RELATIONSHIP_KEY,
          fields: ['host.id'],
        }),
        ...(lastProcessedTimestamp
          ? [{ range: { 'entity.lifecycle.last_seen': { gt: lastProcessedTimestamp } } }]
          : []),
      ],
      esqlQueryOverride: (ns) =>
        buildRawIdentifiersEsqlQuery({
          relationshipKey: RELATIONSHIP_KEY,
          rules: OKTA_OWNS_RULES,
          namespace: ns,
          lastProcessedTimestamp,
          entitySource: OKTA_ENTITY_SOURCE,
        }),
    },
    {
      kind: 'override',
      id: ENTRA_ID_ENTITY_SOURCE,
      name: 'Entra ID Entity Analytics',
      indexPattern: (ns) => `logs-${ENTRA_ID_DEVICE_DATASET}-${ns}`,
      targetEntityType: 'host',
      relationshipKey: RELATIONSHIP_KEY,
      // All three owner identifier fields are keyword-mapped; each value of the
      // flattened array becomes its own composite bucket (one per distinct owner).
      customActor: {
        fields: [OWNER_MAIL_FIELD, OWNER_ID_FIELD, OWNER_UPN_FIELD],
      },
      validateTargetIds: false,
      compositeAggAdditionalFilters: [
        { exists: { field: 'host.id' } },
        {
          bool: {
            should: [
              { exists: { field: OWNER_MAIL_FIELD } },
              { exists: { field: OWNER_ID_FIELD } },
              { exists: { field: OWNER_UPN_FIELD } },
            ],
            minimum_should_match: 1,
          },
        },
      ],
      esqlQueryOverride: (ns) => buildEntraIdOwnsEsqlQuery(ns),
    },
  ];
}

// Static export for tests that don't need a watermark.
export const OWNS_INTEGRATION_RELATIONSHIP_CONFIGS = buildOwnsConfigs();
