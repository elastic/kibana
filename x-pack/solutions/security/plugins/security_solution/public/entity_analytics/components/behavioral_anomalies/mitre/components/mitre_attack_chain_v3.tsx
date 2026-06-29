/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Prototype "v.3" copy of `MitreAttackChain`. Forked from v.2 so the two
 * prototypes can evolve independently and v.2 stays a snapshot of the
 * earlier iteration. Only delta vs v.2: it renders `MitreTacticDotV3`
 * (no label tooltip, 8 px label gap, smart left-default chip alignment)
 * and forwards a ref to its own wrapper so each dot can detect chip
 * overflow against the chain container.
 *
 * Cleanup: deletes with the rest of the BA-v.3 prototype.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';

import { MITRE_TACTIC_NAMES } from '../tactics';
import { MitreTacticDotV3 } from './mitre_tactic_dot_v3';

interface MitreAttackChainV3Props {
  /** Subset of `MITRE_TACTIC_NAMES` that should be drawn as "triggered". */
  triggeredTactics: readonly string[];
  /** When true, renders the tactic name under each dot. */
  showLabels?: boolean;
  /**
   * Optional per-tactic anomaly counts. When provided, each dot opens a
   * hover chip showing "<count> · <tactic>" — see `MitreTacticDotV3`.
   */
  anomalyCountByTactic?: Readonly<Record<string, number>>;
  /** Currently selected tactic (drives the per-dot selected-state styling). */
  selectedTactic?: string | null;
  /**
   * Click handler for a triggered dot. Non-triggered (gray) dots stay
   * non-interactive per the design.
   */
  onSelectTactic?: (tactic: string) => void;
  /** Optional override for the canonical 15-tactic list (testing only). */
  tactics?: readonly string[];
  /** Forwarded to the outermost wrapper. */
  ['data-test-subj']?: string;
}

export const MitreAttackChainV3: React.FC<MitreAttackChainV3Props> = ({
  triggeredTactics,
  showLabels = false,
  anomalyCountByTactic,
  selectedTactic,
  onSelectTactic,
  tactics = MITRE_TACTIC_NAMES,
  'data-test-subj': dataTestSubj,
}) => {
  const triggeredSet = useMemo(() => new Set(triggeredTactics), [triggeredTactics]);

  // Forwarded to every MitreTacticDotV3 so each dot can detect whether
  // its default LEFT-aligned hover chip would overflow this container's
  // RIGHT edge — when it would, the dot flips its chip to RIGHT alignment
  // so it stays fully visible. See `MitreTacticDotV3.useLayoutEffect`.
  const containerRef = useRef<HTMLDivElement | null>(null);

  // First tactic in kill-chain order with a non-zero anomaly count — its
  // hover chip is shown persistently (without hover) as a "by default"
  // affordance per the v.3 design. Falls back to `null` when no tactic
  // has anomalies (right panel during empty states / time-range filter
  // that excludes everything) so no dot is marked persistent.
  const firstActiveTactic = useMemo<string | null>(() => {
    if (!anomalyCountByTactic) return null;
    for (const t of tactics) {
      if ((anomalyCountByTactic[t] ?? 0) > 0) return t;
    }
    return null;
  }, [tactics, anomalyCountByTactic]);

  // Tracks which dot (if any) is currently hovered so we can suppress
  // the persistent chip while the user is pointing at a different
  // tactic, then restore it when the cursor leaves. The functional
  // setState pattern in `handleHoverChange` makes the leave-then-enter
  // sequence safe — if a dot leaves and a different dot enters in the
  // same event batch, the final state is the newly-entered dot, with
  // no transient null in between.
  const [hoveredTactic, setHoveredTactic] = useState<string | null>(null);
  const handleHoverChange = useCallback((tactic: string, isHovered: boolean) => {
    setHoveredTactic((prev) => {
      if (isHovered) return tactic;
      // Only clear when the leave event matches the currently-tracked
      // tactic — protects against stale leave events arriving after a
      // newer enter has already updated state.
      return prev === tactic ? null : prev;
    });
  }, []);

  return (
    <div
      ref={containerRef}
      data-test-subj={dataTestSubj}
      css={css`
        width: 100%;
        min-width: 0;
        /* Outer halo of the leftmost dot extends 4px to the left of the cell. */
        padding-left: 4px;
        padding-right: 4px;
      `}
    >
      <EuiFlexGroup
        gutterSize="none"
        responsive={false}
        wrap={false}
        alignItems="flexStart"
      >
        {tactics.map((tactic, index) => {
          const isDetected = triggeredSet.has(tactic);
          const isClickable = !!onSelectTactic && isDetected;
          return (
            <EuiFlexItem
              key={tactic}
              grow
              css={css`
                min-width: 0;
              `}
            >
              <MitreTacticDotV3
                tactic={tactic}
                detected={isDetected}
                showLabel={showLabels}
                isLast={index === tactics.length - 1}
                anomalyCount={anomalyCountByTactic?.[tactic]}
                isSelected={selectedTactic === tactic}
                isClickable={isClickable}
                onClick={isClickable ? () => onSelectTactic?.(tactic) : undefined}
                testSubjId={tactic.replace(/\s+/g, '-').toLowerCase()}
                containerRef={containerRef}
                isPersistentDefault={tactic === firstActiveTactic}
                isAnotherDotHovered={hoveredTactic !== null && hoveredTactic !== tactic}
                onHoverChange={handleHoverChange}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </div>
  );
};
