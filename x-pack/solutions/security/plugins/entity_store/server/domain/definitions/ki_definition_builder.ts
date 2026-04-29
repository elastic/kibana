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

  return {
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
      fieldEvaluations: [
        {
          destination: ENTITY_SOURCE_FIELD,
          sources: [{ literal: lineageValue }],
          fallbackValue: null,
          whenClauses: [],
        },
      ],
    },
    fields: buildKiDefinitionFields(groupingField),
  };
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
    newestValue({ source: 'entity.name' }),
    ...getEntityFieldsDescriptions(),
    ...getCommonFieldDescriptions('entity'),
  ];

  if (baseFields.some((field) => field.source === groupingField)) {
    return baseFields;
  }
  return [...baseFields, newestValue({ source: groupingField })];
};
