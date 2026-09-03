/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PHASE_CATALOG, PHASE_CATALOG_GATES } from '@kbn/pnd-common';
import type {
  PhaseCatalogEntry,
  PndPhaseStepProjection,
  PndPhaseStepStatus,
} from '@kbn/pnd-common';

/** Status for a `live` catalog row the response did not project: its watch has not reached it. */
export const MISSING_LIVE_STATUS: PndPhaseStepStatus = 'not_started';

/**
 * Status for an **upstream** catalog row the response did not project.
 *
 * `upstream`, never `not_started`: the row is not waiting to happen, the work already happened
 * before PND was invoked. `not_started` would read as "any moment now".
 */
export const MISSING_UPSTREAM_STATUS: PndPhaseStepStatus = 'upstream';

/** One catalog row and the step execution that realizes it. */
export interface LifecycleStepLine {
  entry: PhaseCatalogEntry;
  /** The projected step execution, or `undefined` when the response carried no row for it. */
  projection?: PndPhaseStepProjection;
  /** The status to render — see {@link resolveStatus} for the two corrections applied. */
  status: PndPhaseStepStatus;
}

export interface LifecycleRow extends LifecycleStepLine {
  /**
   * Catalog rows that resolve to the **same** orchestrator step as this one, rendered as
   * subordinate lines under it rather than as independent rows. Empty for all but the three
   * duplicated gate/step pairs (see {@link DUPLICATED_GATE_PAIRS}).
   */
  subordinates: readonly LifecycleStepLine[];
}

export interface BuildLifecycleRowsParams {
  /** Defaults to the real four-phase catalog; injectable so the pairing logic is testable. */
  catalog?: readonly PhaseCatalogEntry[];
  /** `steps` from `GET /internal/pnd/executions/{correlationId}`. */
  steps: readonly PndPhaseStepProjection[];
}

const GATE_ROW_IDS: ReadonlySet<string> = new Set(PHASE_CATALOG_GATES.map(({ id }) => id));

/** Distinct `orchestratorStepId`s, in catalog order, with the entries that claim each one. */
const groupByOrchestratorStepId = (
  catalog: readonly PhaseCatalogEntry[]
): ReadonlyArray<readonly PhaseCatalogEntry[]> => {
  const orchestratorStepIds = catalog
    .flatMap(({ orchestratorStepId }) => (orchestratorStepId != null ? [orchestratorStepId] : []))
    .filter((stepId, index, all) => all.indexOf(stepId) === index);

  return orchestratorStepIds.map((stepId) =>
    catalog.filter(({ orchestratorStepId }) => orchestratorStepId === stepId)
  );
};

export interface DuplicatedGatePair {
  /** The lifecycle step row, rendered as the row. */
  primaryId: string;
  /** The phase-gate row that names the same step execution, rendered as a subordinate line. */
  subordinateId: string;
}

/**
 * Resolve which entry of a shared-`orchestratorStepId` group owns the row.
 *
 * The lifecycle step row wins and the phase-gate row becomes its subordinate line: the step rows are
 * the four-phase document's own spine, and the gate rows are PND's overlay on it.
 */
const resolvePairing = (
  entries: readonly PhaseCatalogEntry[]
): { primary: PhaseCatalogEntry; subordinates: readonly PhaseCatalogEntry[] } => {
  const primary = entries.find(({ id }) => !GATE_ROW_IDS.has(id)) ?? entries[0];

  return { primary, subordinates: entries.filter((entry) => entry !== primary) };
};

const pairingsIn = (catalog: readonly PhaseCatalogEntry[]) =>
  groupByOrchestratorStepId(catalog)
    .filter((entries) => entries.length > 1)
    .map(resolvePairing);

/**
 * The catalog rows that duplicate another row's step execution, derived rather than restated so a
 * fifth gate or a re-pointed step cannot silently produce two rows that disagree.
 *
 * Three of the four HITL gates land on a step row as well: `step-2-7`/`gate-promote-incident`,
 * `step-3-5`/`gate-incident-contained` and `step-4-3`/`gate-apply-tuning`. The server resolves each
 * pair to one step execution, so rendering them as two independent rows would invite exactly the
 * disagreement the data cannot have.
 */
export const DUPLICATED_GATE_PAIRS: readonly DuplicatedGatePair[] = pairingsIn(
  PHASE_CATALOG
).flatMap(({ primary, subordinates }) =>
  subordinates.map((subordinate) => ({ primaryId: primary.id, subordinateId: subordinate.id }))
);

/**
 * The status to render for one catalog row, with two corrections the raw projection cannot make:
 *
 * 1. **An absent row** is resolved from the catalog's own `liveness`, so a truncated or
 *    older-shaped response degrades to an honest status instead of an empty badge.
 * 2. **`completed` or `not_started` on an upstream row is coerced to `upstream`.** No PND step
 *    execution realizes an upstream row, so `completed` would claim a PND step ran and `not_started`
 *    would suggest one is about to — either would misdescribe work Attack Discovery already did. The
 *    server resolves those rows from the catalog and never projects either status, so this is a guard
 *    against a widened or older server rather than a routine correction. Any other status passes
 *    through, including a genuine `failed`, which is worth seeing.
 */
const resolveStatus = (
  entry: PhaseCatalogEntry,
  projection: PndPhaseStepProjection | undefined
): PndPhaseStepStatus => {
  const isLive = entry.liveness === 'live';

  if (projection == null) {
    return isLive ? MISSING_LIVE_STATUS : MISSING_UPSTREAM_STATUS;
  }

  if (!isLive && (projection.status === 'completed' || projection.status === MISSING_LIVE_STATUS)) {
    return MISSING_UPSTREAM_STATUS;
  }

  return projection.status;
};

/**
 * Overlay the execution projection onto the four-phase catalog, producing the rows the lifecycle
 * view renders.
 *
 * The catalog is the skeleton and the response is the overlay — never the other way around — so the
 * view always renders all 14 catalog rows, whatever the response contains. Rows keep catalog
 * order, and a projection for an unknown `phaseStepId` is ignored rather than appended, so a widened
 * server can never inject a row the UI has no copy for.
 */
export const buildLifecycleRows = ({
  catalog = PHASE_CATALOG,
  steps,
}: BuildLifecycleRowsParams): LifecycleRow[] => {
  const projectionByPhaseStepId = new Map(steps.map((step) => [step.phaseStepId, step]));
  const pairings = pairingsIn(catalog);

  const subordinatesByPrimaryId = new Map(
    pairings.map(({ primary, subordinates }) => [primary.id, subordinates])
  );
  const subordinateIds: ReadonlySet<string> = new Set(
    pairings.flatMap(({ subordinates }) => subordinates.map(({ id }) => id))
  );

  return catalog
    .filter(({ id }) => !subordinateIds.has(id))
    .map((entry): LifecycleRow => {
      const projection = projectionByPhaseStepId.get(entry.id);
      const status = resolveStatus(entry, projection);

      return {
        entry,
        projection,
        status,
        // A subordinate line shares the status of its primary row by construction, because the two
        // name one step execution. Its own projection is preferred only for the deep link, so every
        // row still addresses a step; when the response omitted it, the primary's link points at the
        // very same step execution.
        subordinates: (subordinatesByPrimaryId.get(entry.id) ?? []).map(
          (subordinate): LifecycleStepLine => ({
            entry: subordinate,
            projection: projectionByPhaseStepId.get(subordinate.id) ?? projection,
            status,
          })
        ),
      };
    });
};
