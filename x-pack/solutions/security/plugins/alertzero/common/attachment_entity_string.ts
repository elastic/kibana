/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * ECS fields Hunt Watch writers may put on SSE `entities[]` as `field: value`.
 * No EUID / ARN decoding: the field written is the field Discover queries.
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

const FIELD_BY_LOWER = new Map(
  ATTACHMENT_ENTITY_FIELDS.map((field) => [field.toLowerCase(), field] as const)
);

const ENTITY_STRING_PATTERN = new RegExp(
  `^(${ATTACHMENT_ENTITY_FIELDS.map((field) => field.replace(/\./g, '\\.')).join('|')}):\\s*(.+)$`,
  'i'
);

export interface ParsedTypedAttachmentEntityString {
  field: AttachmentEntityField;
  value: string;
}

/**
 * Parse an SSE entity string into `{ field, value }`.
 * Returns undefined for anything that is not an allowlisted `field: value` form.
 */
export const parseTypedAttachmentEntityString = (
  raw: string
): ParsedTypedAttachmentEntityString | undefined => {
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
