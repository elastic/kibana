/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndProposalRow } from '@kbn/pnd-common';

/**
 * Security finding S10: de-duplicate proposals by `(correlationId, gateId)`,
 * keeping the newest. A re-triggered orchestrator produces a second set of pending
 * gates for the same discovery, and two identical-looking rows in the queue read as a
 * bug during a demo. Rows are sorted newest-first by `createdAt` and the first row for
 * each key wins, so the survivor is always the most recent gate for that discovery.
 *
 * Rows with an empty `correlationId` (uncorrelated) are never collapsed
 * together — each keeps its own `sourceId` in the key so distinct pending gates are
 * never silently merged when correlation is unavailable.
 */
export const dedupeProposals = (rows: PndProposalRow[]): PndProposalRow[] => {
  const newestFirst = [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const seen = new Set<string>();

  return newestFirst.flatMap((row): PndProposalRow[] => {
    const key =
      row.correlationId.length > 0
        ? `${row.correlationId}::${row.gateId}`
        : `sourceId::${row.sourceId}`;

    if (seen.has(key)) {
      return [];
    }

    seen.add(key);
    return [row];
  });
};
