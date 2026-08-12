/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Page-level filter bar shown under the Entity analytics title. Each dropdown
 * is the shared `MultiselectFilter`, so they all get the same option counter
 * (`numFilters`) and active-selection badge, and they render the product's own
 * value components: risk-score badges for risk level, health badges for asset
 * criticality.
 */

import React, { useCallback, useMemo } from 'react';
import type { FilterChecked } from '@elastic/eui';
import {
  EuiBadge,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { capitalize } from 'lodash';
import { CriticalityLevels } from '../../../../../common/constants';
import type { CriticalityLevelWithUnassigned } from '../../../../../common/entity_analytics/asset_criticality/types';
import { EntityType } from '../../../../../common/entity_analytics/types';
import type { EntityRiskLevels } from '../../../../../common/api/entity_analytics/common';
import { MultiselectFilter } from '../../../../common/components/multiselect_filter';
import { useGetWatchlists } from '../../../api/hooks/use_get_watchlists';
import { AssetCriticalityBadge } from '../../asset_criticality';
import { CRITICALITY_LEVEL_TITLE } from '../../asset_criticality/translations';
import { EntityIconByType } from '../../entity_store/entity_icon_by_type';
import { getRiskScoreColors } from '../entities_table/risk_score_cell';
import type { FaceliftRiskLevel, PageFilters } from './data';
import { ENTITY_SOURCE_LABELS, RISK_LEVELS } from './data';

const ENTITY_TYPES = [EntityType.user, EntityType.host, EntityType.service];

const CRITICALITY_LEVELS: CriticalityLevelWithUnassigned[] = [
  CriticalityLevels.EXTREME_IMPACT,
  CriticalityLevels.HIGH_IMPACT,
  CriticalityLevels.MEDIUM_IMPACT,
  CriticalityLevels.LOW_IMPACT,
  'unassigned',
];

/**
 * Risk-score badge colours speak EntityRiskLevels ("Moderate"); the Overview
 * band and this filter speak FaceliftRiskLevel ("Medium"). Same bands.
 */
const RISK_SCORE_LEVEL_BY_FACELIFT: Record<FaceliftRiskLevel, EntityRiskLevels> = {
  Unknown: 'Unknown',
  Low: 'Low',
  Medium: 'Moderate',
  High: 'High',
  Critical: 'Critical',
};

/** Display-only rename for the prebuilt watchlist in this filter. */
const WATCHLIST_DISPLAY_NAME: Record<string, string> = {
  'Privileged Users': 'Privileged users',
};

const TITLES = {
  entityType: i18n.translate('xpack.securitySolution.entityAnalytics.homePage.filters.entityType', {
    defaultMessage: 'Entity type',
  }),
  watchlist: i18n.translate('xpack.securitySolution.entityAnalytics.homePage.filters.watchlist', {
    defaultMessage: 'Watchlist',
  }),
  entitySource: i18n.translate(
    'xpack.securitySolution.entityAnalytics.homePage.filters.entitySource',
    { defaultMessage: 'Entity source' }
  ),
  riskLevel: i18n.translate('xpack.securitySolution.entityAnalytics.homePage.filters.riskLevel', {
    defaultMessage: 'Risk level',
  }),
  assetCriticality: i18n.translate(
    'xpack.securitySolution.entityAnalytics.homePage.filters.assetCriticality',
    { defaultMessage: 'Asset criticality' }
  ),
};

interface WatchlistItem {
  id: string;
  name: string;
}

const RiskLevelFilterBadge: React.FC<{ level: FaceliftRiskLevel }> = ({ level }) => {
  const { euiTheme } = useEuiTheme();
  const colors = getRiskScoreColors(euiTheme, RISK_SCORE_LEVEL_BY_FACELIFT[level]);

  return (
    <EuiBadge color={colors.background}>
      <EuiText
        size="xs"
        color={colors.text}
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
          line-height: inherit;
        `}
      >
        {level}
      </EuiText>
    </EuiBadge>
  );
};

export interface EntityFiltersGroupProps {
  pageFilters: PageFilters;
  onPageFiltersChange: (next: PageFilters) => void;
  /** Watchlist deep-linked from the URL (`watchlistId`), if any. */
  selectedWatchlistId?: string;
  onWatchlistChange: (id?: string, name?: string) => void;
}

export const EntityFiltersGroup: React.FC<EntityFiltersGroupProps> = ({
  pageFilters,
  onPageFiltersChange,
  selectedWatchlistId,
  onWatchlistChange,
}) => {
  const { data: watchlists } = useGetWatchlists();

  const onSelectEntityTypes = useCallback(
    (entityTypes: EntityType[]) => onPageFiltersChange({ ...pageFilters, entityTypes }),
    [pageFilters, onPageFiltersChange]
  );

  const onSelectSources = useCallback(
    (sources: string[]) => onPageFiltersChange({ ...pageFilters, sources }),
    [pageFilters, onPageFiltersChange]
  );

  const onSelectRiskLevels = useCallback(
    (riskLevels: FaceliftRiskLevel[]) => onPageFiltersChange({ ...pageFilters, riskLevels }),
    [pageFilters, onPageFiltersChange]
  );

  const onSelectCriticalities = useCallback(
    (criticalities: CriticalityLevelWithUnassigned[]) =>
      onPageFiltersChange({ ...pageFilters, criticalities }),
    [pageFilters, onPageFiltersChange]
  );

  const watchlistItems = useMemo<WatchlistItem[]>(
    () =>
      (watchlists ?? []).map((watchlist) => {
        const name = watchlist.name;
        return {
          id: watchlist.id ?? name,
          name: WATCHLIST_DISPLAY_NAME[name] ?? name,
        };
      }),
    [watchlists]
  );

  const selectedWatchlists = useMemo(
    () => watchlistItems.filter((item) => item.id === selectedWatchlistId),
    [watchlistItems, selectedWatchlistId]
  );

  // A watchlist is a scope rather than a facet, so only one can be active. The
  // multiselect popover is kept for a consistent look; picking an option
  // replaces the previous one instead of adding to it.
  const onSelectWatchlist = useCallback(
    (_selected: WatchlistItem[], changed: WatchlistItem, status: FilterChecked) => {
      if (status === 'on') {
        onWatchlistChange(changed.id, changed.name);
      } else {
        onWatchlistChange(undefined, undefined);
      }
    },
    [onWatchlistChange]
  );

  const renderEntityType = useCallback(
    (entityType: EntityType) => (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={EntityIconByType[entityType]}
            size="s"
            color="subdued"
            aria-hidden={true}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{capitalize(entityType)}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  const renderRiskLevel = useCallback(
    (level: FaceliftRiskLevel) => <RiskLevelFilterBadge level={level} />,
    []
  );

  const renderCriticality = useCallback(
    (level: CriticalityLevelWithUnassigned) => (
      <AssetCriticalityBadge criticalityLevel={level} css={{ lineHeight: 'inherit' }} />
    ),
    []
  );

  return (
    <EuiFilterGroup data-test-subj="eaFaceliftEntityFilters">
      <MultiselectFilter<EntityType>
        data-test-subj="eaFaceliftEntityTypeFilter"
        title={TITLES.entityType}
        items={ENTITY_TYPES}
        selectedItems={pageFilters.entityTypes}
        onSelectionChange={onSelectEntityTypes}
        renderItem={renderEntityType}
        renderLabel={capitalize}
        width={160}
      />
      <MultiselectFilter<WatchlistItem>
        data-test-subj="eaFaceliftWatchlistFilter"
        title={TITLES.watchlist}
        items={watchlistItems}
        selectedItems={selectedWatchlists}
        onSelectionChange={onSelectWatchlist}
        renderLabel={(watchlist) => watchlist.name}
        width={220}
      />
      <MultiselectFilter<string>
        data-test-subj="eaFaceliftEntitySourceFilter"
        title={TITLES.entitySource}
        items={ENTITY_SOURCE_LABELS}
        selectedItems={pageFilters.sources}
        onSelectionChange={onSelectSources}
        width={180}
      />
      <MultiselectFilter<FaceliftRiskLevel>
        data-test-subj="eaFaceliftRiskLevelFilter"
        title={TITLES.riskLevel}
        items={RISK_LEVELS}
        selectedItems={pageFilters.riskLevels}
        onSelectionChange={onSelectRiskLevels}
        renderItem={renderRiskLevel}
        width={150}
      />
      <MultiselectFilter<CriticalityLevelWithUnassigned>
        data-test-subj="eaFaceliftAssetCriticalityFilter"
        title={TITLES.assetCriticality}
        items={CRITICALITY_LEVELS}
        selectedItems={pageFilters.criticalities}
        onSelectionChange={onSelectCriticalities}
        renderItem={renderCriticality}
        renderLabel={(level) => CRITICALITY_LEVEL_TITLE[level]}
        width={190}
      />
    </EuiFilterGroup>
  );
};
