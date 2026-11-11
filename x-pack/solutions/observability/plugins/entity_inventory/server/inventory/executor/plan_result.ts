/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLColumn } from '@kbn/es-types';
import { LAST_SEEN_COLUMN } from '../generator';
import type { IdentityPlan, OutputColumn } from '../generator';
import type { PlanResult } from './types';

// Reads what a plan's result says about the indices it reached, from column types alone. Every
// query runs under `SET unmapped_fields="nullify"`, so a field mapped in no index the query read
// comes back as a column of type `null` (documented); the merge takes a column's type from the
// first plan with a type other than `null`.
//
// - `last_seen` is `MAX(@timestamp)`, so type `null` means no readable index behind the pattern
//   maps `@timestamp`: the pattern matches nothing, or nothing the user may read. Elasticsearch
//   gives no other signal for either; a wildcard query drops unreadable indices silently.
// - An identity field typed `null` in every composition means no identity can be formed. This
//   costs no scan: the presence predicate folds to false at planning and no shard is opened. A
//   ranking with one mapped composition runs for that composition. The grouping-field columns are
//   read, not `entity.id`, which the id evaluation types `keyword` even then (`TO_STRING(null)`
//   folds to a typed literal; observed on 9.6). For the same reason an identity field the
//   evaluation overwrites, `entity.id` itself, is read from its raw column
//   (`raw:entity.id`), a copy the list query takes before the evaluation.
// - An attribute typed `null` stays in the query and is reported as unavailable.
//
// ES|QL groups by keyword fields with `index: false` or `doc_values: false` and by `text` fields
// (observed on 9.6, not documented), so "mapped" is the only question; whether a field is indexed
// does not matter.

/** Whether a plan's result can be used, and which of its attribute fields no index maps. */
export interface PlanAvailability {
  usable: boolean;
  reason?: string;
  unavailableFields: string[];
}

// Under `unmapped_fields="nullify"` a field mapped in no index the query read comes back typed
// `null`; a field with no column at all is treated the same way.
const isMapped = (columns: ESQLColumn[], name: string): boolean => {
  const column = columns.find((candidate) => candidate.name === name);
  return column !== undefined && column.type !== 'null';
};

const unavailableAttributeFields = (
  { plan, columns: resultColumns }: PlanResult,
  columns: OutputColumn[]
): string[] => {
  const fields = columns.flatMap(({ name, kind, fieldByPlan }) => {
    const field = fieldByPlan?.[plan.index];
    if (kind !== 'attribute' || field === undefined) {
      return [];
    }
    return isMapped(resultColumns, name) ? [] : [field];
  });
  return [...new Set(fields)];
};

/**
 * Reads a plan's availability from the column types of its result alone: no readable index maps
 * `@timestamp`, or no identity composition is fully mapped, makes it unusable.
 */
export const interpretPlanResult = (
  result: PlanResult,
  { compositions, rawIdentityColumns }: Pick<IdentityPlan, 'compositions' | 'rawIdentityColumns'>,
  columns: OutputColumn[]
): PlanAvailability => {
  const {
    plan: { indexPattern },
    columns: resultColumns,
  } = result;
  const unavailableFields = unavailableAttributeFields(result, columns);

  if (!isMapped(resultColumns, LAST_SEEN_COLUMN)) {
    return {
      usable: false,
      reason: `no readable index behind "${indexPattern}" maps @timestamp`,
      unavailableFields,
    };
  }

  const usable = compositions.some((fields) =>
    fields.every((field) => isMapped(resultColumns, rawIdentityColumns.get(field) ?? field))
  );
  if (usable) {
    return { usable, unavailableFields };
  }
  const wanted = compositions.map((fields) => fields.join(' + ')).join(', ');
  return {
    usable,
    reason: `no index behind "${indexPattern}" maps every field of an identity composition (${wanted})`,
    unavailableFields,
  };
};
