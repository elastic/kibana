/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PHASE_CATALOG, PHASE_IDS } from '@kbn/pnd-common';
import type { PhaseCatalogEntry, PhaseId } from '@kbn/pnd-common';

export interface PndPhaseGroup {
  /** The phase's entries, in the order they were given. */
  entries: PhaseCatalogEntry[];
  phase: PhaseId;
}

/**
 * Groups four-phase catalog entries by phase, client-side.
 *
 * `GET /internal/pnd/executions/{correlationId}` returns a **flat**
 * `steps` array with no phase grouping, so the flyout has to do this itself.
 *
 * Always returns one group per member of `PHASE_IDS`, in `PHASE_IDS` order, even
 * when a phase has no entries: a phase that renders nothing is indistinguishable
 * from a phase that does not exist, and the four-phase lifecycle always has four
 * phases.
 */
export const groupCatalogEntriesByPhase = (
  entries: readonly PhaseCatalogEntry[] = PHASE_CATALOG
): PndPhaseGroup[] =>
  PHASE_IDS.map((phase) => ({
    entries: entries.filter((entry) => entry.phase === phase),
    phase,
  }));
