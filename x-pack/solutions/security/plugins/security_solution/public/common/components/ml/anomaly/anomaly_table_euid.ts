/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { EntityStoreEuid } from '@kbn/entity-store/public';

import type { EntityStoreRecord } from '../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import type { Anomaly, CriteriaFields } from '../types';

/** Entity kinds that have Security Solution host/user anomaly tables. */
export type AnomaliesTableEntityType = 'host' | 'user';

const hasUsableStringValues = (fields: Record<string, string>): boolean =>
  Object.values(fields).some((v) => typeof v === 'string' && v.trim() !== '');

/**
 * Builds a sample document for EUID helpers from URL/query identity plus optional legacy display name.
 * Flattened ECS keys are accepted by {@link EntityStoreEuid.getEntityIdentifiersFromDocument} /
 * {@link EntityStoreEuid.dsl.getEuidFilterBasedOnDocument}.
 */
export const buildEuidSampleDocumentForAnomaliesTable = (
  entityType: AnomaliesTableEntityType,
  identityFields?: Record<string, string>,
  fallbackDisplayName?: string
): Record<string, unknown> => {
  const base: Record<string, string> = {};
  if (identityFields) {
    for (const [k, v] of Object.entries(identityFields)) {
      if (typeof v === 'string' && v.trim() !== '') {
        base[k] = v.trim();
      }
    }
  }
  if (
    !hasUsableStringValues(base) &&
    typeof fallbackDisplayName === 'string' &&
    fallbackDisplayName.trim() !== ''
  ) {
    if (entityType === 'user') {
      base['user.name'] = fallbackDisplayName.trim();
    } else {
      base['host.name'] = fallbackDisplayName.trim();
    }
  }
  return base;
};

/**
 * Broad pre-filter for ML anomaly indices: at least one identity-ranking field exists on the record.
 * Uses {@link EntityStoreEuid.getEuidSourceFields} so new identity fields in definitions apply automatically.
 *
 * Not {@link EntityStoreEuid.dsl.getEuidDocumentsContainsIdFilter}: that targets log-shaped docs (`event.*`, etc.)
 * and would exclude `.ml-anomalies-*` records.
 */
export const buildBroadMlIdentityFieldsExistFilter = (
  euid: EntityStoreEuid,
  entityType: AnomaliesTableEntityType
): estypes.QueryDslQueryContainer => {
  const { identitySourceFields } = euid.getEuidSourceFields(entityType);
  return {
    bool: {
      should: identitySourceFields.map((field) => ({ exists: { field } })),
      minimum_should_match: 1,
    },
  };
};

export const buildAnomaliesTableInfluencersFilterQuery = ({
  euid,
  entityType,
  entityRecord,
  isScopedToEntity,
  identityFields,
  fallbackDisplayName,
}: {
  euid: EntityStoreEuid | undefined;
  entityType: AnomaliesTableEntityType;
  entityRecord?: EntityStoreRecord | null;
  isScopedToEntity: boolean;
  identityFields?: Record<string, string>;
  fallbackDisplayName?: string;
}): estypes.QueryDslQueryContainer => {
  if (euid) {
    if (isScopedToEntity) {
      const inputDoc = entityRecord
        ? entityRecord
        : buildEuidSampleDocumentForAnomaliesTable(entityType, identityFields, fallbackDisplayName);
      const scoped = euid.dsl.getEuidFilterBasedOnDocument(entityType, inputDoc);
      if (scoped != null) {
        return scoped as estypes.QueryDslQueryContainer;
      }
    }
    return buildBroadMlIdentityFieldsExistFilter(euid, entityType);
  }
  return entityType === 'user'
    ? { exists: { field: 'user.name' } }
    : { exists: { field: 'host.name' } };
};

export const getCriteriaFieldsForAnomaliesTable = ({
  euid,
  entityType,
  entityRecord,
  isScopedToEntity,
  identityFields,
  fallbackDisplayName,
}: {
  euid: EntityStoreEuid | undefined;
  entityType: AnomaliesTableEntityType;
  entityRecord?: EntityStoreRecord | null;
  isScopedToEntity: boolean;
  identityFields?: Record<string, string>;
  fallbackDisplayName?: string;
}): CriteriaFields[] => {
  if (!isScopedToEntity || fallbackDisplayName == null) {
    return [];
  }
  if (euid) {
    const inputDoc = entityRecord
      ? entityRecord
      : buildEuidSampleDocumentForAnomaliesTable(entityType, identityFields, fallbackDisplayName);
    const scopedDsl = euid.dsl.getEuidFilterBasedOnDocument(entityType, inputDoc);
    if (scopedDsl != null) {
      return [];
    }
    const identifiers = euid.getEntityIdentifiersFromDocument(entityType, inputDoc);
    if (identifiers != null && Object.keys(identifiers).length > 0) {
      return Object.entries(identifiers).map(([fieldName, fieldValue]) => ({
        fieldName,
        fieldValue,
      }));
    }
  }
  return [
    {
      fieldName: entityType === 'user' ? 'user.name' : 'host.name',
      fieldValue: fallbackDisplayName,
    },
  ];
};

export const anomalyMatchesMlEntityField = (
  anomaly: Anomaly,
  entityField: string,
  entityValue: string | undefined
): boolean => {
  if (anomaly.entityName !== entityField) {
    return false;
  }
  if (entityValue == null) {
    return true;
  }
  return anomaly.entityValue === entityValue;
};

export const anomalyRowMatchesIdentityIdentifiers = (
  anomaly: Anomaly,
  identifiers: Record<string, string>
): boolean => {
  if (anomaly.entityName != null && identifiers[anomaly.entityName] !== undefined) {
    return String(anomaly.entityValue) === identifiers[anomaly.entityName];
  }
  for (const infl of anomaly.influencers ?? []) {
    for (const [k, v] of Object.entries(infl)) {
      if (identifiers[k] !== undefined && identifiers[k] === v) {
        return true;
      }
    }
  }
  return false;
};

export const anomalyEntityNameInEuidIdentitySourceFields = (
  anomaly: Anomaly,
  euid: EntityStoreEuid,
  entityType: AnomaliesTableEntityType
): boolean => {
  if (anomaly.entityName == null) {
    return false;
  }
  const { identitySourceFields } = euid.getEuidSourceFields(entityType);
  return identitySourceFields.includes(anomaly.entityName);
};

export const pickAnomalyRowLabelMatchingIdentifiers = (
  anomaly: Anomaly,
  identifiers: Record<string, string>
): string => {
  if (anomaly.entityName != null && identifiers[anomaly.entityName] !== undefined) {
    return String(anomaly.entityValue);
  }
  for (const infl of anomaly.influencers ?? []) {
    for (const [k, v] of Object.entries(infl)) {
      if (identifiers[k] === v) {
        return v;
      }
    }
  }
  return String(anomaly.entityValue);
};
