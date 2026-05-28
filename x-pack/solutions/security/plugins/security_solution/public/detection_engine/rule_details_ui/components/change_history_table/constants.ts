/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DATE_DISPLAY_FORMAT = 'MMM D\\, YYYY @ HH:mm';
export const DATE_DISPLAY_FORMAT_WITH_SECONDS = 'MMM D, YYYY @ HH:mm:ss';

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50];

/**
 * Maximum number of changed-field badges rendered inline on a timeline row
 * before the remainder is collapsed into a trailing "+N" overflow badge.
 * Keeps each row at a stable height when a single change touches many fields
 * (e.g. bulk edit or prebuilt rule upgrade).
 */
export const INLINE_CHANGED_FIELDS_LIMIT = 3;

/**
 * Maximum number of overflowed field names listed inside the "+N" badge's
 * hover tooltip. Caps tooltip size for changes that touch large field sets
 * (full rule snapshots can have dozens of fields).
 */
export const POPOVER_CHANGED_FIELDS_LIMIT = 30;
