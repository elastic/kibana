/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMitreConfiguration } from '../../../../../common/hooks/mitre/use_mitre_configuration';
import { MitreTacticDot } from './mitre_tactic_dot';

interface MitreAttackChainProps {
  anomalyCountByTactic?: Readonly<Record<string, number>>;
  onSelectTactic?: (tactic: string) => void;
  selectedTactic?: string | null;
  showLabels?: boolean;
  triggeredTactics: readonly string[];
  showPersistentFirstTacticBadge?: boolean;
  alignLastDotToEnd?: boolean;
}

export const MitreAttackChain: React.FC<MitreAttackChainProps> = ({
  anomalyCountByTactic,
  onSelectTactic,
  selectedTactic,
  showLabels = false,
  triggeredTactics,
  showPersistentFirstTacticBadge = false,
  alignLastDotToEnd = false,
}) => {
  const {
    tactics,
    isLoading: isMitreLoading,
    isError: isMitreError,
  } = useMitreConfiguration({ types: ['tactic'] });
  const tacticNames = useMemo(
    () => [...tactics].sort((a, b) => a.position - b.position).map(({ name }) => name),
    [tactics]
  );

  const triggeredSet = useMemo(() => new Set(triggeredTactics), [triggeredTactics]);

  // Forwarded to every MitreTacticDot component so each dot can detect whether
  // its default left-aligned hover chip would overflow this container's
  // right edge; when it would, the dot flips its chip to right alignment
  // so it stays fully visible.
  const containerRef = useRef<HTMLDivElement | null>(null);

  // First tactic in attack-chain order with a non-zero anomaly count — its
  // hover chip is shown persistently (without hover) by default, but only
  // when no tactic is selected (the selected tactic's chip is already visible).
  // Falls back to `null` when no tactic has anomalies.
  const firstActiveTactic = useMemo<string | null>(() => {
    if (showPersistentFirstTacticBadge && anomalyCountByTactic && tacticNames.length > 0) {
      return tacticNames[0];
    }
    if (!anomalyCountByTactic) return null;
    for (const t of tacticNames) {
      if ((anomalyCountByTactic[t] ?? 0) > 0) return t;
    }
    return null;
  }, [anomalyCountByTactic, showPersistentFirstTacticBadge, tacticNames]);

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

  // Tactic names used to be available synchronously; now they're async. Render nothing while
  // MITRE data is loading or has errored — a failed fetch must not render a chain with zero
  // dots, which would be indistinguishable from an empty state.
  if (isMitreLoading || isMitreError) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      css={css`
        width: 100%;
        min-width: 0;
        padding-left: 4px;
        padding-right: 4px;
      `}
    >
      <EuiFlexGroup gutterSize="none" responsive={false} wrap={false} alignItems="flexStart">
        {tacticNames.map((tactic, index) => {
          const isDetected = triggeredSet.has(tactic);
          const isClickable = !!onSelectTactic && isDetected;
          const isLastTactic = index === tacticNames.length - 1;
          const alignDotToEnd = alignLastDotToEnd && isLastTactic;
          return (
            <EuiFlexItem
              key={tactic}
              grow={!alignDotToEnd}
              css={css`
                min-width: 0;
                ${alignDotToEnd
                  ? `
                  flex: 0 0 8px;
                  min-width: 8px;
                `
                  : ''}
              `}
            >
              <MitreTacticDot
                tactic={tactic}
                detected={isDetected}
                showLabel={showLabels}
                isLast={isLastTactic}
                alignDotToEnd={alignDotToEnd}
                anomalyCount={anomalyCountByTactic?.[tactic]}
                isSelected={selectedTactic === tactic}
                isClickable={isClickable}
                onClick={isClickable ? () => onSelectTactic?.(tactic) : undefined}
                containerRef={containerRef}
                isPersistentDefault={tactic === firstActiveTactic && !selectedTactic}
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
