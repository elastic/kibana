/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OutputColumn } from './columns';
import { quoteIdentifier } from './esql_syntax';
import type { NamedParams, QueryPlan } from './types';

/** The values picked in dropdowns: attribute name to the labels selected, as the response shows them. */
export type AttributeSelections = Record<string, string[]>;

/** What {@link buildAttributePredicate} turns selections into for one plan. */
export interface AttributePredicate {
  /** An ES|QL boolean expression, one conjunct per selected attribute; absent when nothing is selected. */
  predicate?: string;
  params: NamedParams;
}

// The raw values that read as `label` in a plan: those the author maps to it, and the label itself
// unless it is a mapped raw value, since an unmapped raw value passes through as its own label.
const rawValuesOf = (label: string, valueLabels?: Record<string, string>): string[] => {
  if (!valueLabels) {
    return [label];
  }
  const mapped = Object.keys(valueLabels).filter((raw) => valueLabels[raw] === label);
  return Object.hasOwn(valueLabels, label) ? mapped : [...mapped, label];
};

/**
 * Turns the selections into the predicate of one plan, each attribute read from the field that
 * plan's source declares for it. Values go in as named parameters, never as text.
 *
 * Returns `undefined` when the plan cannot match the selections: it carries no field for a selected
 * attribute, or no raw value reads as one of the selected labels.
 */
export const buildAttributePredicate = (
  plan: QueryPlan,
  columns: OutputColumn[],
  selections: AttributeSelections
): AttributePredicate | undefined => {
  const predicates: string[] = [];
  const params: NamedParams = [];

  const selected = Object.entries(selections).filter(([, labels]) => labels.length > 0);
  for (const [selectionIndex, [name, labels]] of selected.entries()) {
    const field = columns.find((column) => column.kind === 'attribute' && column.name === name)
      ?.fieldByPlan?.[plan.index];
    if (field === undefined) {
      return undefined;
    }
    const valueLabels = plan.attributes.find((attribute) => attribute.name === name)?.valueLabels;
    const rawValues = [...new Set(labels.flatMap((label) => rawValuesOf(label, valueLabels)))];
    if (rawValues.length === 0) {
      return undefined;
    }
    const placeholders = rawValues.map((raw, valueIndex) => {
      const param = `a${selectionIndex}v${valueIndex}`;
      params.push({ [param]: raw });
      return `?${param}`;
    });
    predicates.push(`TO_STRING(${quoteIdentifier(field)}) IN (${placeholders.join(', ')})`);
  }

  return { predicate: predicates.length > 0 ? predicates.join(' AND ') : undefined, params };
};
