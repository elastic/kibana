/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertZeroTelemetryReporter } from '../telemetry';
import { ALERTZERO_TELEMETRY_EVENTS } from '../telemetry/constants';
import type { PreserveResult } from './preserve';

/**
 * Reports what a preservation changed: the Investigation it created, and whether it was the first
 * evidence on that Investigation or an addition to evidence already there. A retry, and a selection
 * that added no new row, send nothing. Payloads carry the seeded hunt id and counts only.
 */
export const reportPreservationTelemetry = ({
  report,
  huntId,
  result,
}: {
  report: AlertZeroTelemetryReporter;
  huntId: string;
  result: PreserveResult;
}): void => {
  const { created, isRetry, addedCount, evidenceCount, hadPriorEvidence } = result;
  if (isRetry) return;

  if (created) {
    report(ALERTZERO_TELEMETRY_EVENTS.HuntInvestigationCreated, {
      hunt_id: huntId,
      trigger: 'manual',
    });
  }
  if (addedCount === 0) return;

  report(
    hadPriorEvidence
      ? ALERTZERO_TELEMETRY_EVENTS.HuntEvidenceAppended
      : ALERTZERO_TELEMETRY_EVENTS.HuntSessionPreserved,
    { hunt_id: huntId, added_count: addedCount, evidence_count: evidenceCount }
  );
};
