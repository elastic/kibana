/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

// mapping of event category to the field displayed as title
export const EVENT_CATEGORY_TO_FIELD: Record<string, string> = {
  authentication: 'user.name',
  configuration: '',
  database: '',
  driver: '',
  email: '',
  file: 'file.name',
  host: 'host.name',
  iam: '',
  intrusion_detection: '',
  malware: '',
  network: '',
  package: '',
  process: 'process.name',
  registry: '',
  session: '',
  threat: '',
  vulnerability: '',
  web: '',
};

/**
 * Helper function to retrieve the alert title
 */
export const getAlertTitle = ({ ruleName }: { ruleName?: string | null }) => {
  const defaultAlertTitle = i18n.translate(
    'xpack.securitySolution.flyout.right.header.headerTitle',
    { defaultMessage: 'Document details' }
  );
  return ruleName ?? defaultAlertTitle;
};

/**
 * Helper function to retrieve the event title
 */
export const getEventTitle = ({
  eventKind,
  eventCategory,
  getFieldsData,
}: {
  eventKind: string | null;
  eventCategory: string | null;
  getFieldsData: GetFieldsData;
}) => {
  const defaultTitle = i18n.translate('xpack.securitySolution.flyout.title.eventTitle', {
    defaultMessage: `Event details`,
  });

  if (eventKind === 'event' && eventCategory) {
    const fieldName = EVENT_CATEGORY_TO_FIELD[eventCategory];
    return getField(getFieldsData(fieldName)) ?? defaultTitle;
  }

  if (eventKind === 'alert') {
    return i18n.translate('xpack.securitySolution.flyout.title.alertEventTitle', {
      defaultMessage: 'External alert details',
    });
  }

  return eventKind
    ? i18n.translate('xpack.securitySolution.flyout.title.otherEventTitle', {
        defaultMessage: '{eventKind} details',
        values: {
          eventKind: startCase(eventKind),
        },
      })
    : defaultTitle;
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

const firstNonEmptyIdentityValue = (
  identityFields: IdentityFields | undefined
): string | undefined =>
  Object.values(identityFields ?? {}).find((v) => typeof v === 'string' && v.trim() !== '');

/**
 * Value to pass into observed-user queries and flyout headers: prefer ECS names from the document
 * and human-readable identity keys before user.id / entity.id (EUID maps often list ids first).
 */
export const resolveUserNameForEntityInsights = (
  identityFields: IdentityFields | undefined,
  getFieldsData: GetFieldsData
): string | undefined => {
  for (const field of USER_DISPLAY_FIELD_PRIORITY) {
    const fromDoc = getField(getFieldsData(field));
    if (fromDoc) {
      return fromDoc;
    }
  }
  if (identityFields) {
    for (const field of USER_DISPLAY_FIELD_PRIORITY) {
      const v = identityFields[field];
      if (typeof v === 'string' && v.trim() !== '') {
        return v;
      }
    }
    const sortedKeys = Object.keys(identityFields).sort();
    for (const key of sortedKeys) {
      if (!USER_ID_FIELD_KEYS.has(key) && !key.endsWith('.id')) {
        const v = identityFields[key];
        if (typeof v === 'string' && v.trim() !== '') {
          return v;
        }
      }
    }
    for (const key of ['user.id', 'entity.id'] as const) {
      const v = identityFields[key];
      if (typeof v === 'string' && v.trim() !== '') {
        return v;
      }
    }
  }
  return undefined;
};

/**
 * Same as {@link resolveUserNameForEntityInsights} for host panels (host.name before host.id).
 */
export const resolveHostNameForEntityInsights = (
  identityFields: IdentityFields | undefined,
  getFieldsData: GetFieldsData
): string | undefined => {
  for (const field of HOST_DISPLAY_FIELD_PRIORITY) {
    const fromDoc = getField(getFieldsData(field));
    if (fromDoc) {
      return fromDoc;
    }
  }
  if (identityFields) {
    for (const field of HOST_DISPLAY_FIELD_PRIORITY) {
      const v = identityFields[field];
      if (typeof v === 'string' && v.trim() !== '') {
        return v;
      }
    }
    const sortedKeys = Object.keys(identityFields).sort();
    for (const key of sortedKeys) {
      if (!HOST_ID_FIELD_KEYS.has(key) && !key.endsWith('.id')) {
        const v = identityFields[key];
        if (typeof v === 'string' && v.trim() !== '') {
          return v;
        }
      }
    }
    for (const key of ['host.id', 'entity.id'] as const) {
      const v = identityFields[key];
      if (typeof v === 'string' && v.trim() !== '') {
        return v;
      }
    }
  }
  return undefined;
};

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

export { ecsSliceToFlattenedDocument } from './utils/ecs_slice_to_flattened_document';
