/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IScopedClusterClient } from '@kbn/core/server';
import {
  DOCUMENT_TYPE_ALERT,
  DOCUMENT_TYPE_EVENT,
} from '@kbn/cloud-security-posture-common/types/graph/v1';
import type { EsqlToRecords } from '@elastic/elasticsearch/lib/helpers';
import {
  DOCUMENT_TYPE_ENTITY,
  INDEX_PATTERN_REGEX,
} from '@kbn/cloud-security-posture-common/schema/graph/v1';
import type { ProjectRouting } from '@kbn/cloud-security-posture-common/schema/graph/v1';

import { ALL_ENTITY_TYPES } from '@kbn/entity-store/common';
import {
  getEuidEsqlEvaluation,
  getFieldEvaluationsEsql,
} from '@kbn/entity-store/common/domain/euid';
import {
  concatJsonObjectPropertyEsqlExprSafe,
  JSON_OBJECT_START,
  JSON_OBJECT_END,
  JSON_OBJECT_SEPARATOR,
  concatJsonObjectPropertyEsqlExprAsString,
  concatJsonObjectPropertyString,
  buildPinnedEsql,
} from './utils';
import {
  type EuidSourceFields,
  GRAPH_ACTOR_EUID_SOURCE_FIELDS,
  GRAPH_TARGET_EUID_SOURCE_FIELDS,
  TYPED_ENTITY_PREFIXES,
} from './constants';
import { getTargetEuidEsqlEvaluation } from './target_euid';
import { SECURITY_ALERTS_PARTIAL_IDENTIFIER } from '../../../common/constants';
import type { EsQuery, OriginEventId, EventEsqlRow } from './types';

interface BuildEsqlQueryParams {
  indexPatterns: string[];
  originEventIds: OriginEventId[];
  originAlertIds: OriginEventId[];
  alertsMappingsIncluded: boolean;
  pinnedIds?: string[];
}

/**
 * Fetches events/alerts from logs and alerts indices.
 * This is the core event fetching logic used by fetchGraph.
 *
 * CPS: the caller-supplied `projectRouting` is forwarded as-is to ES|QL, so both
 * logs and alerts fan out across linked projects under the same routing. This
 * matches the rest of the alert flyout (Analyzer, Prevalence, Correlations),
 * which already show remote alerts as contextual data.
 */
export const fetchEvents = async ({
  esClient,
  logger,
  start,
  end,
  originEventIds,
  showUnknownTarget,
  indexPatterns,
  spaceId,
  esQuery,
  pinnedIds,
  projectRouting,
}: {
  esClient: IScopedClusterClient;
  logger: Logger;
  start: string | number;
  end: string | number;
  originEventIds: OriginEventId[];
  showUnknownTarget: boolean;
  indexPatterns: string[];
  spaceId: string;
  esQuery?: EsQuery;
  pinnedIds?: string[];
  projectRouting?: ProjectRouting;
}): Promise<EsqlToRecords<EventEsqlRow>> => {
  const originAlertIds = originEventIds.filter((originEventId) => originEventId.isAlert);

  // FROM clause currently doesn't support parameters, Therefore, we validate the index patterns to prevent injection attacks.
  // Regex to match invalid characters in index patterns: upper case characters, \, /, ?, ", <, >, |, (space), #, or ,
  indexPatterns.forEach((indexPattern, idx) => {
    if (!INDEX_PATTERN_REGEX.test(indexPattern)) {
      throw new Error(
        `Invalid index pattern [${indexPattern}] at index ${idx}. Cannot contain characters \\, /, ?, ", <, >, |, (space character), #, or ,`
      );
    }
  });

  const alertsMappingsIncluded = indexPatterns.some((indexPattern) =>
    indexPattern.includes(SECURITY_ALERTS_PARTIAL_IDENTIFIER)
  );

  const filter = buildDslFilter(
    originEventIds.map((originEventId) => originEventId.id),
    showUnknownTarget,
    start,
    end,
    esQuery
  );

  const params = [
    ...originEventIds.map((originEventId, idx) => ({ [`og_id${idx}`]: originEventId.id })),
    ...originAlertIds.map((originEventId, idx) => ({ [`og_alrt_id${idx}`]: originEventId.id })),
    ...(pinnedIds ?? []).map((id, idx) => ({ [`pinned_id${idx}`]: id })),
  ];

  const query = buildEsqlQuery({
    indexPatterns,
    originEventIds,
    originAlertIds,
    alertsMappingsIncluded,
    pinnedIds,
  });

  logger.trace(`Executing events query [project_routing: ${projectRouting ?? 'default'}]`);

  return esClient.asCurrentUser.helpers
    .esql({
      columnar: false,
      filter,
      query,
      params,
      ...(projectRouting ? { project_routing: projectRouting } : {}),
    })
    .toRecords<EventEsqlRow>();
};

const buildDslFilter = (
  eventIds: string[],
  showUnknownTarget: boolean,
  start: string | number,
  end: string | number,
  esQuery?: EsQuery
) => ({
  bool: {
    filter: [
      {
        range: {
          '@timestamp': {
            gte: start,
            lte: end,
          },
        },
      },
      ...(showUnknownTarget
        ? []
        : [
            {
              bool: {
                should: [
                  ...GRAPH_TARGET_EUID_SOURCE_FIELDS.generic,
                  ...GRAPH_TARGET_EUID_SOURCE_FIELDS.host,
                  ...GRAPH_TARGET_EUID_SOURCE_FIELDS.user,
                  ...GRAPH_TARGET_EUID_SOURCE_FIELDS.service,
                ].map((field) => ({
                  exists: { field },
                })),
                minimum_should_match: 1,
              },
            },
          ]),
      {
        bool: {
          should: [
            ...(esQuery?.bool.filter?.length ||
            esQuery?.bool.must?.length ||
            esQuery?.bool.should?.length ||
            esQuery?.bool.must_not?.length
              ? [esQuery]
              : []),
            // we might have no eventIds when opening from entity flyout
            ...(eventIds.length > 0
              ? [
                  {
                    terms: {
                      'event.id': eventIds,
                    },
                  },
                ]
              : []),
          ],
          minimum_should_match: 1,
        },
      },
    ],
  },
});

/**
 * Builds v2 actor resolution using EUID computation.
 * Computes entity.namespace (from event.module/data_stream.dataset) and per-type EUIDs
 * in a combined EVAL to prevent the ES|QL optimizer from pruning intermediate columns.
 * Resolves actorEntityId as the first non-null per-type EUID (user > host > service),
 * falling back to raw entity.id for generic entities.
 *
 * Actor source fields (e.g. host.id, user.name) may be multi-value arrays in raw documents.
 * The EUID CONCAT ("{type}:" + field) returns null for multi-value inputs, so we MV_EXPAND
 * typed actor fields to produce one row per value. This may create Cartesian products when
 * multiple fields are multi-value — duplicate documentsData is deduplicated in parse_records.
 * entity.id is excluded because its EUID is the raw value (no CONCAT), and expanding it
 * would create Cartesian products with typed fields. Its multi-value is handled natively
 * by the downstream MV_EXPAND actorEntityId.
 */
const buildV2ActorResolution = (): string => {
  // MV_EXPAND typed actor source fields so EUID CONCAT receives single values.
  // entity.id is excluded: its EUID is the raw value (no CONCAT),
  // and multi-value is handled by the downstream MV_EXPAND actorEntityId.
  const typedActorFields = Object.keys(GRAPH_ACTOR_EUID_SOURCE_FIELDS)
    .filter((f) => (TYPED_ENTITY_PREFIXES as readonly string[]).includes(f))
    .map((f) => GRAPH_ACTOR_EUID_SOURCE_FIELDS[f as keyof EuidSourceFields])
    .flat();
  const mvExpandStatements = typedActorFields
    .filter((f) => !f.startsWith('event.') && !f.startsWith('data_stream.'))
    .map((field) => `| MV_EXPAND \`${field}\``)
    .join('\n');

  // Combine field evaluations (entity.namespace) and user EUID into a single EVAL
  // to prevent the ES|QL optimizer from pruning the intermediate entity.namespace column.
  const userFieldEvaluationsEsql = getFieldEvaluationsEsql('user');

  // Compute EUIDs for typed entity types (excludes generic — falls back to entity.id)
  const typedEntityTypes = ALL_ENTITY_TYPES.filter((t) => t !== 'generic');

  const evalParts: string[] = [];
  if (userFieldEvaluationsEsql) {
    evalParts.push(userFieldEvaluationsEsql);
  }
  typedEntityTypes.forEach((type) => {
    evalParts.push(getEuidEsqlEvaluation(type, `_actor_${type}_euid`));
  });

  // Use raw entity.id directly (not saved variable) since buildSaveSourceFieldsEsql
  // runs after resolution. entity.id is still the original value at this point.
  const coalesceArgs = [...typedEntityTypes.map((type) => `_actor_${type}_euid`), '`entity.id`'];

  return `${mvExpandStatements}
| EVAL ${evalParts.join(',\n  ')}
| EVAL actorEntityId = COALESCE(${coalesceArgs.join(', ')})`;
};

/**
 * Builds ESQL EVAL statements for computing target EUIDs from raw ECS target-namespace fields.
 * Depends on entity.namespace already being computed by buildV2ActorResolution.
 * Collects all non-null target EUIDs into a multi-value targetEntityId.
 *
 * Target source fields (e.g. host.target.id) may be multi-value arrays in raw documents.
 * The EUID CONCAT ("host:" + field) returns null for multi-value inputs, so we MV_EXPAND
 * typed target fields to produce one row per value. This may create Cartesian products when
 * multiple fields are multi-value — duplicate documentsData is deduplicated in parse_records.
 * entity.target.id is excluded because its EUID is the raw value (no CONCAT), and expanding
 * it would create Cartesian products with typed fields. Its multi-value is handled natively
 * by the downstream MV_EXPAND targetEntityId.
 */
const buildV2TargetResolution = (): string => {
  // MV_EXPAND typed target source fields so EUID CONCAT receives single values.
  // entity.target.id is excluded: its EUID is the raw value (no CONCAT),
  // and multi-value is handled by the downstream MV_EXPAND targetEntityId.
  const typedTargetFields = Object.keys(GRAPH_TARGET_EUID_SOURCE_FIELDS)
    .filter((f) => (TYPED_ENTITY_PREFIXES as readonly string[]).includes(f))
    .map((f) => GRAPH_TARGET_EUID_SOURCE_FIELDS[f as keyof EuidSourceFields])
    .flat();
  const mvExpandStatements = typedTargetFields
    .filter((f) => !f.startsWith('event.') && !f.startsWith('data_stream.'))
    .map((field) => `| MV_EXPAND \`${field}\``)
    .join('\n');

  const targetEvalParts = ALL_ENTITY_TYPES.map((type) =>
    getTargetEuidEsqlEvaluation(type, `_target_${type}_euid`)
  );

  const appendStatements = [
    '| EVAL targetEntityId = TO_STRING(null)',
    ...ALL_ENTITY_TYPES.map(
      (type) => `| EVAL targetEntityId = CASE(
    _target_${type}_euid IS NULL,
    targetEntityId,
    CASE(
      targetEntityId IS NULL,
      _target_${type}_euid,
      MV_DEDUPE(MV_APPEND(targetEntityId, _target_${type}_euid))
    )
  )`
    ),
  ].join('\n');

  return `${mvExpandStatements}
| EVAL ${targetEvalParts.join(',\n  ')}
${appendStatements}`;
};

/**
 * Maps EUID source fields to saved variable names.
 * These fields are saved early in the query before LOOKUP JOIN overwrites them
 * with entity store values. The saved variables are used by buildSourceFieldsJson()
 * to build the sourceFields JSON from the original log event values.
 */
const ENTITY_FIELD_COLUMN_MAP: Record<string, string> = Object.fromEntries(
  [
    ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.all,
    ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.generic,
    ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.host,
    ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.user,
    ...GRAPH_ACTOR_EUID_SOURCE_FIELDS.service,
    ...GRAPH_TARGET_EUID_SOURCE_FIELDS.all,
    ...GRAPH_TARGET_EUID_SOURCE_FIELDS.generic,
    ...GRAPH_TARGET_EUID_SOURCE_FIELDS.host,
    ...GRAPH_TARGET_EUID_SOURCE_FIELDS.user,
    ...GRAPH_TARGET_EUID_SOURCE_FIELDS.service,
  ].map((f) => [f, `_sf_${f.replace(/\./g, '_')}`])
);

/**
 * Generates an EVAL statement that saves all EUID source fields.
 * Placed after typed MV_EXPANDs but before LOOKUP JOIN (which overwrites overlapping
 * fields like user.id, host.id with entity store values).
 * Uses MV_FIRST to guarantee single-value scalars — typed fields are already single
 * (post MV_EXPAND in resolution), but entity.id / entity.target.id may still be multi-value.
 * Cartesian products from MV_EXPAND may produce rows with different field combinations;
 * duplicate documentsData per entity ID is deduplicated in parse_records.
 */
const buildSaveSourceFieldsEsql = (): string => {
  const assignments = Object.entries(ENTITY_FIELD_COLUMN_MAP)
    .map(([field, variable]) => `${variable} = MV_FIRST(\`${field}\`)`)
    .join(', ');
  return `| EVAL ${assignments}`;
};

/**
 * Generates an ESQL CONCAT fragment that builds a JSON "sourceFields" object.
 * Each field is conditionally included only when:
 * 1. The field value is non-null
 * 2. The entity type matches the resolved EUID (e.g., user.email only for user: EUIDs)
 *
 * For typed entities, values come from saved _sf_* variables (pre-LOOKUP JOIN).
 * For generic entities, the value is the EUID column itself (which IS the raw
 * entity.id value post MV_EXPAND).
 * Uses REPLACE to fix null properties.
 */
const buildSourceFieldsJson = (fields: EuidSourceFields, euidColumn: string): string => {
  const properties = Object.keys(fields)
    .map((type) => {
      if (type === 'all') {
        return fields[type as keyof EuidSourceFields].map((field) => {
          const column = ENTITY_FIELD_COLUMN_MAP[field] ?? `\`${field}\``;
          return concatJsonObjectPropertyEsqlExprSafe(field.replace('.target', ''), column);
        });
      } else if (type === 'generic') {
        // Generic field: include when EUID doesn't match any typed prefix
        // Use the EUID column directly as the value (it IS the raw entity.id post MV_EXPAND)
        const notTypedCondition = TYPED_ENTITY_PREFIXES.map(
          (p) => `NOT STARTS_WITH(${euidColumn}, "${p}:")`
        ).join(' AND ');
        return fields[type as keyof EuidSourceFields].map((field) => {
          return `CASE(${notTypedCondition},
            ${concatJsonObjectPropertyEsqlExprSafe(field.replace('.target', ''), euidColumn)}, "")`;
        });
      } else {
        return fields[type as keyof EuidSourceFields].map((field) => {
          const column = ENTITY_FIELD_COLUMN_MAP[field] ?? `\`${field}\``;
          return `CASE(STARTS_WITH(${euidColumn}, "${type}:"),
            ${concatJsonObjectPropertyEsqlExprSafe(field.replace('.target', ''), column)}, "")`;
        });
      }
    })
    .flat()
    .join(`, ${JSON_OBJECT_SEPARATOR},\n      `);
  return `
  REPLACE(
    REPLACE(
      REPLACE(CONCAT("\\"sourceFields\\":", ${JSON_OBJECT_START}, ${properties}, ${JSON_OBJECT_END}), "[,]+", ","),
    "\\\\{,", ${JSON_OBJECT_START}),
  ",}", ${JSON_OBJECT_END})`;
};

const buildActorSourceFieldsEsql = (): string =>
  buildSourceFieldsJson(GRAPH_ACTOR_EUID_SOURCE_FIELDS, 'actorEntityId');

const buildTargetSourceFieldsEsql = (): string =>
  buildSourceFieldsJson(GRAPH_TARGET_EUID_SOURCE_FIELDS, 'targetEntityId');

const buildEsqlQuery = ({
  indexPatterns,
  originEventIds,
  originAlertIds,
  alertsMappingsIncluded,
  pinnedIds,
}: BuildEsqlQueryParams): string => {
  const query = `SET unmapped_fields="nullify";
FROM ${indexPatterns
    .filter((indexPattern) => indexPattern.length > 0)
    .join(',')} METADATA _id, _index
${buildV2ActorResolution()}
| WHERE event.action IS NOT NULL AND actorEntityId IS NOT NULL
${buildV2TargetResolution()}
// Save EUID source fields after MV_EXPAND (single-value per row) but before entity enrichment overwrites them
${buildSaveSourceFieldsEsql()}
| MV_EXPAND actorEntityId
| MV_EXPAND targetEntityId
${buildPinnedEsql(['_id', 'actorEntityId', 'targetEntityId'], pinnedIds)}
// Create actor and target data - entity object built by TypeScript enrichment
| EVAL actorDocData = CONCAT(${JSON_OBJECT_START},
    ${concatJsonObjectPropertyEsqlExprAsString('id', 'actorEntityId')},
    ${JSON_OBJECT_SEPARATOR}, ${concatJsonObjectPropertyString('type', DOCUMENT_TYPE_ENTITY)},
    ${JSON_OBJECT_SEPARATOR}, ${buildActorSourceFieldsEsql()},
  ${JSON_OBJECT_END})
| EVAL targetDocData = CONCAT(${JSON_OBJECT_START},
    ${concatJsonObjectPropertyEsqlExprAsString('id', 'COALESCE(targetEntityId, "")')},
    ${JSON_OBJECT_SEPARATOR}, ${concatJsonObjectPropertyString('type', DOCUMENT_TYPE_ENTITY)},
    ${JSON_OBJECT_SEPARATOR}, ${buildTargetSourceFieldsEsql()},
  ${JSON_OBJECT_END})
// Per-target → source-document mapping ("<targetEntityId>\\n<_id>"), collected via VALUES so
// that after STATS drops targetEntityId from the group key we can still attribute each target
// to the document(s) that referenced it. regroupEvents uses this to compute each target-type
// group's own docIds, which keeps label nodes split by document exactly as they would be if the
// query still grouped by targetEntityId.
| EVAL targetDocMap = CONCAT(COALESCE(targetEntityId, ""), "\\n", _id)

// Map host and source values to enriched contextual data
| EVAL sourceIps = source.ip
| EVAL sourceCountryCodes = source.geo.country_iso_code
// Origin event and alerts allow us to identify the start position of graph traversal
| EVAL isOrigin = ${
    originEventIds.length > 0
      ? `CASE (event.id IS NOT NULL AND event.id != "", event.id in (${originEventIds
          .map((_id, idx) => `?og_id${idx}`)
          .join(', ')}), false)`
      : 'false'
  }
| EVAL isOriginAlert = ${
    originAlertIds.length > 0
      ? `CASE (event.id IS NOT NULL AND event.id != "", isOrigin AND event.id in (${originAlertIds
          .map((_id, idx) => `?og_alrt_id${idx}`)
          .join(', ')}), false)`
      : 'false'
  }
| EVAL isAlert = _index LIKE "*${SECURITY_ALERTS_PARTIAL_IDENTIFIER}*"
| EVAL action = event.action
// Aggregate document's data for popover expansion and metadata enhancements
// We format it as JSON string, the best alternative so far. Tried to use tuple using MV_APPEND
// but it flattens the data and we lose the structure
| EVAL docType = CASE (isAlert, "${DOCUMENT_TYPE_ALERT}", "${DOCUMENT_TYPE_EVENT}")
| EVAL docData = CONCAT("{",
    "\\"id\\":\\"", _id, "\\"",
    CASE (event.id IS NOT NULL AND event.id != "", CONCAT(",\\"event\\":","{","\\"id\\":\\"", event.id, "\\"","}"), ""),
    ",\\"type\\":\\"", docType, "\\"",
    ",\\"index\\":\\"", _index, "\\"",
    ${
      // ESQL complains about missing field's mapping when we don't fetch from alerts index
      alertsMappingsIncluded
        ? `CASE (isAlert, CONCAT(",\\"alert\\":", "{",
      "\\"ruleName\\":\\"", kibana.alert.rule.name, "\\"",
    "}"), ""),`
        : ''
    }
  "}")
// Pre-aggregate by the dimensions available WITHOUT entity-store enrichment:
// action, isOrigin/isOriginAlert/pinned. Actor/target entity IDs and type/sub-type
// are NOT used here as group keys — IDs are collected via VALUES() and type/sub-type
// are not available (entity-store join is CPS-unsafe). The follow-up enrichment query
// supplies type/sub-type and regroupEvents performs the final type-level merge in TypeScript.
| STATS badge = COUNT(*),
  isAlert = MV_MAX(VALUES(isAlert)),
  docs = VALUES(docData),
  docIds = VALUES(_id),
  alertDocIds = VALUES(CASE(isAlert, _id, null)),
  nonAlertDocIds = VALUES(CASE(isAlert, null, _id)),
  sourceIps = MV_DEDUPE(VALUES(sourceIps)),
  sourceCountryCodes = MV_DEDUPE(VALUES(sourceCountryCodes)),
  actorEntityId = MV_DEDUPE(VALUES(actorEntityId)),
  targetEntityId = MV_DEDUPE(VALUES(targetEntityId)),
  actorDocData = VALUES(actorDocData),
  targetDocData = VALUES(targetDocData),
  targetDocMap = VALUES(targetDocMap)
    BY action,
      isOrigin,
      isOriginAlert,
      pinned
| EVAL pinnedSort = CASE(pinned IS NULL, 1, 0)
| SORT action DESC, pinnedSort ASC, isOrigin
| LIMIT 1000
| DROP pinnedSort`;

  return query;
};
