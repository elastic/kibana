/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euid } from '@kbn/entity-store/common/euid_helpers';
import { EntityType } from '../../../../../../common/entity_analytics/types';

export interface PropagationRule {
  /**
   * Stable rule identifier. Used for relationship attribution in scored output.
   */
  id: string;
  /**
   * Entity type that generates alerts whose risk can propagate.
   */
  sourceEntityType: EntityType;
  /**
   * Entity type that receives propagated risk.
   */
  targetEntityType: EntityType;
  /**
   * Field path on the target entity that stores source entity EUIDs.
   * Example: `entity.relationships.owns.ids`.
   */
  targetSourceIdsField: string;
}

interface RelationshipIdsField {
  ids?: string[];
}

interface PropagationTargetEntity {
  entity?: {
    relationships?: Record<string, RelationshipIdsField | undefined>;
  };
}

const RELATIONSHIP_FIELD_PREFIX = 'entity.relationships.';
const RELATIONSHIP_FIELD_SUFFIX = '.ids';

const getRelationshipNameFromField = (field: string): string | undefined => {
  if (!field.startsWith(RELATIONSHIP_FIELD_PREFIX) || !field.endsWith(RELATIONSHIP_FIELD_SUFFIX)) {
    return undefined;
  }

  return field.slice(
    RELATIONSHIP_FIELD_PREFIX.length,
    field.length - RELATIONSHIP_FIELD_SUFFIX.length
  );
};

const uniqueEntityTypes = (types: EntityType[]): EntityType[] => [...new Set(types)];

export const PROPAGATION_RULES: readonly PropagationRule[] = [
  {
    id: 'host_ownership',
    sourceEntityType: EntityType.host,
    targetEntityType: EntityType.user,
    targetSourceIdsField: 'entity.relationships.owns.ids',
  },
];

export const getPropagationRulesForTarget = (entityType: EntityType): readonly PropagationRule[] =>
  PROPAGATION_RULES.filter((rule) => rule.targetEntityType === entityType);

export const getPropagationSourceTypesForTarget = (entityType: EntityType): EntityType[] =>
  uniqueEntityTypes(getPropagationRulesForTarget(entityType).map((rule) => rule.sourceEntityType));

export const getTargetAndPropagationSourceTypes = (entityType: EntityType): EntityType[] =>
  uniqueEntityTypes([entityType, ...getPropagationSourceTypesForTarget(entityType)]);

export const getRelationshipFieldsForTarget = (entityType: EntityType): string[] => {
  const fields = getPropagationRulesForTarget(entityType).map((rule) => rule.targetSourceIdsField);
  return [...new Set(fields)];
};

export const getAlertContainsFilterForTarget = (entityType: EntityType): string => {
  const filters = getTargetAndPropagationSourceTypes(entityType).map((type) =>
    euid.esql.getEuidDocumentsContainsIdFilter(type)
  );
  return [...new Set(filters)].join(' OR ');
};

export const getRuleIdForSourceToTarget = ({
  sourceEntityType,
  targetEntityType,
}: {
  sourceEntityType: EntityType;
  targetEntityType: EntityType;
}): string | undefined =>
  PROPAGATION_RULES.find(
    (rule) => rule.sourceEntityType === sourceEntityType && rule.targetEntityType === targetEntityType
  )?.id;

export const getSourceIdsForRule = (
  targetEntity: PropagationTargetEntity,
  rule: PropagationRule
): string[] => {
  const relationshipName = getRelationshipNameFromField(rule.targetSourceIdsField);
  if (!relationshipName) {
    return [];
  }

  const relationship = targetEntity.entity?.relationships?.[relationshipName];
  if (!Array.isArray(relationship?.ids)) {
    return [];
  }

  return relationship.ids.filter((value): value is string => typeof value === 'string');
};
