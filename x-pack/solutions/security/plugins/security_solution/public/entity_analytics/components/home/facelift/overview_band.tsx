/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';

import type { ActiveFilter, CriticalityTier, FaceliftRiskLevel, SignalCardId } from './data';
import { CRITICALITY_TIER_LABELS, SIGNAL_CARDS } from './data';
import { RiskMatrixPanel } from './risk_matrix_panel';
import { NON_FILTERABLE_CARD_IDS, SignalCards } from './signal_cards';

export interface OverviewBandProps {
  activeFilter: ActiveFilter | null;
  onFilterChange: (next: ActiveFilter | null) => void;
}

/**
 * Overview band: Entity risk levels matrix (~40%) + Where to start cards (~60%).
 * One active filter at a time; toggle-off by clicking the active source again.
 */
export const OverviewBand: React.FC<OverviewBandProps> = ({ activeFilter, onFilterChange }) => {
  const onSelectCell = useCallback(
    (riskLevel: FaceliftRiskLevel, tier: CriticalityTier) => {
      const isSame =
        activeFilter?.type === 'matrix' &&
        activeFilter.riskLevel === riskLevel &&
        activeFilter.tier === tier;

      onFilterChange(
        isSame
          ? null
          : {
              type: 'matrix',
              riskLevel,
              tier,
              label: `${riskLevel} · ${CRITICALITY_TIER_LABELS[tier]}`,
            }
      );
    },
    [activeFilter, onFilterChange]
  );

  const onSelectCard = useCallback(
    (cardId: SignalCardId) => {
      if (NON_FILTERABLE_CARD_IDS.has(cardId)) {
        return;
      }

      const card = SIGNAL_CARDS.find((entry) => entry.id === cardId);
      if (!card) {
        return;
      }

      const isSame = activeFilter?.type === 'card' && activeFilter.cardId === cardId;
      onFilterChange(isSame ? null : { type: 'card', cardId, label: card.filterLabel });
    },
    [activeFilter, onFilterChange]
  );

  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems="stretch"
      responsive={true}
      data-test-subj="eaFaceliftOverviewBand"
    >
      <EuiFlexItem
        grow={2}
        css={css`
          min-width: 0;
        `}
      >
        <RiskMatrixPanel activeFilter={activeFilter} onSelectCell={onSelectCell} />
      </EuiFlexItem>
      <EuiFlexItem
        grow={3}
        css={css`
          min-width: 0;
        `}
      >
        <SignalCards activeFilter={activeFilter} onSelectCard={onSelectCard} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
