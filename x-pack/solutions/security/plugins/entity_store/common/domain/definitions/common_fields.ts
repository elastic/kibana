/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import type { EntityType, EntityField, FieldEvaluation } from './entity_schema';
import { collectValues, newestValue, oldestValue } from './field_retention_operations';

/**
 * Dotted ECS paths collected into `entity.relationships.*.raw_identifiers.<path>`.
 * Keep `EntityRelationship.raw_identifiers` in `entity.schema.yaml` in sync (same paths plus
 * `entity.id` on the schema for target hints; ingest maps canonical EUIDs via `.entity.id` → `ids`).
 */
export const ENTITY_RELATIONSHIP_IDENTIFIER_FIELDS = [
  'host.id',
  'user.id',
  'user.email',
  'host.name',
  'user.name',
  'service.name',
] as const;

/**
 * Closed enum of every relationship-type identifier the entity store stores under
 * `entity.relationships.<key>`. Also consumed by maintainers (e.g. the relationship
 * engine in security_solution) so they can declare which keys their pipeline writes
 * to without re-stating the schema.
 */
export const ENTITY_RELATIONSHIP_COLLECT_LEAVES = [
  'administers',
  'communicates_with',
  'depends_on',
  'owns_inferred',
  'accesses_infrequently',
  'accesses_frequently',
  'owns',
  'supervises',
] as const;

export type EntityRelationshipKey = (typeof ENTITY_RELATIONSHIP_COLLECT_LEAVES)[number];

export const ENTITY_ID_FIELD = 'entity.id';
export const ENTITY_SOURCE_FIELD = 'entity.source';
// Copied from x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/entity_store/entity_definitions/entity_descriptions/common.ts

export const getCommonFieldDescriptions = (
  ecsField: Omit<EntityType, 'generic'> | 'entity'
): EntityField[] => [
  newestValue({ source: 'asset.id' }),
  newestValue({ source: 'asset.name' }),
  newestValue({ source: 'asset.owner' }),
  newestValue({ source: 'asset.serial_number' }),
  newestValue({ source: 'asset.model' }),
  newestValue({ source: 'asset.vendor' }),
  newestValue({ source: 'asset.environment' }),
  newestValue({ source: 'asset.criticality' }),
  newestValue({ source: 'asset.business_unit' }),
  newestValue({
    source: `${ecsField}.risk.calculated_level`,
    destination: 'entity.risk.calculated_level',
  }),
  newestValue({
    source: `${ecsField}.risk.calculated_score`,
    destination: 'entity.risk.calculated_score',
    mapping: {
      type: 'float',
    },
  }),
  newestValue({
    source: `${ecsField}.risk.calculated_score_norm`,
    destination: 'entity.risk.calculated_score_norm',
    mapping: {
      type: 'float',
    },
  }),
];

/**
 * Returns the three `newestValue` field registrations for one embedding slot:
 * the `dense_vector` field itself, the source-version tag (`<field>_source`),
 * and the embedded-at timestamp.
 *
 * @param prefix - The entity-type prefix used throughout `getEntityFieldsDescriptions`
 *   (e.g. `user.entity` or `entity`). Becomes the leading part of the ES source path.
 * @param relativeField - Path relative to both `${prefix}.` (in source) and `entity.`
 *   (in destination). Examples:
 *   - Primary slot: `'resolution.embedding'`
 *   - Secondary slot: `'resolution.embeddings.e5_384'`
 * @param dims - Number of dimensions for the `dense_vector` mapping. Must match the
 *   inference endpoint's output dims — **immutable after index creation**.
 * @param embeddedAtRelativeField - Optional override for the timestamp sibling's
 *   relative path. Defaults to `${relativeField}_at`. The primary slot uses
 *   `'resolution.embedded_at'` (legacy naming) instead of the default
 *   `'resolution.embedding_at'`, so callers must pass this override explicitly.
 *
 * @example Primary slot (keeps existing live-mapping paths verbatim):
 * ```ts
 * ...embeddingSlotFields(prefix, 'resolution.embedding', 1024, 'resolution.embedded_at')
 * ```
 *
 * @example Secondary slot (new model / recipe):
 * ```ts
 * ...embeddingSlotFields(prefix, 'resolution.embeddings.e5_384', 384)
 * ```
 */
export function embeddingSlotFields(
  prefix: string,
  relativeField: string,
  dims: number,
  embeddedAtRelativeField = `${relativeField}_at`
): EntityField[] {
  return [
    newestValue({
      source: `${prefix}.${relativeField}`,
      destination: `entity.${relativeField}`,
      mapping: { type: 'dense_vector', dims, index: true, similarity: 'cosine' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.${relativeField}_source`,
      destination: `entity.${relativeField}_source`,
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.${embeddedAtRelativeField}`,
      destination: `entity.${embeddedAtRelativeField}`,
      mapping: { type: 'date' },
      allowAPIUpdate: true,
    }),
  ];
}

export const getEntityFieldsDescriptions = (rootField?: EntityType) => {
  const prefix = rootField ? `${rootField}.entity` : 'entity';

  return [
    collectValues({ source: 'event.module' }),
    collectValues({ source: 'event.dataset' }),
    collectValues({ source: 'data_stream.dataset', fieldHistoryLength: 50 }),
    collectValues({ source: ENTITY_SOURCE_FIELD, fieldHistoryLength: 50 }),
    newestValue({ source: `${prefix}.type`, destination: 'entity.type' }),
    newestValue({ source: `${prefix}.sub_type`, destination: 'entity.sub_type' }),
    newestValue({ source: `${prefix}.url`, destination: 'entity.url' }),

    // ATTRIBUTES ------------------------------------------------------------
    collectValues({
      source: `${prefix}.attributes.watchlists`,
      destination: 'entity.attributes.watchlists',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.attributes.asset`,
      destination: 'entity.attributes.asset',
      mapping: { type: 'boolean' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.attributes.managed`,
      destination: 'entity.attributes.managed',
      mapping: { type: 'boolean' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.attributes.mfa_enabled`,
      destination: 'entity.attributes.mfa_enabled',
      mapping: { type: 'boolean' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.attributes.storage_class`,
      destination: 'entity.attributes.storage_class',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collectValues({
      source: `${prefix}.attributes.permissions`,
      destination: 'entity.attributes.permissions',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collectValues({
      source: `${prefix}.attributes.known_redirects`,
      destination: 'entity.attributes.known_redirects',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.attributes.oauth_consent_restriction`,
      destination: 'entity.attributes.oauth_consent_restriction',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),

    // LIFECYCLE ------------------------------------------------------------
    oldestValue({
      source: '@timestamp',
      destination: 'entity.lifecycle.first_seen',
      mapping: { type: 'date' },
    }),
    newestValue({
      source: '@timestamp',
      destination: 'entity.lifecycle.last_seen',
      mapping: { type: 'date' },
    }),
    // Raw indices have no entity.lifecycle.*; derive from @timestamp like last_seen.
    newestValue({
      source: `${prefix}.lifecycle.last_activity`,
      destination: 'entity.lifecycle.last_activity',
      mapping: { type: 'date' },
    }),

    // BEHAVIORS ------------------------------------------------------------
    // Behaviors are reset periodically by the history snapshot feature
    // The current reset implementation only resets lists and strings
    // if we ever add a boolean, reset via snapshot needs to be updated
    collectValues({
      source: `${prefix}.behaviors.rule_names`,
      destination: 'entity.behaviors.rule_names',
      mapping: { type: 'keyword' },
      fieldHistoryLength: 100,
      allowAPIUpdate: true,
    }),
    collectValues({
      source: `${prefix}.behaviors.anomaly_job_ids`,
      destination: 'entity.behaviors.anomaly_job_ids',
      mapping: { type: 'keyword' },
      fieldHistoryLength: 100,
      allowAPIUpdate: true,
    }),

    // RELATIONSHIPS ------------------------------------------------------------
    // Source logs use flat `host.entity.relationships.<relationship>.<identifier>`; the entity index
    // stores raw bags under `raw_identifiers` and canonical EUIDs under `ids`.
    ...ENTITY_RELATIONSHIP_COLLECT_LEAVES.flatMap((relationship) => [
      ...ENTITY_RELATIONSHIP_IDENTIFIER_FIELDS.map((idField) =>
        collectValues({
          source: `${prefix}.relationships.${relationship}.${idField}`,
          destination: `entity.relationships.${relationship}.raw_identifiers.${idField}`,
          mapping: { type: 'keyword' },
          allowAPIUpdate: true,
        })
      ),
      collectValues({
        source: `${prefix}.relationships.${relationship}.entity.id`,
        destination: `entity.relationships.${relationship}.ids`,
        mapping: { type: 'keyword' },
        allowAPIUpdate: true,
      }),
    ]),
    newestValue({
      source: `${prefix}.relationships.resolution.resolved_to`,
      destination: 'entity.relationships.resolution.resolved_to',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),

    // RESOLUTION PROVENANCE ------------------------------------------------
    // Phase 3 of er-v2-embedding-resolution-design.md §8. Triplet that
    // attributes each `resolved_to` link back to the maintainer that wrote it
    // so the UI legend (design §10) can render "Linked via embeddings, 91%"
    // instead of an unattributed chip.
    //
    // - resolved_by: closed string set (`rule | embedding | csv | manual` for
    //   v1; Phase 4 reserves the compound values `embedding+rerank` and
    //   `embedding+llm`). The field stays `keyword` either way.
    // - score: similarity / confidence in [0, 1]. Convention: 1.0 for
    //   `rule | manual` (deterministic), kNN cosine for `embedding`.
    // - model_id: inference endpoint id that produced the score (e.g.
    //   `.jina-embeddings-v5-text-small`). Empty for `rule | manual`.
    newestValue({
      source: `${prefix}.relationships.resolution.resolved_by`,
      destination: 'entity.relationships.resolution.resolved_by',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.relationships.resolution.score`,
      destination: 'entity.relationships.resolution.score',
      mapping: { type: 'float' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.relationships.resolution.model_id`,
      destination: 'entity.relationships.resolution.model_id',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),

    // PARALLEL RESOLUTION (er-v2-parallel-resolution-rfc.md) -----------------
    // Per-source opinion slots so the rule and embedding maintainers can each
    // form a verdict for the same alias instead of racing on the single
    // top-level `resolved_to`. Inert until the
    // `entityAnalyticsParallelResolution` feature flag flips on — sparse
    // keyword/date fields cost nothing when unset, so they can ship to every
    // index regardless of flag state.
    //
    // Merge policy is implemented in
    // server/domain/resolution/parallel_resolution.ts; it computes
    // `effective_to` and `divergent` from the by_* slots on every write.
    // Legacy `resolved_to` / `resolved_by` / `score` / `model_id` are kept in
    // sync with `effective_to` so existing queries keep working through the
    // deprecation window.
    newestValue({
      source: `${prefix}.relationships.resolution.by_rule.resolved_to`,
      destination: 'entity.relationships.resolution.by_rule.resolved_to',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.relationships.resolution.by_rule.resolved_at`,
      destination: 'entity.relationships.resolution.by_rule.resolved_at',
      mapping: { type: 'date' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.relationships.resolution.by_embedding.resolved_to`,
      destination: 'entity.relationships.resolution.by_embedding.resolved_to',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.relationships.resolution.by_embedding.score`,
      destination: 'entity.relationships.resolution.by_embedding.score',
      mapping: { type: 'float' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.relationships.resolution.by_embedding.model_id`,
      destination: 'entity.relationships.resolution.by_embedding.model_id',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.relationships.resolution.by_embedding.resolved_at`,
      destination: 'entity.relationships.resolution.by_embedding.resolved_at',
      mapping: { type: 'date' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.relationships.resolution.by_manual.resolved_to`,
      destination: 'entity.relationships.resolution.by_manual.resolved_to',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.relationships.resolution.by_manual.resolved_at`,
      destination: 'entity.relationships.resolution.by_manual.resolved_at',
      mapping: { type: 'date' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.relationships.resolution.effective_to`,
      destination: 'entity.relationships.resolution.effective_to',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.relationships.resolution.divergent`,
      destination: 'entity.relationships.resolution.divergent',
      mapping: { type: 'boolean' },
      allowAPIUpdate: true,
    }),

    // RESOLUTION EMBEDDINGS ------------------------------------------------
    // Phase 1 of er-v2-embedding-resolution-design.md. Vector + provenance for
    // the semantic identity-matching maintainer. Written only by the
    // embedding-resolution maintainer; readable by anyone via _source / kNN.
    //
    // LOCK-IN: 1024 dims matches the EIS .jina-embeddings-v5-text-small
    // endpoint (the default for xpack.securitySolution.entityResolution.
    // embedding.inferenceId). Changing model dims requires a full reindex of
    // entities-latest-<ns> — dense_vector.dims is immutable after mapping.
    //
    // Additional slots (secondary models / recipes) can be registered by
    // calling embeddingSlotFields(prefix, 'resolution.embeddings.<slot>', dims).
    // Each slot gets its own dense_vector field; no reindex of existing slots.
    ...embeddingSlotFields(prefix, 'resolution.embedding', 1024, 'resolution.embedded_at'),

    newestValue({
      source: `${prefix}.relationships.resolution.risk.calculated_level`,
      destination: 'entity.relationships.resolution.risk.calculated_level',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.relationships.resolution.risk.calculated_score`,
      destination: 'entity.relationships.resolution.risk.calculated_score',
      mapping: { type: 'float' },
      allowAPIUpdate: true,
    }),
    newestValue({
      source: `${prefix}.relationships.resolution.risk.calculated_score_norm`,
      destination: 'entity.relationships.resolution.risk.calculated_score_norm',
      mapping: { type: 'float' },
      allowAPIUpdate: true,
    }),
  ];
};

export const ENTITY_SOURCE_FIELD_EVALUATION: FieldEvaluation = {
  destination: ENTITY_SOURCE_FIELD,
  sources: [
    { field: 'event.module' },
    { field: 'event.dataset' },
    { field: 'data_stream.dataset' },
  ],
  fallbackValue: null,
  whenClauses: [],
};

export function isNotEmptyCondition(field: string): Condition {
  return {
    and: [
      { field, exists: true },
      { field, neq: '' },
    ],
  };
}

/** Returns a condition that is true when the field value is not one of the given values. */
export function fieldNotOneOfCondition(field: string, values: string[]): Condition {
  if (values.length === 0) {
    return { always: {} };
  }
  return {
    not: {
      or: values.map((v) => ({ field, eq: v })),
    },
  };
}
