/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { createDataProviders } from '../../../../../app/actions/add_to_timeline/data_provider';
import { useInvestigateInTimeline } from '../../../../../common/hooks/timeline/use_investigate_in_timeline';
import { EntityTypeToIdentifierField } from '../../../../../../common/entity_analytics/types';
import { ENTITY_ANALYTICS_TABLE_ID } from '../../constants';
import type { ActiveFilter, PageFilters, SignalCardId } from './data';
import { filterIdentities, getEntitiesNeedingAttentionCount, getSignalCards } from './data';
import { useActiveMetricsVersion } from './active_metrics_version';
import { useActiveTimeRange } from './active_time_range';
import { MetricChartsPanel } from './metric_charts_panel';

/** Overview metrics/charts always count resolved entities; Rows affects the table only. */
const OVERVIEW_TABLE_VIEW = 'resolved' as const;

const needsYourAttentionTitle = (count: number) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.facelift.overview.needsYourAttention', {
    defaultMessage:
      '{count, plural, one {# entity needs your attention} other {# entities need your attention}}',
    values: { count },
  });

export interface OverviewBandProps {
  activeFilter: ActiveFilter | null;
  /** Facet selections from the filter group; every number in the band respects them. */
  pageFilters: PageFilters;
  onFilterChange: (next: ActiveFilter | null) => void;
}

/**
 * Overview band between the page header and the entities table:
 * heading + Needs-attention metric cards in one equal-width row.
 */
export const OverviewBand: React.FC<OverviewBandProps> = ({
  activeFilter,
  pageFilters,
  onFilterChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const [metricsVersion] = useActiveMetricsVersion();
  const [timeRange] = useActiveTimeRange();
  const showAttentionHeader = metricsVersion === 'v2' || metricsVersion === 'v3';
  const attentionHeaderIsH4 = metricsVersion === 'v3';
  const cards = useMemo(
    () => getSignalCards(pageFilters, OVERVIEW_TABLE_VIEW, timeRange),
    [pageFilters, timeRange]
  );
  const entitiesNeedingAttention = useMemo(
    () => getEntitiesNeedingAttentionCount(pageFilters, OVERVIEW_TABLE_VIEW, timeRange),
    [pageFilters, timeRange]
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
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      data-test-subj="eaFaceliftOverviewBand"
      css={
        showAttentionHeader
          ? css`
              gap: 12px;
            `
          : undefined
      }
    >
      {showAttentionHeader && (
        <EuiFlexItem grow={false}>
          <EuiTitle size={attentionHeaderIsH4 ? 'xs' : 's'}>
            {attentionHeaderIsH4 ? (
              <h4
                data-test-subj="eaFaceliftNeedsAttentionTitle"
                css={css`
                  padding-left: ${euiTheme.size.xs};
                `}
              >
                {needsYourAttentionTitle(entitiesNeedingAttention)}
              </h4>
            ) : (
              <h3
                data-test-subj="eaFaceliftNeedsAttentionTitle"
                css={css`
                  padding-left: ${euiTheme.size.xs};
                `}
              >
                {needsYourAttentionTitle(entitiesNeedingAttention)}
              </h3>
            )}
          </EuiTitle>
        </EuiFlexItem>
      )}
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
