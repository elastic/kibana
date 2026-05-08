/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetFieldsData } from './hooks/use_get_fields_data';
import { RiskSeverity } from '../../../../common/search_strategy';

/**
 * Helper function to retrieve a field's value (used in combination with the custom hook useGetFieldsData (x-pack/solutions/security/plugins/security_solution/public/flyout/document_details/shared/hooks/use_get_fields_data.ts)
 * @param field type unknown or unknown[]
 * @param emptyValue optional parameter to return if field is incorrect
 * @return the field's value, or null/emptyValue
 */
export const getField = (field: unknown | unknown[], emptyValue?: string) => {
  if (typeof field === 'string') {
    return field;
  } else if (Array.isArray(field) && field.length > 0 && typeof field[0] === 'string') {
    return field[0];
  }
  return emptyValue ?? null;
};

/**
 * Helper function to retrieve a field's value in an array
 * @param field type unknown or unknown[]
 * @return the field's value in an array
 */
export const getFieldArray = (field: unknown | unknown[]) => {
  if (typeof field === 'string') {
    return [field];
  } else if (Array.isArray(field) && field.length > 0) {
    return field;
  }
  return [];
};

/**
 * IdentityFields - key-value pairs of field names and their values used for entity identification (following entity store EUID priority)
 */
export type IdentityFields = Record<string, string>;

/**
 * True when the document-derived identity map has at least one non-empty string value.
 * (An object reference alone is not enough — empty cards must not render.)
 */
export const identityFieldsHaveUsableValues = (
  fields: IdentityFields | Record<string, string> | undefined | null
): boolean => {
  if (fields == null) {
    return false;
  }
  return Object.values(fields).some((v) => typeof v === 'string' && v.trim() !== '');
};

/**
 * When Entity Store v2 has no record for the entity, document-derived identity fields from
 * the store API can be empty. In that case fall back to legacy ECS pairs (for example
 * `user.name`, `host.name`, `service.name`) from the document or panel context.
 */
export const mergeLegacyIdentityWhenStoreEntityMissing = (
  storeIdentityFields: IdentityFields,
  legacyIdentityFields: IdentityFields
): IdentityFields => {
  if (identityFieldsHaveUsableValues(storeIdentityFields)) {
    return storeIdentityFields;
  }
  return legacyIdentityFields;
};

const USER_DISPLAY_FIELD_PRIORITY: readonly string[] = [
  'user.name',
  'related.user',
  'user.email',
  'user.full_name',
];

const HOST_DISPLAY_FIELD_PRIORITY: readonly string[] = ['host.name', 'host.hostname'];

const USER_ID_FIELD_KEYS = new Set(['user.id', 'entity.id']);
const HOST_ID_FIELD_KEYS = new Set(['host.id', 'entity.id']);

const isNonEmpty = (v: string | undefined): v is string => v != null && v.trim() !== '';

const firstNonEmptyIdentityValue = (
  identityFields: IdentityFields | undefined
): string | undefined => Object.values(identityFields ?? {}).find(isNonEmpty);

const resolveEntityName = (
  identityFields: IdentityFields | undefined,
  getFieldsData: GetFieldsData,
  displayPriority: readonly string[],
  idFieldKeys: ReadonlySet<string>,
  fallbackIdKeys: readonly string[]
): string | undefined => {
  for (const field of displayPriority) {
    const fromDoc = getField(getFieldsData(field));
    if (fromDoc) return fromDoc;
  }
  if (identityFields) {
    for (const field of displayPriority) {
      const v = identityFields[field];
      if (isNonEmpty(v)) return v;
    }
    const sortedKeys = Object.keys(identityFields).sort();
    for (const key of sortedKeys) {
      if (!idFieldKeys.has(key) && !key.endsWith('.id')) {
        const v = identityFields[key];
        if (isNonEmpty(v)) return v;
      }
    }
    for (const key of fallbackIdKeys) {
      const v = identityFields[key];
      if (isNonEmpty(v)) return v;
    }
  }
  return undefined;
};

/**
 * Value to pass into observed-user queries and flyout headers: prefer ECS names from the document
 * and human-readable identity keys before user.id / entity.id (EUID maps often list ids first).
 */
export const resolveUserNameForEntityInsights = (
  identityFields: IdentityFields | undefined,
  getFieldsData: GetFieldsData
): string | undefined =>
  resolveEntityName(
    identityFields,
    getFieldsData,
    USER_DISPLAY_FIELD_PRIORITY,
    USER_ID_FIELD_KEYS,
    ['user.id', 'entity.id']
  );

/**
 * Same as {@link resolveUserNameForEntityInsights} for host panels (host.name before host.id).
 */
export const resolveHostNameForEntityInsights = (
  identityFields: IdentityFields | undefined,
  getFieldsData: GetFieldsData
): string | undefined =>
  resolveEntityName(
    identityFields,
    getFieldsData,
    HOST_DISPLAY_FIELD_PRIORITY,
    HOST_ID_FIELD_KEYS,
    ['host.id', 'entity.id']
  );

export const resolveUserNameForEntityInsightsWithFallback = (
  identityFields: IdentityFields | undefined,
  getFieldsData: GetFieldsData
): string | undefined =>
  resolveUserNameForEntityInsights(identityFields, getFieldsData) ??
  firstNonEmptyIdentityValue(identityFields);

export const resolveHostNameForEntityInsightsWithFallback = (
  identityFields: IdentityFields | undefined,
  getFieldsData: GetFieldsData
): string | undefined =>
  resolveHostNameForEntityInsights(identityFields, getFieldsData) ??
  firstNonEmptyIdentityValue(identityFields);

const VALID_RISK_SEVERITIES: ReadonlyArray<RiskSeverity> = Object.values(RiskSeverity);

/**
 * Returns true when the given string is a valid {@link RiskSeverity} value.
 */
export const isRiskSeverity = (value: string): value is RiskSeverity =>
  VALID_RISK_SEVERITIES.includes(value as RiskSeverity);

/**
 * Normalises a raw risk level string (e.g. 'critical', 'CRITICAL') to the
 * canonical {@link RiskSeverity} casing, or returns null when unrecognised.
 */
export const normalizeRiskLevel = (level: string | undefined): RiskSeverity | null => {
  if (level == null || level === '') return null;
  const normalized = level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
  return isRiskSeverity(normalized) ? normalized : isRiskSeverity(level) ? level : null;
};

export { ecsSliceToFlattenedDocument } from './utils/ecs_slice_to_flattened_document';
