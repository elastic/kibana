/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Max length for Cribl `_dataId` values used in routing pipeline conditions. */
export const DATA_ID_MAX_LENGTH = 100;

/**
 * Characters that are not allowed in a Cribl `_dataId`.
 * Allowed: letters, digits, `.`, `_`, `-`.
 */
export const INVALID_DATA_ID_CHARACTERS = /[^a-zA-Z0-9._-]+/g;

const VALID_DATA_ID_PATTERN = /^[a-zA-Z0-9._-]+$/;

/** Strip disallowed characters and truncate a Cribl `_dataId` input (UI parity with namespace). */
export const sanitizeDataIdInput = (value: string): string =>
  value.replace(INVALID_DATA_ID_CHARACTERS, '').slice(0, DATA_ID_MAX_LENGTH);

/** Returns true when `value` is a non-empty allowlisted Cribl `_dataId`. */
export const isValidDataId = (value: string): boolean =>
  value.length > 0 && value.length <= DATA_ID_MAX_LENGTH && VALID_DATA_ID_PATTERN.test(value);
