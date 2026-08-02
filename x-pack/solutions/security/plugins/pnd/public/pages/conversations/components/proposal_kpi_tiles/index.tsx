/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  CONVERSATION_QUEUE_CATEGORIES,
  type PndActivityBucket,
  type PndProposalGroup,
  type RecommendedAction,
} from '@kbn/pnd-common';

import { useProposalsActivity } from '../../../../hooks/use_proposals_activity';
import { buildSparklineSeries } from './helpers/build_sparkline_series';
import { groupProposalsByAction } from './helpers/group_proposals_by_action';
import { ProposalKpiTile } from './proposal_kpi_tile';

/** A stable identity for "no series", so a failed read does not remount the four charts. */
const NO_BUCKETS: PndActivityBucket[] = [];

export interface ProposalKpiTilesProps {
  /**
   * The **same** groups `ConversationQueue` is given, so a tile's count and the rows on screen are one
   * derivation rather than two that agree until they don't. Sparse, like the response.
   */
  groups: PndProposalGroup[];
  /**
   * Zeroes render when a filter is active; the tiles hide when the queue is genuinely empty.
   * Matches the queue's empty type sections (`EventSections.tsx` line 51).
   */
  isFilterActive?: boolean;
  /** Asks the queue to reveal the actions of one phase. */
  onSelectSection: (action: RecommendedAction) => void;
}

/**
 * The at-a-glance layer over the queue: four cards, one per phase, in the fixed
 * contain → escalate → investigate → tune order (decision D11).
 *
 * The queue below defaults to the same category axis (D7 restored), so a tile's
 * count and its type section are one derivation. Four tiles still render whenever
 * anything is on screen, including a zero for a phase that has no pending action —
 * "nothing to contain" is a fact, not a missing card.
 *
 * **Zero-state:** zeroes render when a filter is active; the tiles hide when the
 * queue is genuinely empty. That is the same rule the type sections use. The
 * earlier "all four phases, always, including the zeroes" comment contradicted
 * this component's own `visibleTotal === 0` early return — the conditional rule
 * is the truth.
 *
 * A card is a **button**, not an ornament — pressing it expands the matching type
 * section and scrolls to it. A zero-count tile stays live and simply has nothing
 * to reveal; it is not disabled, because a tile that went dead would be saying
 * something about the *tile* rather than about the queue.
 *
 * **Each card carries two numbers from two sources, and conflating them would be a lie in both
 * directions.** The headline count is derived here with {@link groupProposalsByAction} from the
 * already-filtered groups the page renders, never from a second query. A tile therefore counts what is
 * **on screen**, so a watch chip that hides rows lowers the tile with them, and no new key exists to
 * fall out of step with the queue's own (decision D15). The sparkline under it is a different
 * measurement entirely: gates *opened* per hour over the last 24 hours, read once here for all four
 * cards from `GET /internal/pnd/proposals/activity` under its own key, and deliberately **not**
 * filtered by watch.
 *
 * That second read is allowed to fail without consequence. There is no zero-filled fallback — a flat
 * line is an affirmative claim that nothing happened all day — so a failure simply leaves the cards
 * without charts, counts intact.
 */
export const ProposalKpiTiles: React.FC<ProposalKpiTilesProps> = ({
  groups,
  isFilterActive = false,
  onSelectSection,
}) => {
  const byAction = useMemo(() => groupProposalsByAction(groups), [groups]);

  const visibleTotal = useMemo(
    () => CONVERSATION_QUEUE_CATEGORIES.reduce((total, { id }) => total + byAction[id].length, 0),
    [byAction]
  );

  const { data } = useProposalsActivity({ enabled: visibleTotal > 0 });
  const buckets = data?.buckets ?? NO_BUCKETS;

  if (visibleTotal === 0 && !isFilterActive) {
    return null;
  }

  return (
    <EuiFlexGroup
      alignItems="stretch"
      data-test-subj="pndBriefKpiTiles"
      gutterSize="m"
      responsive={false}
    >
      {CONVERSATION_QUEUE_CATEGORIES.map(({ id: action, label }) => (
        <EuiFlexItem grow={1} key={action}>
          <ProposalKpiTile
            action={action}
            count={byAction[action].length}
            label={label}
            onSelect={() => onSelectSection(action)}
            series={buildSparklineSeries({ action, buckets })}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
