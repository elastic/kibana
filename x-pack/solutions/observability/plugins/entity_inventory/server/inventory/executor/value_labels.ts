/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryPlan } from '../generator';
import type { EsqlScalar, EsqlValue, InventoryRow } from './types';

const labelScalar = (value: EsqlScalar, labels: Record<string, string>): EsqlScalar => {
  if (value === null) {
    return null;
  }
  const raw = String(value);
  return labels[raw] ?? raw;
};

const labelValue = (value: EsqlValue, labels: Record<string, string>): EsqlValue =>
  Array.isArray(value)
    ? value.map((element) => labelScalar(element, labels))
    : labelScalar(value, labels);

/**
 * Maps each labelled attribute's raw values to their labels; an unmapped value passes through
 * stringified, null stays null and multi-values map element-wise.
 */
export const applyValueLabels = (rows: InventoryRow[], plan: QueryPlan): InventoryRow[] => {
  const labelled = plan.attributes.flatMap(({ name, valueLabels }) =>
    valueLabels ? [{ name, valueLabels }] : []
  );
  return rows.map((row) => {
    const next = { ...row };
    labelled.forEach(({ name, valueLabels }) => {
      const value = next[name];
      if (value !== undefined) {
        next[name] = labelValue(value, valueLabels);
      }
    });
    return next;
  });
};
