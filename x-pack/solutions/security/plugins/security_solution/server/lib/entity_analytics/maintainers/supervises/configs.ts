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
 * 1. User EUIDs carry a namespace suffix (`user:<id>@<namespace>`), so the target
 *    is rebuilt as `CONCAT("user:", <key>, "@<namespace>")`, not the bare form.
 * 2. One key per report, not one per field. Extraction flattens the report
 *    objects `{email, id, name}` into three PARALLEL arrays, losing per-report
 *    pairing — so unioning fields would emit multiple EUIDs for one report. A
 *    CASE picks ONE field for the bag by the user EUID ranking (see user.ts):
 *    email (rank-1) → id (rank-2) → name (rank-4).
 *
 * The chosen field is MV_EXPAND-ed BEFORE the CONCAT — `CONCAT` returns NULL on
 * any multi-valued argument.
 */
function buildSupervisesEsqlQuery(
  source: SupervisesSource,
  namespace: string,
  lastProcessedTimestamp?: string
): string {
  const entityIndex = getLatestEntityIndexPattern(namespace);
  const rawIdentifiersPrefix = `entity.relationships.${RELATIONSHIP_KEY}.raw_identifiers`;
  const emailField = `${rawIdentifiersPrefix}.user.email`;
  const idField = `${rawIdentifiersPrefix}.user.id`;
  const nameField = `${rawIdentifiersPrefix}.user.name`;

  const watermarkClause = lastProcessedTimestamp
    ? `\n    AND entity.lifecycle.last_seen > "${lastProcessedTimestamp}"`
    : '';

  const entitySourceList = source.entitySources.map((s) => `"${s}"`).join(', ');

  return `FROM ${entityIndex}
| WHERE (${emailField} IS NOT NULL OR ${idField} IS NOT NULL OR ${nameField} IS NOT NULL)
    AND entity.source IN (${entitySourceList})${watermarkClause}
| EVAL ${ENGINE_COLUMNS.actor} = entity.id
| EVAL rawTargetKey = CASE(
    MV_COUNT(${emailField}) > 0, ${emailField},
    MV_COUNT(${idField}) > 0, ${idField},
    ${nameField}
  )
| MV_EXPAND rawTargetKey
| EVAL targetEntityId = CONCAT("user:", rawTargetKey, "@${source.namespace}")
| WHERE COALESCE(targetEntityId, "") != ""
    AND targetEntityId != "user:@${source.namespace}"
    AND targetEntityId RLIKE ".+:.+@.+"
| STATS ${RELATIONSHIP_KEY} = VALUES(targetEntityId) BY ${ENGINE_COLUMNS.actor}
| WHERE COALESCE(${ENGINE_COLUMNS.actor}, "") != ""
| LIMIT ${COMPOSITE_PAGE_SIZE}`;
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
    indexPattern: getLatestEntityIndexPattern,
    targetEntityType: 'user',
    relationshipKey: RELATIONSHIP_KEY,
    customActor: {
      fields: ['entity.id'],
    },
    disableLookbackWindow: true,
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
  return SUPERVISES_SOURCES.map((source) => buildSupervisesConfig(source, lastProcessedTimestamp));
}

// Static export for tests that don't need a watermark.
export const SUPERVISES_INTEGRATION_RELATIONSHIP_CONFIGS = buildSupervisesConfigs();
