/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pure predicates over the classification step's verdict array for a MULTI-ALERT batch.
 *
 * The workflow classifies `consts.batch_size` (50) alerts per model call and asks for exactly one
 * verdict per alert id, so a batch is the only place where a model can:
 *   - over-generate (`verdicts.length > batchSize`),
 *   - repeat an id (same alert answered twice),
 *   - emit an id from outside the batch (hallucinated or from a previous batch),
 *   - drop an alert (no verdict for one of the ids it was given),
 *   - keep a well-formed id but attach another alert's evidence to it (an id corruption that lands
 *     on a REAL alert in the same batch — measured on `gpt-oss-120b`, whose corrupted ids are
 *     sometimes the same length and a valid hex character short of the original).
 *
 * Production handles the first four after parsing: `filter_verdicts_to_batch` drops foreign ids,
 * `single`/`first` pairing answers one alert once even when an id repeats, and the PR that removed
 * `verdicts.maxItems` slices to `batch_size`. It cannot detect the fifth: a verdict whose id is a
 * real sibling alert passes every id-membership check while describing a different alert, so the
 * wrong verdict note is written to the wrong alert. That case is only observable by comparing the
 * verdict's own evidence against the alert its id claims.
 *
 * These functions are deliberately free of `@kbn/evals` and of any I/O so they can be unit-tested
 * directly and mutated check by check.
 */

export interface RawVerdictLike {
  /** Alert id the model echoed; the workflow pairs verdicts to alerts on this field. */
  id?: string;
  classification?: string;
  rationale?: string;
  contributing_factors?: string[];
}

/** One alert of the batch, as the fixture defines it. */
export interface BatchAlertRef {
  id: string;
  /** Golden label for this alert. */
  expected: string;
  /**
   * Distinctive values that appear in the alert block the model was shown (`host.name`, the
   * unsigned binary's name, a scanned file name). Only markers that are unique inside the batch can
   * discriminate between alerts; the rest are dropped (see `uniqueMarkers`).
   */
  markers?: string[];
}

export interface VerdictContentMismatch {
  /** Verdict id, i.e. the alert the verdict claims to describe. */
  id: string;
  /** Batch alert ids whose markers appear in the verdict text instead of (or as well as) its own. */
  describedOtherAlertIds: string[];
}

export interface BatchVerdictDiagnostics {
  batchSize: number;
  /** Length of the raw `verdicts` array the classification step returned. */
  rawVerdictCount: number;
  /** Raw count minus batch size when positive: the over-generation the post-parse cap must carry. */
  overGeneratedBy: number;
  /** Ids in the raw array that do not belong to this batch. */
  foreignIds: string[];
  /** Ids appearing more than once in the raw array. */
  duplicateIds: string[];
  /** Batch alerts the model returned no verdict for. */
  missingIds: string[];
  /** Fraction of batch alerts with at least one verdict; 1 means every alert was answered. */
  coverage: number;
  /** Verdict positions whose id does not match the alert at the same position in the batch. */
  orderMismatchCount: number;
  /** Verdicts whose text names only OTHER alerts' unique markers. */
  contentMismatches: VerdictContentMismatch[];
  /** Verdicts whose text names both their own and another alert's markers (a merge is suspected). */
  ambiguousVerdicts: string[];
  /** Verdicts whose text names at least one batch alert's unique marker. */
  determinableVerdicts: number;
  /** Verdicts whose text names no batch alert marker, so correspondence cannot be decided. */
  undeterminedVerdicts: number;
  /** Fraction of batch alerts whose paired verdict carries the golden label. */
  accuracy: number;
  matchedIds: string[];
  predictions: Record<string, string | undefined>;
}

/**
 * Markers that identify exactly one alert in the batch and are not a substring of another alert's
 * markers (otherwise a marker match cannot be attributed). Without this filter a shared value
 * (`MsMpEng.exe`, `C:\Windows\System32`) would look like a correspondence mismatch on every verdict.
 */
export const uniqueMarkers = (
  alerts: BatchAlertRef[]
): Array<{ id: string; markers: string[] }> => {
  const all = alerts.flatMap((alert) => (alert.markers ?? []).map((m) => ({ id: alert.id, m })));
  return alerts.map((alert) => {
    const own = (alert.markers ?? []).filter((marker) => {
      const lower = marker.toLowerCase();
      if (!lower) {
        return false;
      }
      const owners = new Set(
        all
          .filter((entry) => {
            const other = entry.m.toLowerCase();
            // A marker is ambiguous when it belongs to another alert, or overlaps another alert's
            // marker in either direction (one being a substring of the other).
            return entry.id !== alert.id && (lower === other || other.includes(lower));
          })
          .map((entry) => entry.id)
      );
      return owners.size === 0;
    });
    return { id: alert.id, markers: own };
  });
};

const verdictText = (verdict: RawVerdictLike): string =>
  [verdict.rationale ?? '', ...(verdict.contributing_factors ?? [])].join(' \n ').toLowerCase();

/**
 * Analyses one batch's raw verdict array against the alerts the model was given. Pure: no scoring
 * decision is made here, only counts, so the evaluators can each pick the quantity they score.
 */
export const analyzeBatchVerdicts = (
  alerts: BatchAlertRef[],
  rawVerdicts: RawVerdictLike[]
): BatchVerdictDiagnostics => {
  const batchIds = new Set(alerts.map((alert) => alert.id));
  const ids = rawVerdicts.map((verdict) => verdict.id).filter((id): id is string => id != null);

  const foreignIds = [...new Set(ids.filter((id) => !batchIds.has(id)))];
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];

  // First verdict per id, which is what the workflow's `select_alert_verdict` pairs to an alert.
  const firstById = new Map<string, RawVerdictLike>();
  rawVerdicts.forEach((verdict) => {
    if (verdict.id != null && batchIds.has(verdict.id) && !firstById.has(verdict.id)) {
      firstById.set(verdict.id, verdict);
    }
  });

  const missingIds = alerts.filter((alert) => !firstById.has(alert.id)).map((alert) => alert.id);
  const matchedIds = alerts.filter((alert) => firstById.has(alert.id)).map((alert) => alert.id);

  const orderMismatchCount = rawVerdicts.filter(
    (verdict, index) => alerts[index] !== undefined && verdict.id !== alerts[index].id
  ).length;

  const markersById = new Map(uniqueMarkers(alerts).map(({ id, markers }) => [id, markers]));
  const contentMismatches: VerdictContentMismatch[] = [];
  const ambiguousVerdicts: string[] = [];
  let determinableVerdicts = 0;

  rawVerdicts.forEach((verdict) => {
    if (verdict.id == null || !batchIds.has(verdict.id)) {
      return;
    }
    const text = verdictText(verdict);
    const ownMarkers = markersById.get(verdict.id) ?? [];
    const ownHit = ownMarkers.some((marker) => text.includes(marker.toLowerCase()));
    const otherHits: string[] = [];
    markersById.forEach((markers, otherId) => {
      if (otherId !== verdict.id && markers.some((marker) => text.includes(marker.toLowerCase()))) {
        otherHits.push(otherId);
      }
    });

    if (ownHit || otherHits.length > 0) {
      determinableVerdicts += 1;
    }
    if (otherHits.length > 0 && ownHit) {
      ambiguousVerdicts.push(verdict.id);
    }
    if (otherHits.length > 0 && !ownHit) {
      contentMismatches.push({ id: verdict.id, describedOtherAlertIds: otherHits });
    }
  });

  const predictions: Record<string, string | undefined> = {};
  let correct = 0;
  alerts.forEach((alert) => {
    const verdict = firstById.get(alert.id);
    predictions[alert.id] = verdict?.classification;
    if (verdict?.classification === alert.expected) {
      correct += 1;
    }
  });

  const batchSize = alerts.length;
  return {
    batchSize,
    rawVerdictCount: rawVerdicts.length,
    overGeneratedBy: Math.max(0, rawVerdicts.length - batchSize),
    foreignIds,
    duplicateIds,
    missingIds,
    coverage: batchSize === 0 ? 1 : matchedIds.length / batchSize,
    orderMismatchCount,
    contentMismatches,
    ambiguousVerdicts,
    determinableVerdicts,
    undeterminedVerdicts:
      rawVerdicts.filter((verdict) => verdict.id != null && batchIds.has(verdict.id)).length -
      determinableVerdicts,
    accuracy: batchSize === 0 ? 1 : correct / batchSize,
    matchedIds,
    predictions,
  };
};

/** Checks the card's integrity list; the evaluator scores 1 only when every one holds. */
export const integrityChecks = (
  diagnostics: BatchVerdictDiagnostics
): {
  countMatches: boolean;
  noDuplicates: boolean;
  noForeignIds: boolean;
  fullCoverage: boolean;
} => ({
  countMatches: diagnostics.rawVerdictCount === diagnostics.batchSize,
  noDuplicates: diagnostics.duplicateIds.length === 0,
  noForeignIds: diagnostics.foreignIds.length === 0,
  fullCoverage: diagnostics.missingIds.length === 0,
});
