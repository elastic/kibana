/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { createDataProviders } from '../../../../../app/actions/add_to_timeline/data_provider';
import { useInvestigateInTimeline } from '../../../../../common/hooks/timeline/use_investigate_in_timeline';
import { EntityTypeToIdentifierField } from '../../../../../../common/entity_analytics/types';
import { ENTITY_ANALYTICS_TABLE_ID } from '../../constants';
import type { ActiveFilter, PageFilters, SignalCardId } from './data';
import { filterIdentities, getSignalCards } from './data';
import { MetricChartsPanel } from './metric_charts_panel';

/** Overview metrics/charts always count resolved entities; View by affects the table only. */
const OVERVIEW_TABLE_VIEW = 'resolved' as const;

export interface OverviewBandProps {
  activeFilter: ActiveFilter | null;
  /** Facet selections from the filter group; every number in the band respects them. */
  pageFilters: PageFilters;
  onFilterChange: (next: ActiveFilter | null) => void;
}

/**
 * Overview band between the page header and the entities table:
 * 60/40 metrics grid + Entities-by pie panel.
 */
export const OverviewBand: React.FC<OverviewBandProps> = ({
  activeFilter,
  pageFilters,
  onFilterChange,
}) => {
  const cards = useMemo(
    () => getSignalCards(pageFilters, OVERVIEW_TABLE_VIEW),
    [pageFilters]
  );
  const { investigateInTimeline } = useInvestigateInTimeline();

  const onFilterForCard = useCallback(
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

  const onFilterOutCard = useCallback(
    (cardId: SignalCardId) => {
      const card = cards.find((entry) => entry.id === cardId);
      if (!card) {
        return;
      }

      const isSame =
        activeFilter?.type === 'card' &&
        activeFilter.cardId === cardId &&
        Boolean(activeFilter.exclude);
      onFilterChange(
        isSame ? null : { type: 'card', cardId, label: card.filterLabel, exclude: true }
      );
    },
    [activeFilter, cards, onFilterChange]
  );

  const onAddCardToTimeline = useCallback(
    (cardId: SignalCardId) => {
      const identities = filterIdentities({ type: 'card', cardId, label: '' });
      const dataProviders = identities.flatMap(
        (identity) =>
          createDataProviders({
            contextId: ENTITY_ANALYTICS_TABLE_ID,
            field: EntityTypeToIdentifierField[identity.entityType] || 'entity.id',
            values: identity.name,
          }) ?? []
      );
      if (dataProviders.length) {
        investigateInTimeline({ dataProviders });
      }
    },
    [investigateInTimeline]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="eaFaceliftOverviewBand">
      <EuiFlexItem grow={false}>
        <MetricChartsPanel
          activeFilter={activeFilter}
          cards={cards}
          pageFilters={pageFilters}
          tableView={OVERVIEW_TABLE_VIEW}
          onFilterForCard={onFilterForCard}
          onFilterOutCard={onFilterOutCard}
          onAddCardToTimeline={onAddCardToTimeline}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
