/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { parseEmbeddedAlertId } from '../parse_embedded_alert_id';

/**
 * A candidate alert paired with its recovered backing document `_id`.
 *
 * The gate ground-truths the candidate set and returns a keep-set of these
 * `_id`s; the orchestration forwards the original `alert` bytes for the kept
 * subset (Data fidelity principle 1 — original-bytes pass-through).
 */
export interface CandidateAlert {
  /** Backing Elasticsearch document `_id`, recovered from the alert string. */
  id: string;
  /** The original candidate alert string, forwarded unchanged when kept. */
  alert: string;
}

/**
 * The result of validating the candidate alert set's `_id` contract.
 */
export interface ValidateCandidateAlertIdsResult {
  /** Candidates that carry a recoverable backing `_id` (proceed to the gate). */
  validCandidates: CandidateAlert[];
  /**
   * Candidate alert strings that lack a recoverable `_id`. These are rejected
   * from the candidate set per Data fidelity principle 3; the caller surfaces a
   * loud, non-silent contract-violation diagnostic (event log + UI report).
   */
  rejectedAlerts: string[];
}

/**
 * Validates the `_id` contract at the retrieval→gate boundary (Data fidelity
 * principle 3): every alert reaching generation must carry a recoverable
 * backing document `_id`. This generalizes `enforceEmbeddedAlertIds` from the
 * skill-only path to all candidate sources.
 *
 * Candidates with a recoverable `_id` proceed; id-less candidates are rejected
 * from the set and returned in `rejectedAlerts` so the caller can fail them
 * loudly (the gate cannot return a keep decision for an alert it cannot
 * identify, and the downstream pipeline would discard it as a hallucination).
 *
 * A warning is logged identifying how many candidates were rejected; the caller
 * additionally writes the non-silent event-log / diagnostic-report entry.
 */
export const validateCandidateAlertIds = ({
  alerts,
  logger,
}: {
  alerts: string[];
  logger?: Logger;
}): ValidateCandidateAlertIdsResult => {
  const validCandidates = alerts.flatMap((alert) => {
    const id = parseEmbeddedAlertId(alert);

    return id != null ? [{ alert, id }] : [];
  });

  const rejectedAlerts = alerts.filter((alert) => parseEmbeddedAlertId(alert) == null);

  if (rejectedAlerts.length > 0) {
    logger?.warn(
      `Rejected ${rejectedAlerts.length} of ${alerts.length} candidate alert(s) lacking a recoverable backing _id; these violate the _id contract and cannot be ground-truthed by the gate`
    );
  }

  return {
    rejectedAlerts,
    validCandidates,
  };
};
