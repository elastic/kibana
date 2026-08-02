/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { PndProposalGroup } from '@kbn/pnd-common';

import { filterGroupsByWatch } from '../../helpers/filter_groups_by_watch';

export interface UseWatchFilterResult {
  /** Selecting the watch already selected clears it. */
  onWatchClick: (workflowId: string) => void;
  /** The groups to render: the watch filter applied, emptied buckets dropped. */
  visible: PndProposalGroup[];
  watchFilter: string | null;
  /**
   * The chips to draw: the watches present in the unfiltered groups **plus the selected one**,
   * sorted, so the row is stable across refetches.
   */
  workflowIds: string[];
}

/**
 * The watch-filter state for a grouped list of proposals, shared by the queue and the history.
 *
 * This is all that is left of the page's filtering: the phase pills went with the move to grouping
 * (D11), because a phase is a section that is always drawn. A watch is not derivable from the
 * grouping, so it stays a filter.
 *
 * State is per-instance, so switching surfaces starts the other list unfiltered rather than carrying
 * over a selection made against a different set of rows.
 */
export const useWatchFilter = (groups: PndProposalGroup[]): UseWatchFilterResult => {
  const [watchFilter, setWatchFilter] = useState<string | null>(null);

  /**
   * The selected watch is included even after its last row is answered and the refetch drops it.
   * Otherwise the chip that emptied the list disappears with the rows, and the empty prompt telling
   * the analyst to clear the filter points at a control that is no longer on the page.
   */
  const workflowIds = useMemo(() => {
    const seen = new Set<string>(watchFilter == null ? [] : [watchFilter]);

    for (const group of groups) {
      for (const proposal of group.proposals) {
        seen.add(proposal.workflowId);
      }
    }

    return [...seen].sort();
  }, [groups, watchFilter]);

  const visible = useMemo<PndProposalGroup[]>(
    () => filterGroupsByWatch({ groups, watchFilter }),
    [groups, watchFilter]
  );

  const onWatchClick = useCallback(
    (workflowId: string) =>
      setWatchFilter((current) => (current === workflowId ? null : workflowId)),
    []
  );

  return {
    onWatchClick,
    visible,
    watchFilter,
    workflowIds,
  };
};
