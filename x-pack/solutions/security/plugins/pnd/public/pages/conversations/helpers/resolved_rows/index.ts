/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndProposalGroup, PndProposalRow } from '@kbn/pnd-common';

/**
 * The answered gates as one newest-first list, flattened out of the four buckets the history route
 * groups them into.
 *
 * The Resolved section is deliberately **not** grouped by recommended action: an answered gate is a
 * record, and what an approver looks for in a record is "what happened most recently", not "which
 * bucket did it use to be in". The buckets stay on the queue above, where they still decide what to
 * read next.
 *
 * `decision` is what makes a row a record, so a row without one is dropped rather than rendered as a
 * resolution with a blank outcome. The history route only returns answered rows, so in practice this
 * filter is a guard against a pending row arriving through the same shape rather than a case that
 * happens.
 *
 * Rows with no `respondedAt` sort last rather than first. An absent timestamp is unknown, not new,
 * and the alternative — treating it as epoch 0 or as now — would either bury a real answer or put an
 * unknown one at the top of the record.
 */
export const resolvedRows = (groups: PndProposalGroup[]): PndProposalRow[] =>
  groups
    .flatMap(({ proposals }) => proposals)
    .filter(({ decision }) => decision != null)
    .slice()
    .sort((a, b) => {
      if (a.respondedAt == null && b.respondedAt == null) {
        return 0;
      }
      if (a.respondedAt == null) {
        return 1;
      }
      if (b.respondedAt == null) {
        return -1;
      }

      return b.respondedAt.localeCompare(a.respondedAt);
    });
