/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Prototype "v.2" MITRE ATT&CK chain. Same visual pattern as Attack discovery's
 * `AttackChain` (dot + halo + connector line, danger color when detected) but
 * the per-tactic column is flex-sized so all 15 tactics always fit the parent
 * container — no horizontal scroll.
 *
 * Two layout modes:
 *  - `showLabels={false}` (default) — compact dots-only row used in the
 *    right-panel v.2 overview where the container is narrow.
 *  - `showLabels` — labeled variant used in the BA-v.2 left tab "Attack chain"
 *    section. Labels are truncated to their column width with an ellipsis and
 *    show the full tactic name in a tooltip on hover.
 *
 * Cleanup: deleted with the rest of the `mitre/` folder.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';

import { MITRE_TACTIC_NAMES } from '../tactics';
import { MitreTacticDot } from './mitre_tactic_dot';

interface MitreAttackChainProps {
  /** Subset of `MITRE_TACTIC_NAMES` that should be drawn as "triggered". */
  triggeredTactics: readonly string[];
  /** When true, renders the tactic name under each dot (truncated + tooltip). */
  showLabels?: boolean;
  /**
   * Optional per-tactic anomaly counts. When provided, each dot is wrapped in
   * a chart-style tooltip showing "<tactic> — <N> anomalies" on hover. Pass
   * `undefined` to disable hover tooltips on the dots.
   */
  anomalyCountByTactic?: Readonly<Record<string, number>>;
  /**
   * Currently selected tactic (drives the per-dot selected-state styling).
   * Pass `null` / `undefined` when no filter is active.
   */
  selectedTactic?: string | null;
  /**
   * Called when a triggered dot is clicked / keyboard-activated. Non-triggered
   * dots stay non-interactive per the design (gray dots can't be filtered on).
   * When omitted, all dots are non-interactive — used in surfaces that just
   * want to display the chain (e.g. the right-panel overview).
   */
  onSelectTactic?: (tactic: string) => void;
  /** Optional override for the canonical 15-tactic list (rare — testing only). */
  tactics?: readonly string[];
  /** Forwarded to the outermost wrapper. */
  ['data-test-subj']?: string;
}

export const MitreAttackChain: React.FC<MitreAttackChainProps> = ({
  triggeredTactics,
  showLabels = false,
  anomalyCountByTactic,
  selectedTactic,
  onSelectTactic,
  tactics = MITRE_TACTIC_NAMES,
  'data-test-subj': dataTestSubj,
}) => {
  const triggeredSet = useMemo(() => new Set(triggeredTactics), [triggeredTactics]);

  return (
    <div
      data-test-subj={dataTestSubj}
      css={css`
        width: 100%;
        min-width: 0;
        /* Outer halo of the leftmost dot extends 4px to the left of the cell. */
        padding-left: 4px;
        padding-right: 4px;
        /* Per-cell chip rows in MitreTacticDot reserve the space they need
           above each dot, so the chain itself no longer needs a top pad. */
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
          // Per design: gray (non-triggered) dots are never clickable, so we
          // only wire the handler when both `onSelectTactic` is provided AND
          // the dot is detected.
          const isClickable = !!onSelectTactic && isDetected;
          return (
            <EuiFlexItem
              key={tactic}
              grow
              css={css`
                min-width: 0;
              `}
            >
              <MitreTacticDot
                tactic={tactic}
                detected={isDetected}
                showLabel={showLabels}
                isLast={index === tactics.length - 1}
                anomalyCount={anomalyCountByTactic?.[tactic]}
                isSelected={selectedTactic === tactic}
                isClickable={isClickable}
                onClick={isClickable ? () => onSelectTactic?.(tactic) : undefined}
                testSubjId={tactic.replace(/\s+/g, '-').toLowerCase()}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </div>
  );
};
