/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import type { Condition } from '@kbn/streamlang';
import type { Feature } from '@kbn/streams-schema';
import type {
  EntityField,
  FieldEvaluation,
  ManagedEntityDefinition,
} from '../../../common/domain/definitions/entity_schema';
import {
  ENTITY_SOURCE_FIELD,
  getCommonFieldDescriptions,
  getEntityFieldsDescriptions,
} from '../../../common/domain/definitions/common_fields';
import { newestValue } from '../../../common/domain/definitions/field_retention_operations';

/**
 * ECS fields, in priority order, considered when deriving the grouping field
 * from a Knowledge Indicator's `filter`. Earlier entries win over later ones
 * when multiple ECS-known fields are present in the same set of filters.
 */
export const ECS_IDENTITY_PREFERENCE = [
  'service.name',
  'kubernetes.pod.name',
  'container.name',
  'host.name',
  'user.name',
  'process.name',
  'event.dataset',
] as const;

/**
 * Used as a last-resort grouping field when neither the explicit
 * `meta.entity_store.grouping_field` hint nor any filter field can supply one.
 * Aligns with the static `generic` definition's identity field.
 */
export const GROUPING_FIELD_LAST_RESORT = 'entity.id';

/** Separator joining the grouping value and the stream-lineage tag in the EUID. */
const EUID_SEPARATOR = '@';

/**
 * Maps the LLM-emitted `feature.subtype` to the canonical, capitalized
 * category label written to `entity.type` on the extracted document. The
 * capitalized labels (`Host`, `Service`, `Identity`) double as the eligibility
 * signal for the `ki-promotion` maintainer; only entries listed here become
 * promotion candidates. Subtypes not in this map pass through verbatim
 * (e.g. `database`, `cache`, `message_queue`) and remain analyst-queryable
 * but ineligible for promotion in v1.
 *
 * Order matters only in that adding a new entry here would expose that
 * subtype as a candidate label — promotion routing (host/service) lives in
 * the maintainer's own static map, intentionally separated so this file
 * stays informational-only.
 */
export const SUBTYPE_TO_ENTITY_TYPE_LABEL: Record<string, string> = {
  service: 'Service',
  host: 'Host',
  user: 'Identity',
};

/**
 * Builds a definition-stable identifier for a stream-derived KI definition.
 * The shape mirrors `getEntityDefinitionId` for static types (which produces
 * `security_<type>_<space>`) but adds the stream + subtype so each
 * (stream, subtype) group resolves to a distinct definition id within a space.
 */
export const buildKiDefinitionId = (
  streamName: string,
  subtype: string,
  namespace: string
): string => `ki_${sanitizeIdSegment(streamName)}_${sanitizeIdSegment(subtype)}_${namespace}`;

/**
 * Resolves the primary ECS field that enumerates distinct instances of an
 * entity type for the given set of per-instance KIs.
 *
 * Resolution order:
 *   1. Explicit hint: `meta.entity_store.grouping_field` on any feature.
 *   2. ECS preference: the highest-priority `ECS_IDENTITY_PREFERENCE` field
 *      that appears in any feature's `filter` (walked through and/or/not).
 *   3. Filter fallback: the first arbitrary field name observed in filters.
 *   4. Last resort: `GROUPING_FIELD_LAST_RESORT`.
 */
export const deriveGroupingField = (features: Feature[]): string => {
  for (const feature of features) {
    const explicit = readMetaGroupingField(feature);
    if (typeof explicit === 'string' && explicit.length > 0) {
      return explicit;
    }
  }

  const fieldsFromFilters = uniq(
    features.flatMap((feature) => extractFieldNamesFromCondition(feature.filter))
  );

  for (const candidate of ECS_IDENTITY_PREFERENCE) {
    if (fieldsFromFilters.includes(candidate)) {
      return candidate;
    }
  }

  return fieldsFromFilters[0] ?? GROUPING_FIELD_LAST_RESORT;
};

/**
 * Aggregates per-instance entity KIs (matching the same `stream_name` and
 * `subtype`) into a single `ManagedEntityDefinition` that the entity store's
 * existing logs-extraction pipeline can consume.
 *
 * Identity model:
 * - The EUID is composed as `<groupingFieldValue>@<entity.source>`, where
 *   `entity.source` is set by the definition itself to
 *   `stream:<streamName>:<subtype>` via a literal-source field evaluation.
 *   This keeps entities with the same grouping value but different streams or
 *   subtypes distinct in the shared latest index.
 * - The `documentsFilter` requires the grouping field to be present on the
 *   document — the existence of an instance presupposes the field exists.
 *
 * Type model:
 * - `type` is `'generic'` so KI entities ride the same per-namespace task,
 *   index, and engine descriptor as static generic entities.
 * - The `entity.source` lineage carries subtype information at the document
 *   level; `entity.gen.ts` is left untouched.
 * - `entity.type` is populated via the COALESCE in `customFieldEvalLogic`
 *   (see `logs_extraction_query_builder.ts`) from `entityTypeFallback` —
 *   for known subtypes we land canonical labels (`Service`/`Host`/`Identity`)
 *   that the `ki-promotion` maintainer reads as its eligibility signal;
 *   unknown subtypes pass through verbatim and are informational only.
 * - `entity.sub_type` is populated, when available, by a second literal-source
 *   field evaluation seeded from the LLM-emitted
 *   `feature.properties.technology` value. When multiple features in the
 *   group disagree on `technology`, the highest-`confidence` feature wins;
 *   ties are broken by deterministic feature order (first occurrence). This
 *   field is informational only in v1 — the promotion maintainer does NOT
 *   consult it.
 */
export const buildDefinitionFromEntityKIs = ({
  streamName,
  subtype,
  features,
  indexPatterns,
  namespace,
}: {
  streamName: string;
  subtype: string;
  features: Feature[];
  indexPatterns: string[];
  namespace: string;
}): ManagedEntityDefinition => {
  const groupingField = deriveGroupingField(features);
  const lineageValue = `stream:${streamName}:${subtype}`;
  const entityTypeFallback = deriveEntityTypeFallback(subtype);
  const subTypeValue = deriveSubTypeValue(features);

  const fieldEvaluations: FieldEvaluation[] = [
    {
      destination: ENTITY_SOURCE_FIELD,
      sources: [{ literal: lineageValue }],
      fallbackValue: null,
      whenClauses: [],
    },
  ];
  if (subTypeValue !== undefined) {
    fieldEvaluations.push({
      destination: 'entity.sub_type',
      sources: [{ literal: subTypeValue }],
      fallbackValue: null,
      whenClauses: [],
    });
  }

  const definition: ManagedEntityDefinition = {
    id: buildKiDefinitionId(streamName, subtype, namespace),
    type: 'generic',
    name: `Stream-derived entity '${subtype}' on '${streamName}'`,
    indexPatterns,
    identityField: {
      euidRanking: {
        branches: [
          {
            ranking: [
              [{ field: groupingField }, { sep: EUID_SEPARATOR }, { field: ENTITY_SOURCE_FIELD }],
              // Fallback if entity.source somehow ends up missing — keep the
              // grouping value alone rather than producing a broken EUID.
              [{ field: groupingField }],
            ],
          },
        ],
      },
      documentsFilter: { field: groupingField, exists: true },
      // Already a 'generic' type; we don't want a `generic:` prefix on the EUID.
      skipTypePrepend: true,
      // Identity-level evaluation so all consumer paths (ESQL, Painless, DSL,
      // and in-memory document-to-filter) see the lineage value via the same
      // computed destination.
      fieldEvaluations,
    },
    fields: buildKiDefinitionFields(groupingField),
  };

  if (entityTypeFallback !== undefined) {
    definition.entityTypeFallback = entityTypeFallback;
  }

  return definition;
};

/**
 * Returns the canonical entity-type label for a given subtype, or the raw
 * subtype string when no mapping exists (so the value still lands on
 * `entity.type` for analyst queries). Returns `undefined` when the subtype
 * itself is empty / non-string, so the ESQL `customFieldEvalLogic` does not
 * emit a COALESCE branch that would clobber a real source-side value with
 * an empty string.
 */
const deriveEntityTypeFallback = (subtype: string): string | undefined => {
  if (typeof subtype !== 'string' || subtype.length === 0) {
    return undefined;
  }
  return SUBTYPE_TO_ENTITY_TYPE_LABEL[subtype] ?? subtype;
};

/**
 * Picks the `properties.technology` value to land on `entity.sub_type`.
 *
 * Selection rule:
 *  1. Filter the features down to those carrying a non-empty string
 *     `properties.technology`. If none qualify, return `undefined` so the
 *     caller omits the second `fieldEvaluation` entirely (we do NOT fall
 *     back to `subtype` — that would duplicate `entity.type`).
 *  2. Among the qualifying features, return the `technology` value from the
 *     feature with the highest `confidence`. Ties are broken by the feature
 *     order in the input array (first occurrence wins), making the choice
 *     deterministic across runs even when the LLM emits two equally-
 *     confident features that disagree on tech.
 */
const deriveSubTypeValue = (features: Feature[]): string | undefined => {
  let chosen: { value: string; confidence: number; index: number } | undefined;
  for (let index = 0; index < features.length; index += 1) {
    const feature = features[index];
    const technology = readPropertiesTechnology(feature);
    if (technology === undefined) {
      continue;
    }
    const confidence = typeof feature.confidence === 'number' ? feature.confidence : 0;
    if (chosen === undefined || confidence > chosen.confidence) {
      chosen = { value: technology, confidence, index };
    }
  }
  return chosen?.value;
};

const readPropertiesTechnology = (feature: Feature): string | undefined => {
  const properties = feature.properties;
  if (!properties || typeof properties !== 'object') {
    return undefined;
  }
  const technology = (properties as Record<string, unknown>).technology;
  if (typeof technology !== 'string' || technology.length === 0) {
    return undefined;
  }
  return technology;
};

const readMetaGroupingField = (feature: Feature): unknown => {
  const meta = feature.meta;
  if (!meta || typeof meta !== 'object') {
    return undefined;
  }
  const entityStore = (meta as Record<string, unknown>).entity_store;
  if (!entityStore || typeof entityStore !== 'object') {
    return undefined;
  }
  return (entityStore as Record<string, unknown>).grouping_field;
};

const extractFieldNamesFromCondition = (condition: Condition | undefined): string[] => {
  if (!condition || typeof condition !== 'object') {
    return [];
  }
  if ('and' in condition) {
    return condition.and.flatMap(extractFieldNamesFromCondition);
  }
  if ('or' in condition) {
    return condition.or.flatMap(extractFieldNamesFromCondition);
  }
  if ('not' in condition) {
    return extractFieldNamesFromCondition(condition.not);
  }
  if ('field' in condition && typeof condition.field === 'string') {
    return [condition.field];
  }
  return [];
};

const sanitizeIdSegment = (segment: string): string => segment.replace(/[^a-zA-Z0-9_]/g, '_');

/**
 * Field set ingested into the entity doc for a stream-derived definition.
 * Mirrors the static `generic` shape (entity.* metadata + risk + asset
 * descriptors) and adds the grouping field so it is recoverable from the
 * stored entity. Cloud / orchestrator fields (which the static `generic`
 * carries) are intentionally omitted — KI entities get those naturally when
 * the underlying stream documents include them, but treating them as required
 * extracted columns inflates the projection for arbitrary stream shapes.
 */
const buildKiDefinitionFields = (groupingField: string): EntityField[] => {
  const baseFields: EntityField[] = [
    newestValue({ source: 'entity.id' }),
    newestValue({ destination: 'entity.name', source: groupingField }),
    ...getEntityFieldsDescriptions(),
    ...getCommonFieldDescriptions('entity'),
  ];

  if (baseFields.some((field) => field.source === groupingField)) {
    return baseFields;
  }
  return [...baseFields, newestValue({ source: groupingField })];
};
