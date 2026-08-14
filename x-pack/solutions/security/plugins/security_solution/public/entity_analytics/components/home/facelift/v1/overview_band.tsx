/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';

import type {
  ActiveFilter,
  CriticalityTier,
  FaceliftIdentity,
  FaceliftRiskLevel,
  PageFilters,
  SignalCardId,
} from './data';
import { CRITICALITY_TIER_LABELS, getSignalCards } from './data';
import { NeedsAttentionPanel } from './needs_attention_panel';
import { RiskMatrixPanel } from './risk_matrix_panel';
import { SignalCards } from './signal_cards';

export interface OverviewBandProps {
  activeFilter: ActiveFilter | null;
  /** Facet selections from the filter group; every number in the band respects them. */
  pageFilters: PageFilters;
  onFilterChange: (next: ActiveFilter | null) => void;
}

/**
 * Overview band between the page header and the entities table:
 * row 1 — six signal metric cards; row 2 — Needs attention + Entity risk levels, split 50/50.
 * One active filter at a time across all three sources; clicking the active
 * source again clears it.
 */
export const OverviewBand: React.FC<OverviewBandProps> = ({
  activeFilter,
  pageFilters,
  onFilterChange,
}) => {
  const cards = useMemo(() => getSignalCards(pageFilters), [pageFilters]);

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
      const card = cards.find((entry) => entry.id === cardId);
      if (!card) {
        return;
      }

      const isSame = activeFilter?.type === 'card' && activeFilter.cardId === cardId;
      onFilterChange(isSame ? null : { type: 'card', cardId, label: card.filterLabel });
    },
    [activeFilter, cards, onFilterChange]
  );

  const onSelectIdentity = useCallback(
    (identity: FaceliftIdentity) => {
      const isSame = activeFilter?.type === 'identity' && activeFilter.identityId === identity.id;
      onFilterChange(
        isSame ? null : { type: 'identity', identityId: identity.id, label: identity.name }
      );
    },
    [activeFilter, onFilterChange]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="eaFaceliftOverviewBand">
      <EuiFlexItem grow={false}>
        <SignalCards activeFilter={activeFilter} cards={cards} onSelectCard={onSelectCard} />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {/* Grid rather than flex so both panels are exactly half the row, whatever they contain. */}
        <EuiFlexGrid
          columns={2}
          gutterSize="m"
          css={css`
            > * {
              min-width: 0;
            }
          `}
        >
          <NeedsAttentionPanel
            activeFilter={activeFilter}
            pageFilters={pageFilters}
            onSelectIdentity={onSelectIdentity}
          />
          <RiskMatrixPanel
            activeFilter={activeFilter}
            pageFilters={pageFilters}
            onSelectCell={onSelectCell}
          />
        </EuiFlexGrid>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
