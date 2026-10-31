/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { QueryPlan } from '../generator';
import type { ESQLValue, InventoryRow } from './types';

const labelScalar = (
  value: estypes.FieldValue,
  labels: Record<string, string>
): estypes.FieldValue => {
  if (value === null) {
    return null;
  }
  const raw = String(value);
  return Object.hasOwn(labels, raw) ? labels[raw] : raw;
};

const labelValue = (value: ESQLValue, labels: Record<string, string>): ESQLValue =>
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
