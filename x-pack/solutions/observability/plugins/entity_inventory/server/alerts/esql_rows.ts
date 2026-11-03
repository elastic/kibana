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
