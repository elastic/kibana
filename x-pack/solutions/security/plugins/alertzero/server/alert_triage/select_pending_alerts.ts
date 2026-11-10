/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OPEN_ALERT_STATUSES,
  TRIAGE_FAILED_TAG,
  TRIAGE_PENDING_TAG,
  VERDICT_TAGS,
} from './constants';
import type { TriageAlert } from './types';

const HOUR_MS = 60 * 60 * 1000;

export interface SelectPendingAlertsParams {
  alerts: readonly TriageAlert[];
  now: number;
  lookbackHours: number;
  /** Alert Analysis's tag prefix. An alert carrying it was analysed outside this Worker. */
  analysisTagPrefix: string;
}

export interface SelectedAlerts {
  /** Inside the look-back, unclaimed and not yet analysed. */
  pending: TriageAlert[];
  /** Carrying the claim tag, whatever their age. */
  claimed: TriageAlert[];
  /** Already classified or analysed but still carrying the claim tag. Never planned again. */
  settledClaimed: TriageAlert[];
}

const isDone = (alert: TriageAlert, analysisTagPrefix: string): boolean =>
  alert.tags.some(
    (tag) =>
      tag === TRIAGE_FAILED_TAG ||
      (VERDICT_TAGS as readonly string[]).includes(tag) ||
      tag.startsWith(analysisTagPrefix)
  );

export const selectPendingAlerts = ({
  alerts,
  now,
  lookbackHours,
  analysisTagPrefix,
}: SelectPendingAlertsParams): SelectedAlerts => {
  const cutoff = now - lookbackHours * HOUR_MS;
  const selected: SelectedAlerts = { pending: [], claimed: [], settledClaimed: [] };

  for (const alert of alerts) {
    if (!(OPEN_ALERT_STATUSES as readonly string[]).includes(alert.status)) continue;
    const hasClaim = alert.tags.includes(TRIAGE_PENDING_TAG);
    if (isDone(alert, analysisTagPrefix)) {
      if (hasClaim) selected.settledClaimed.push(alert);
      continue;
    }

    if (hasClaim) {
      selected.claimed.push(alert);
    } else if (alert.timestamp >= cutoff) {
      // Older alerts are left alone: the search window is the look-back, so they are never tagged.
      selected.pending.push(alert);
    }
  }
  return selected;
};
