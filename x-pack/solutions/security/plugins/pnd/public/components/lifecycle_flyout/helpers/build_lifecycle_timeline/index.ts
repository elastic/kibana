/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PhaseCatalogEntry,
  PndPhaseStepProjection,
  PndPhaseStepStatus,
} from '@kbn/pnd-common';

import type { LifecycleRow } from '../../../lifecycle_view';

/** One lifecycle row that actually ran, placed on the run's own chronology. */
export interface LifecycleTimelineEntry {
  entry: PhaseCatalogEntry;
  /** Absent while the step is still running. */
  finishedAt?: string;
  /** Kept whole so the entry can link to its own step execution. */
  projection: PndPhaseStepProjection;
  startedAt: string;
  /** The row's **resolved** status, not the raw projection status — see `buildLifecycleRows`. */
  status: PndPhaseStepStatus;
}

/**
 * The rows that have a place on a timeline, in the order they happened.
 *
 * Deliberately **not** the whole catalog: the Lifecycle section already renders all 11 rows
 * in catalog order, and repeating them here in the same order would make the Timeline tab a second
 * copy of it. What a timeline adds is the one ordering the catalog cannot express — what the run did
 * first — so a row with no `startedAt` has nothing to contribute and is left out rather than piled at
 * one end. That also keeps the tab honest about a discovery whose watch has barely started: two
 * entries, not 11 rows of "not started".
 *
 * Subordinate lines are not entries of their own. A subordinate names the *same* step execution as
 * its primary row (see `DUPLICATED_GATE_PAIRS`), so it would appear as a second event at the same
 * instant claiming the same work.
 *
 * ISO 8601 timestamps compare correctly as strings when they share an offset, which the server's do
 * — they all come from the engine as UTC `Z` instants. Comparing the strings rather than parsing
 * them keeps an unparseable value from silently sorting as `NaN`.
 */
export const buildLifecycleTimeline = (rows: readonly LifecycleRow[]): LifecycleTimelineEntry[] =>
  rows
    .flatMap(({ entry, projection, status }) =>
      projection?.startedAt != null
        ? [
            {
              entry,
              finishedAt: projection.finishedAt,
              projection,
              startedAt: projection.startedAt,
              status,
            },
          ]
        : []
    )
    // `sort` is stable, so entries that started at the same instant keep catalog order.
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
