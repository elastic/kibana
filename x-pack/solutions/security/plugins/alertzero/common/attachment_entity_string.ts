/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Allowlisted ECS fields for SSE `entities[]`.
 * The field written is the field Discover queries. No EUID/ARN decoding.
 */
export const ATTACHMENT_ENTITY_FIELDS = [
  'user.name',
  'user.email',
  'user.id',
  'host.name',
  'host.hostname',
  'host.id',
  'service.name',
  'service.id',
] as const;

export type AttachmentEntityField = (typeof ATTACHMENT_ENTITY_FIELDS)[number];

export interface AttachmentEntityRef {
  field: AttachmentEntityField;
  value: string;
}

const FIELD_SET = new Set<string>(ATTACHMENT_ENTITY_FIELDS);

const FIELD_BY_LOWER = new Map(
  ATTACHMENT_ENTITY_FIELDS.map((field) => [field.toLowerCase(), field] as const)
);

const ENTITY_STRING_PATTERN = new RegExp(
  `^(${ATTACHMENT_ENTITY_FIELDS.map((field) => field.replace(/\./g, '\\.')).join('|')}):\\s*(.+)$`,
  'i'
);

/** True when `field` is an allowlisted entity ECS field. */
export const isAttachmentEntityField = (field: string): field is AttachmentEntityField =>
  FIELD_SET.has(field);

/** True when a value is a well-formed `{ field, value }` entity ref. */
export const isAttachmentEntityRef = (candidate: unknown): candidate is AttachmentEntityRef => {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }
  const record = candidate as Record<string, unknown>;
  return (
    typeof record.field === 'string' &&
    isAttachmentEntityField(record.field) &&
    typeof record.value === 'string' &&
    record.value.trim().length > 0
  );
};

/**
 * Parse a legacy `field: value` entity string into `{ field, value }`.
 * Prefer writing structured `AttachmentEntityRef` objects on new payloads.
 */
export const parseTypedAttachmentEntityString = (raw: string): AttachmentEntityRef | undefined => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  const match = trimmed.match(ENTITY_STRING_PATTERN);
  if (!match) {
    return undefined;
  }

  const canonicalField = FIELD_BY_LOWER.get(match[1].toLowerCase());
  const value = match[2].trim();
  if (!canonicalField || !value) {
    return undefined;
  }

  return { field: canonicalField, value };
};

export const isTypedAttachmentEntityString = (value: string): boolean =>
  parseTypedAttachmentEntityString(value) != null;
