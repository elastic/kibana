/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Classification of field-value pairs in attack discovery markdown tokens.
 *
 * - `'alertId'`  — an alert document `_id`; chips can link to the alert details flyout.
 * - `'hash'`     — a cryptographic hash (md5, sha1, sha256, …); abbreviated, non-clickable.
 * - `'opaqueId'` — any other long opaque identifier; abbreviated, non-clickable.
 * - `'default'`  — everything else; renders as today with no abbreviation.
 */
export const FIELD_TOKEN_KIND = {
  ALERT_ID: 'alertId',
  HASH: 'hash',
  OPAQUE_ID: 'opaqueId',
  DEFAULT: 'default',
} as const;
export type FieldTokenKind = (typeof FIELD_TOKEN_KIND)[keyof typeof FIELD_TOKEN_KIND];

/** Minimum string length before a value is abbreviated. Keeps short ids readable as-is. */
export const MIN_ABBREVIATE_LENGTH = 16;

/** Characters of the value shown in the abbreviated chip label. */
export const ABBREVIATED_LENGTH = 8;

/** Fields whose value is an alert `_id` — the only kind that renders a clickable chip. */
const ALERT_ID_FIELD_NAMES: ReadonlySet<string> = new Set(['_id', 'kibana.alert.uuid']);

/**
 * Matches hash sub-fields: `file.hash.sha256`, `process.hash.md5`, `dll.hash.sha1`, …
 * The trailing segment is constrained to known algorithm names so novel field names like
 * `process.hash.myfield` are NOT matched.
 */
const HASH_FIELD_REGEX =
  /(?:^|\.)hash\.(?:md5|sha1|sha256|sha384|sha512|ssdeep|tlsh|imphash|pehash)$/;

/**
 * Named identifier fields known to carry long opaque values worth abbreviating.
 * Short numeric/meaningful ids (`process.pid`, bare integer `user.id`) are excluded by the
 * `MIN_ABBREVIATE_LENGTH` gate at the top of `getFieldTokenKind`.
 */
const ID_LIKE_FIELD_NAMES: ReadonlySet<string> = new Set([
  'process.entity_id',
  'process.parent.entity_id',
  'process.entry_leader.entity_id',
  'process.session_leader.entity_id',
  'process.group_leader.entity_id',
  'agent.id',
  'host.id',
  'user.id',
  'group.id',
  'container.id',
  'cloud.instance.id',
  'device.id',
  'event.id',
  'kibana.alert.rule.uuid',
  'kibana.alert.rule.execution.uuid',
  'kibana.alert.original_event.id',
]);

/** Field name ends with `.id`, `.uuid`, or `.guid` — a heuristic fallback for unlisted fields. */
const ID_SUFFIX_REGEX = /(?:^|\.)(?:id|uuid|guid)$/;

/**
 * Value looks "opaque" — no whitespace, only alphanumeric or common token-separator characters.
 * Explicitly excludes `/` so file paths (`/var/log/auth.log`) are never matched.
 * Used together with `ID_SUFFIX_REGEX` to avoid abbreviating structured paths or names.
 */
const OPAQUE_VALUE_CHARS_REGEX = /^[A-Za-z0-9+=_.:-]+$/;

/**
 * Pure-hex long string — at least 40 chars, only hex digits (no separators).
 * Catches sha1/sha256/sha512 values under unlisted field names.
 * Hostnames, file paths, and command lines never match this.
 */
const LONG_HEX_VALUE_REGEX = /^[0-9a-f]{40,128}$/i;

/**
 * Returns the kind of a `{{ fieldName fieldValue }}` token.
 * Only called when `fieldValue` is a string; returns `'default'` otherwise (and for values
 * containing whitespace, which indicates a multi-value token such as `{{ _id a b }}`).
 */
export const getFieldTokenKind = (
  fieldName: string,
  fieldValue: string | number | undefined
): FieldTokenKind => {
  if (typeof fieldValue !== 'string') return FIELD_TOKEN_KIND.DEFAULT;
  // Rule 0: whitespace = multi-value token or composite value — never abbreviate
  if (/\s/.test(fieldValue)) return FIELD_TOKEN_KIND.DEFAULT;
  if (fieldValue.length < MIN_ABBREVIATE_LENGTH) return FIELD_TOKEN_KIND.DEFAULT;

  // Rule 1: alert id fields
  if (ALERT_ID_FIELD_NAMES.has(fieldName)) return FIELD_TOKEN_KIND.ALERT_ID;

  // Rule 2: hash fields by name
  if (HASH_FIELD_REGEX.test(fieldName)) return FIELD_TOKEN_KIND.HASH;

  // Rule 3: named opaque id fields
  if (ID_LIKE_FIELD_NAMES.has(fieldName)) return FIELD_TOKEN_KIND.OPAQUE_ID;

  // Rule 4: field name ends with .id/.uuid/.guid and value contains only safe characters
  if (ID_SUFFIX_REGEX.test(fieldName) && OPAQUE_VALUE_CHARS_REGEX.test(fieldValue)) {
    return FIELD_TOKEN_KIND.OPAQUE_ID;
  }

  // Rule 5: value-only heuristic — long pure-hex (e.g. sha256 under an unknown field name)
  if (LONG_HEX_VALUE_REGEX.test(fieldValue)) return FIELD_TOKEN_KIND.HASH;

  return FIELD_TOKEN_KIND.DEFAULT;
};

/**
 * Returns the abbreviated chip label: the first 8 characters followed by `…`.
 * When the value is short enough that abbreviating would save fewer than 4 characters the
 * original value is returned unchanged.
 */
export const abbreviateFieldValue = (value: string): string => {
  if (value.length <= ABBREVIATED_LENGTH + 4) return value;
  return `${value.slice(0, ABBREVIATED_LENGTH)}…`;
};

/**
 * EUI icon types for each kind. All verified present in `@elastic/eui`.
 * `'default'` carries no icon (falls through to the existing `iconLookup` or empty string).
 */
const KIND_ICONS: Readonly<Record<FieldTokenKind, string>> = {
  [FIELD_TOKEN_KIND.ALERT_ID]: 'warning',
  [FIELD_TOKEN_KIND.HASH]: 'key',
  [FIELD_TOKEN_KIND.OPAQUE_ID]: 'tag',
  [FIELD_TOKEN_KIND.DEFAULT]: '',
};

/**
 * Returns the EUI icon type for the given kind, or `''` when the kind is `'default'`.
 * Call sites should let the `iconLookup` in `helpers.ts` take precedence:
 * `getIconFromFieldName(fieldName) || getIconForKind(fieldName, kind)`.
 */
export const getIconForKind = (_fieldName: string, kind: FieldTokenKind): string =>
  KIND_ICONS[kind];
