/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertGroup, EsqlValue } from './types';

const toList = (value: EsqlValue | undefined): string[] => {
  if (value === null || value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value.map(String) : [String(value)];
};

/** Reads rows of `STATS VALUES(<alert id>) BY <key fields>`: the alert ids, then one value per field. */
export const toAlertGroups = (rows: ReadonlyArray<readonly EsqlValue[]>): AlertGroup[] =>
  rows.map(([alertIds, ...values]) => ({
    alertIds: toList(alertIds),
    values: values.map(String),
  }));

/** The most alerts an explain query lists for one entity. */
export const MAX_EXPLAINED_ALERTS = 100;

const isNameCharacter = (character: string): boolean =>
  (character >= 'a' && character <= 'z') ||
  (character >= 'A' && character <= 'Z') ||
  (character >= '0' && character <= '9') ||
  '_@-'.includes(character);

/** Dotted segments of letters, digits, `_`, `@` and `-`: safe to put inside ES|QL text as a field. */
export const isLiteralField = (field: string): boolean =>
  field.split('.').every((segment) => segment.length > 0 && [...segment].every(isNameCharacter));

export const assertLiteralField = (field: string): void => {
  if (!isLiteralField(field)) {
    throw new Error(`"${field}" is not a literal field path`);
  }
};
