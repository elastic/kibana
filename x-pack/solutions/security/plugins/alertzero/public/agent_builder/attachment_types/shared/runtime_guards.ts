/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Runtime narrowing for values whose declared types are not backed by validation.
 *
 * Two sources feed the Hunt Watch renderers, and neither is guaranteed below its top level.
 * The threat-report route's response schema declares only `reportId` and passes the rest of
 * the stored document through, and a persisted attachment payload can carry captured fields
 * this build no longer accepts — a `severity` predating an enum change, say. So a collection
 * can arrive as a non-array, an array can hold members of the wrong type, and a field typed
 * `string` or `number` can hold an object.
 *
 * Each helper turns an unusable value into an absent one, which is how a missing value
 * already behaved. That keeps a malformed payload rendering as "nothing to show" for the
 * affected field or section rather than throwing in a `.filter`/`.map`/`groupBy`/
 * `.toLowerCase` or handing React a non-child.
 */

/** Drops members that cannot be safely dereferenced, so callers may read their properties. */
export const asRecordArray = <T>(value: T[] | null | undefined): T[] =>
  Array.isArray(value)
    ? value.filter((item) => typeof item === 'object' && item !== null && !Array.isArray(item))
    : [];

/** Drops members that are not strings; these render as badge text and hrefs. */
export const asStringArray = (value: string[] | null | undefined): string[] =>
  Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];

/** Narrows a single field to a string, so a wrong-typed value reads as absent. */
export const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

/** Narrows a single field to a finite number; `NaN`/`Infinity` render as text, so exclude them. */
export const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/**
 * Narrows a single field to a boolean. Needed even where the value only picks between two
 * labels: the string `'false'` is truthy, so coercing it would state the opposite of the data.
 */
export const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

/** Narrows a nested object, so a wrong-typed branch reads as absent instead of being indexed. */
export const asRecord = <T>(value: T | null | undefined): T | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined;
