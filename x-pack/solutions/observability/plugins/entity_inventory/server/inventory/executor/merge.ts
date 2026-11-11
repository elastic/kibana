/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_ID_COLUMN } from '../generator';
import type { OutputColumn } from '../generator';
import type { ESQLValue, InventoryRow, MergeResult, PlanResult } from './types';
import { hasValue, isNewer, lastSeenInstant } from './utils';

// Column names are authored data and may be `constructor` or `__proto__`, so the accumulator is a
// Map, not an object whose inherited members would read as values; objects are built at the end.
interface EntityState {
  row: Map<string, ESQLValue>;
  /** Attribute column to the index pattern of the source that supplied its value. */
  provenance: Map<string, string>;
  lastSeen: number | null;
  /** Attribute column to the `last_seen` of the row that supplied its value. */
  attributeSeen: Map<string, number | null>;
}

const mergeInto = (
  state: EntityState,
  row: InventoryRow,
  columns: OutputColumn[],
  indexPattern: string
): void => {
  const rowSeen = lastSeenInstant(row);
  columns.forEach(({ name, kind }) => {
    const value = Object.hasOwn(row, name) ? row[name] : undefined;
    if (!hasValue(value)) {
      return;
    }
    const current = state.row.get(name);
    if (kind === 'attribute') {
      // Compared with the row that supplied the current value, not the entity's newest row, so a
      // newer row without the attribute does not block an older row that has it.
      if (!hasValue(current) || isNewer(rowSeen, state.attributeSeen.get(name) ?? null)) {
        state.row.set(name, value);
        state.attributeSeen.set(name, rowSeen);
        state.provenance.set(name, indexPattern);
      }
      return;
    }
    if (kind === 'last_seen') {
      if (!hasValue(current) || isNewer(rowSeen, state.lastSeen)) {
        state.row.set(name, value);
        state.lastSeen = rowSeen;
      }
      return;
    }
    if (!hasValue(current)) {
      state.row.set(name, value);
    }
  });
};

/**
 * Merges every plan's rows by `entity.id` in plan order: attributes from the row with the newest
 * `last_seen`, `entity.id` and identity fields first non-null, `last_seen` newest; a null never
 * replaces a value.
 */
export const mergeRows = (results: PlanResult[], columns: OutputColumn[]): MergeResult => {
  const orderedPlans = [...results].sort((a, b) => a.plan.index - b.plan.index);
  const entities = new Map<string, EntityState>();
  let droppedRows = 0;

  orderedPlans.forEach(({ plan, rows }) => {
    rows.forEach((row) => {
      const entityId = row[ENTITY_ID_COLUMN];
      if (typeof entityId !== 'string') {
        droppedRows += 1;
        return;
      }
      const state: EntityState = entities.get(entityId) ?? {
        row: new Map(),
        provenance: new Map(),
        lastSeen: null,
        attributeSeen: new Map(),
      };
      entities.set(entityId, state);

      mergeInto(state, row, columns, plan.indexPattern);
    });
  });

  return {
    rows: [...entities.values()].map(({ row }) => Object.fromEntries(row)),
    provenance: Object.fromEntries(
      [...entities].map(([entityId, state]) => [entityId, Object.fromEntries(state.provenance)])
    ),
    droppedRows,
  };
};
