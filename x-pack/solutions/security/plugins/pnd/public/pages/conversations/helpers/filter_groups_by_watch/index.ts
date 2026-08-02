/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndProposalGroup } from '@kbn/pnd-common';

/**
 * The groups one watch is responsible for, with the buckets it emptied dropped.
 *
 * A bucket that filtered down to nothing is removed rather than kept as an empty group, so the
 * sections a watch has no rows in read as "0" from the group list's own rule instead of drawing a
 * header for a watch that raised nothing.
 *
 * `null` is "every watch", not "no watch" — but a group that arrived empty is dropped either way, so
 * an unfiltered page and a filtered one agree on what an empty bucket is.
 *
 * Shared by the queue's filter hook and the record below it, because the record is only readable as
 * "what we did about *this*" if the same chip narrows both.
 */
export const filterGroupsByWatch = ({
  groups,
  watchFilter,
}: {
  groups: PndProposalGroup[];
  watchFilter: string | null;
}): PndProposalGroup[] =>
  groups.flatMap((group): PndProposalGroup[] => {
    const proposals =
      watchFilter == null
        ? group.proposals
        : group.proposals.filter(({ workflowId }) => workflowId === watchFilter);

    return proposals.length > 0 ? [{ ...group, proposals }] : [];
  });
