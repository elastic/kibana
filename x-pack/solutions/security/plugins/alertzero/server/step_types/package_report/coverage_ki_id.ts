/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

/**
 * Subject-stable coverage KI id: `ki-cov-{sha256(space|reportId[|technique])}`.
 * Omitting `technique` gives the report-scoped id used when the run named no techniques.
 */
export const buildCoverageKiId = ({
  spaceId,
  reportId,
  techniqueId,
}: {
  spaceId: string;
  reportId: string;
  techniqueId?: string;
}): string => {
  const subject = techniqueId
    ? `${spaceId}|${reportId}|${techniqueId}`
    : `${spaceId}|${reportId}`;
  const hash = createHash('sha256').update(subject).digest('hex');
  return `ki-cov-${hash}`;
};

/** Human-readable subject token Detection Watch can show; not the KI id. */
export const buildCoverageSubject = ({
  reportId,
  techniqueId,
}: {
  reportId: string;
  techniqueId?: string;
}): string => (techniqueId ? `${reportId}|${techniqueId}` : reportId);
