/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import type { Condition } from '@kbn/streamlang';
import { conditionToESQL } from '@kbn/streamlang';
import { HASH_ALG } from '../../../common/domain/euid';
import { recentData } from '../../../common/domain/definitions/esql';
import { escapeEsqlStringLiteral, esqlIsNotNullOrEmpty } from '../../../common/esql/strings';
import {
  type EntityDefinition,
  type EntityField,
  type EntityType,
} from '../../../common/domain/definitions/entity_schema';
import { getEuidEsqlEvaluation } from '../../../common/domain/euid/esql';
import type { StreamAliasContext } from '../streams_features';

import {
  buildExtractionSourceClause,
  buildLogPageProbeSourceClause,
  buildFieldEvaluations,
  buildSetFieldsByCondition,
  type PaginationParams,
  type PaginationFields,
  ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
  ENGINE_METADATA_UNTYPED_ID_FIELD,
  ENGINE_METADATA_TYPE_FIELD,
  ENTITY_CONFIDENCE_FIELD,
  MAIN_ENTITY_ID_FIELD,
  ENTITY_NAME_FIELD,
  ENTITY_TYPE_FIELD,
  TIMESTAMP_FIELD,
  aggregationStats,
  fieldsToKeep,
  extractPaginationParams,
  buildPaginationSection,
  hasFieldEvaluations,
  mapPostAggFilterFieldsToRecentForEsql,
} from './query_builder_commons';

export const HASHED_ID_FIELD = 'entity.hashedId';

export const MAIN_EXTRACTION_PAGINATION_FIELDS: PaginationFields = {
  timestampField: ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
  finalIdField: ENGINE_METADATA_UNTYPED_ID_FIELD,
  idFieldInQuery: recentData(ENGINE_METADATA_UNTYPED_ID_FIELD),
};

const FIELDS_TO_KEEP = [
  TIMESTAMP_FIELD,
  MAIN_ENTITY_ID_FIELD,
  ENTITY_NAME_FIELD,
  ENGINE_METADATA_UNTYPED_ID_FIELD,
  HASHED_ID_FIELD,
  ENGINE_METADATA_TYPE_FIELD,
  ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
];

interface LogsExtractionQueryParams {
  indexPatterns: string[];
  latestIndex: string;
  entityDefinition: EntityDefinition;
  docsLimit: number;
  fromDateISO: string;
  toDateISO: string;
  recoveryId?: string;
  pagination?: PaginationParams;
  logsPageCursorStart?: PaginationParams;
  logsPageCursorEnd?: PaginationParams;
  /**
   * Optional pre-built ESQL fragment (typically produced by {@link buildAliasPrelude})
   * that COALESCEs non-ECS source paths into the engine's ECS identity slots and
   * stamps `entity.knowledge_indicator.*` provenance fields. Applied per-stream by
   * the alias-scoped query path in `LogsExtractionClient`; the default extraction
   * pass omits it. Spliced after the FROM/WHERE source clause and before the
   * static engine's existing field-evaluation block, so the COALESCE'd ECS values
   * are visible to all downstream identity logic (EUID composition, documentsFilter,
   * field aggregation).
   */
  aliasPrelude?: string;
  /**
   * Optional pre-translated ESQL predicate (typically the schema feature's
   * `filter` translated via `conditionToESQL`) that scopes the alias prelude to
   * docs matching the LLM's intended actor-identity context (e.g. only sign-in
   * events on `logs.azure.signinlogs`, not audit events). Appended as an extra
   * `| WHERE` after the FROM/WHERE source clause.
   */
  aliasFilter?: string;
}

export function buildRemainingLogsCountQuery(params: {
  indexPatterns: string[];
  type: EntityType;
  fromDateISO: string;
  toDateISO: string;
  logsPageCursorStart?: PaginationParams;
}): string {
  return (
    buildLogPageProbeSourceClause(params) +
    `
  | STATS document_count = COUNT()`
  );
}

export function buildLogsExtractionEsqlQuery({
  indexPatterns,
  entityDefinition,
  fromDateISO,
  toDateISO,
  docsLimit,
  latestIndex,
  recoveryId,
  pagination,
  logsPageCursorStart,
  logsPageCursorEnd,
  aliasPrelude,
  aliasFilter,
}: LogsExtractionQueryParams): string {
  const { fields, type, entityTypeFallback, identityField } = entityDefinition;

  const parts = [];

  // Treat unmapped columns as NULL instead of failing query verification. The same
  // ESQL is run against arbitrary index patterns (notably stream-derived KI
  // definitions targeting a single data stream like `logs-elastic_agent.status_change-default`)
  // that may not map every entity.*/event.*/asset.* source referenced in the
  // definition. Without this, ESQL aborts with `verification_exception: Unknown
  // column [...]` for every missing field and the whole extraction batch is lost.
  // Mirrors the CCS extraction path, which sets the same directive for the same reason.
  parts.push(`SET unmapped_fields="nullify";`);

  // FROM and WHERE.
  // `identityField` must come from the passed-in definition (not the registry) so that
  // stream-derived (KI) definitions — which ride `type: 'generic'` but use a custom
  // grouping field — produce a `documentsFilter` that matches their source indices.
  parts.push(
    buildExtractionSourceClause({
      indexPatterns,
      type,
      identityField,
      fromDateISO,
      toDateISO,
      logsPageCursorStart,
      logsPageCursorEnd,
    })
  );

  // Schema-feature filter scoping for the alias prelude. Applied as an extra
  // WHERE after the source clause so it composes with the time-window /
  // identity-presence filters via ESQL's standard predicate chaining. Only
  // present on alias-scoped extraction passes; the default pass omits it.
  if (aliasFilter) {
    parts.push(`| WHERE ${aliasFilter}`);
  }

  // Schema-feature ECS identity alias prelude. Stamps `entity.knowledge_indicator.*`
  // provenance fields and COALESCEs non-ECS source paths into the ECS identity
  // slots (`user.email`, `host.name`, …) so the downstream static-engine logic
  // sees ECS-shaped input and produces canonical entities from non-normalized
  // streams. Spliced before the field-evaluation block so the COALESCE'd values
  // are visible to identity-aware EVALs (entity.namespace, EUID composition).
  if (aliasPrelude) {
    parts.push(aliasPrelude);
  }

  // Special evaluations for entity id
  if (hasFieldEvaluations(entityDefinition)) {
    parts.push(buildFieldEvaluations(entityDefinition));
  }

  if (entityDefinition.whenConditionTrueSetFieldsPreAgg?.length) {
    for (const entry of entityDefinition.whenConditionTrueSetFieldsPreAgg) {
      parts.push(buildSetFieldsByCondition(entry));
    }
  }

  // Evaluation of the id without type so we can fallback to name.
  // Pass the definition's own identity; the registry lookup would yield the wrong
  // identity for KI definitions (see comment above).
  parts.push(
    `| EVAL ${recentData(ENGINE_METADATA_UNTYPED_ID_FIELD)} = ${getEuidEsqlEvaluation(type, {
      withTypeId: false,
      identityField,
    })}`
  );

  // Main stats aggregation from incoming data
  parts.push(`| STATS
    ${ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD} = MIN(${TIMESTAMP_FIELD}),
    ${recentData('timestamp')} = MAX(${TIMESTAMP_FIELD}),
    ${aggregationStats(fields)}
    BY ${recentData(ENGINE_METADATA_UNTYPED_ID_FIELD)}`);

  // If there is no post aggregation filter we can paginate before the lookup join
  // and save some performance
  if (!entityDefinition.postAggFilter) {
    parts.push(
      ...buildPaginationSection(
        fromDateISO,
        docsLimit,
        MAIN_EXTRACTION_PAGINATION_FIELDS,
        pagination,
        recoveryId
      )
    );
  }

  // Builds the main entity id
  parts.push(
    `| EVAL ${recentData(MAIN_ENTITY_ID_FIELD)} = ${getMainEntityIdFromUntypedEsql(
      entityDefinition,
      recentData(ENGINE_METADATA_UNTYPED_ID_FIELD)
    )}`
  );

  // Lookup join to the latest index to perform data retention.
  //
  // Keyed on `EngineMetadata.UntypedId` (not `entity.id`) so that the maintainer's
  // KI promotion mutations of `entity.id` (e.g. `generic:foo@stream:...` → `service:foo`)
  // do not hide the existing doc from the next extraction. `UntypedId` is the
  // pre-promotion identity of the source, which the maintainer leaves untouched
  // and which is the same field used to compute the doc `_id` (`HASH(... recent.entity.id ...)`),
  // so the JOIN key, the stable `_id`, and the upsert target stay aligned.
  // Downstream, `entity.id` and `entity.EngineMetadata.Type` are written with a
  // `CASE(entity.confidence == "low", ...)` guard so that already-promoted docs
  // keep their typed identity instead of being clobbered back to the source engine.
  parts.push(`| LOOKUP JOIN ${latestIndex}
      ON ${recentData(ENGINE_METADATA_UNTYPED_ID_FIELD)} == ${ENGINE_METADATA_UNTYPED_ID_FIELD}`);

  if (entityDefinition.postAggFilter) {
    // If it has post aggregation filter, we filter it right after lookup join
    parts.push(
      buildPostAggFilter(
        mapPostAggFilterFieldsToRecentForEsql(entityDefinition.postAggFilter, entityDefinition)
      )
    );
    // then we can paginate after the post aggregation filter
    parts.push(
      ...buildPaginationSection(
        fromDateISO,
        docsLimit,
        MAIN_EXTRACTION_PAGINATION_FIELDS,
        pagination,
        recoveryId
      )
    );
  }

  if (entityDefinition.whenConditionTrueSetFieldsAfterStats?.length) {
    for (const entry of entityDefinition.whenConditionTrueSetFieldsAfterStats) {
      parts.push(
        buildSetFieldsByCondition(entry, {
          entityFields: fields,
          useRecentDataPrefix: true,
        })
      );
    }
  }

  // Perform the final merge of the fields between latest and recent data
  // and some custom field evaluations, like type and name fallback
  parts.push(`| EVAL ${mergedFieldStats(MAIN_ENTITY_ID_FIELD, fields)},
              ${customFieldEvalLogic(type, entityTypeFallback)}`);

  // Preserve a promoted doc's typed `entity.id` (e.g. `service:foo`) across
  // re-extraction. The maintainer sets `entity.confidence = "low"` on promotion
  // and is the sole writer of that value; when present we keep the latest doc's
  // `entity.id`. Otherwise we fall through to the freshly computed source identity
  // (`recent.entity.id`), preserving today's behavior for non-promoted docs and
  // first-time writes (where `entity.confidence` is NULL post-JOIN).
  parts.push(
    `| EVAL ${MAIN_ENTITY_ID_FIELD} = CASE(${ENTITY_CONFIDENCE_FIELD} == "low", ${MAIN_ENTITY_ID_FIELD}, ${recentData(
      MAIN_ENTITY_ID_FIELD
    )})`
  );

  // Rename UntypedId from the recent-prefixed alias to its final name. `entity.id`
  // is already handled by the CASE EVAL above; `recent.entity.id` is implicitly
  // dropped by the `KEEP entity*` projection below.
  parts.push(`| RENAME
    ${recentData(ENGINE_METADATA_UNTYPED_ID_FIELD)} AS ${ENGINE_METADATA_UNTYPED_ID_FIELD}`);

  // keep recent data fields
  parts.push(`| KEEP ${fieldsToKeep(fields, FIELDS_TO_KEEP)}`);

  // join everything together
  return parts.join('\n');
}

export function extractMainPaginationParams(
  esqlResponse: ESQLSearchResponse,
  maxDocs: number
): PaginationParams | undefined {
  return extractPaginationParams(esqlResponse, maxDocs, MAIN_EXTRACTION_PAGINATION_FIELDS);
}

function mergedFieldStats(idFieldName: string, fields: EntityField[]): string {
  return fields
    .map((field) => {
      const { retention, destination: dest } = field;
      const recentDest = recentData(dest);
      if (dest === idFieldName) {
        return null;
      }

      switch (retention.operation) {
        case 'collect_values':
          return `${dest} = MV_SLICE(MV_UNION(${recentDest}, ${dest}), 0, ${
            retention.maxLength - 1
          })`;
        case 'prefer_newest_value':
          return `${dest} = COALESCE(${recentDest}, ${dest})`;
        case 'prefer_oldest_value':
          return `${dest} = COALESCE(${dest}, ${recentDest})`;
        default:
          throw new Error('unknown field operation');
      }
    })
    .filter(Boolean)
    .join(',\n ');
}

function customFieldEvalLogic(type: EntityType, entityTypeFallback?: string): string {
  // Note: keep `${ENGINE_METADATA_TYPE_FIELD}` guarded on `entity.confidence == "low"`.
  // The KI promotion maintainer is the sole writer of `confidence = "low"`, so this CASE
  // preserves a promoted doc's typed engine (`host`/`service`) across re-extraction;
  // otherwise the latest extraction's engine literal (`"${type}"`) wins, matching
  // the pre-promotion behavior.
  // `${HASHED_ID_FIELD}` stays unconditional: it derives the doc `_id` from the
  // pre-promotion identity (`recent.entity.id`), so the upsert target stays stable
  // across promotion / demotion cycles.
  const evals = [
    `${TIMESTAMP_FIELD} = ${recentData('timestamp')}`,
    `${ENTITY_NAME_FIELD} = CASE(${esqlIsNotNullOrEmpty(
      ENTITY_NAME_FIELD
    )}, ${ENTITY_NAME_FIELD}, ${recentData(ENGINE_METADATA_UNTYPED_ID_FIELD)})`,
    `${ENGINE_METADATA_TYPE_FIELD} = CASE(${ENTITY_CONFIDENCE_FIELD} == "low", ${ENGINE_METADATA_TYPE_FIELD}, "${type}")`,
    `${HASHED_ID_FIELD} = HASH("${HASH_ALG}", ${recentData(MAIN_ENTITY_ID_FIELD)})`,
  ];

  if (entityTypeFallback) {
    evals.push(`${ENTITY_TYPE_FIELD} = COALESCE(${ENTITY_TYPE_FIELD}, "${entityTypeFallback}")`);
  }

  return evals.join(',\n ');
}

function getMainEntityIdFromUntypedEsql(
  { identityField, type }: EntityDefinition,
  untypedIdExpression: string
): string {
  if (identityField.skipTypePrepend) {
    return untypedIdExpression;
  }
  return `CONCAT("${type}:", ${untypedIdExpression})`;
}

/** ESQL WHERE clause fragment after LOOKUP JOIN when entity definition has postAggFilter; otherwise empty. */
function buildPostAggFilter(postAggFilter: Condition): string {
  return `| WHERE ${conditionToESQL(postAggFilter)} `;
}

/**
 * Source-prefix mapping for `entity.knowledge_indicator.*` writes from the
 * alias prelude. Mirrors `getEntityFieldsDescriptions(rootField)`'s prefix
 * derivation in `common_fields.ts`: static engines (`user`/`host`/`service`)
 * read the per-engine source under `<type>.entity.*`; the `generic` engine
 * reads `entity.*` directly.
 *
 * The prelude must write to the SOURCE path so the STATS aggregation defined
 * by `getEntityFieldsDescriptions` picks it up via
 *   `recent.entity.knowledge_indicator.* = LAST(TO_STRING(<prefix>.knowledge_indicator.*), …)`
 * and the post-LOOKUP merge EVAL surfaces it on the final entity doc as
 * `entity.knowledge_indicator.*`. Writing the destination directly would be
 * dropped at the STATS boundary (ESQL only retains explicitly-aggregated
 * columns) and the provenance namespace would never land.
 */
function getEngineKnowledgeIndicatorSourcePrefix(entityType: EntityType): string {
  return entityType === 'generic'
    ? 'entity.knowledge_indicator'
    : `${entityType}.entity.knowledge_indicator`;
}

/**
 * Builds the ESQL fragment that applies a single schema feature's identity
 * aliases for one extraction pass. Returns `''` when no alias destination in
 * the context overlaps the engine's identity vocabulary — the caller can then
 * skip the alias-scoped query for this engine entirely.
 *
 * Output shape (two EVAL blocks; ordering matters):
 *
 *   | EVAL
 *       <prefix>.knowledge_indicator.identity_source = CASE(
 *         <ECS field> IS NULL AND MV_FIRST(<src>) IS NOT NULL, "<src>",
 *         …,
 *         null
 *       ),
 *       <prefix>.knowledge_indicator.feature_uuid = "<uuid>",
 *       <prefix>.knowledge_indicator.stream_name = "<stream>",
 *       <prefix>.knowledge_indicator.confidence = <number>
 *   | EVAL
 *       <ECS field> = COALESCE(<ECS field>, MV_FIRST(<src1>), MV_FIRST(<src2>), …),
 *       …
 *
 * Splitting into two `| EVAL` commands guarantees the provenance CASE sees the
 * pre-COALESCE state of the ECS slot regardless of how ESQL orders intra-EVAL
 * assignments. Otherwise the COALESCE in the same EVAL could mask the
 * `IS NULL` branch of the CASE and the provenance would never land.
 *
 * `MV_FIRST` is applied to every non-ECS source because real-world non-ECS
 * identity fields are sometimes multi-valued (e.g. an array of UPNs in an
 * Azure event); the static engines downstream expect single values.
 *
 * The provenance writes target the engine's source-prefix
 * (`<type>.entity.knowledge_indicator.*` for static engines; `entity.knowledge_indicator.*`
 * for `generic`) so the existing `getEntityFieldsDescriptions` aggregation
 * carries them through STATS + LOOKUP JOIN to the final destination on the
 * entity document. See `getEngineKnowledgeIndicatorSourcePrefix`.
 */
export function buildAliasPrelude(
  aliasContext: StreamAliasContext,
  engineIdentityFields: ReadonlyArray<string>,
  entityType: EntityType
): string {
  const applicable = Array.from(aliasContext.aliases.entries()).filter(
    ([destination, sources]) => engineIdentityFields.includes(destination) && sources.length > 0
  );
  if (applicable.length === 0) {
    return '';
  }

  // Provenance CASE: pairs of (predicate, source-path-literal) followed by a
  // trailing `null` default. CASE returns `null` when no branch fires, which
  // is the "no alias contributed identity for this row" signal.
  const provenanceCaseArgs: string[] = [];
  for (const [destination, sources] of applicable) {
    for (const sourcePath of sources) {
      provenanceCaseArgs.push(
        `${destination} IS NULL AND MV_FIRST(${sourcePath}) IS NOT NULL`,
        `"${escapeEsqlStringLiteral(sourcePath)}"`
      );
    }
  }
  provenanceCaseArgs.push('null');

  const enginePrefix = getEngineKnowledgeIndicatorSourcePrefix(entityType);

  const provenanceEval = `| EVAL
    ${enginePrefix}.identity_source = CASE(${provenanceCaseArgs.join(', ')}),
    ${enginePrefix}.feature_uuid = "${escapeEsqlStringLiteral(aliasContext.featureUuid)}",
    ${enginePrefix}.stream_name = "${escapeEsqlStringLiteral(aliasContext.streamName)}",
    ${enginePrefix}.confidence = ${aliasContext.confidence}`;

  // ECS-slot COALESCE: prefer the existing ECS value; fall back to the alias
  // sources in declaration order. Multiple sources for one destination produce
  // a flat COALESCE(ecs, src1, src2, …) — preference is array order.
  const coalesceAssignments = applicable.map(([destination, sources]) => {
    const args = [destination, ...sources.map((sourcePath) => `MV_FIRST(${sourcePath})`)].join(
      ', '
    );
    return `${destination} = COALESCE(${args})`;
  });

  const ecsSlotEval = `| EVAL ${coalesceAssignments.join(',\n    ')}`;

  return `${provenanceEval}\n${ecsSlotEval}`;
}
