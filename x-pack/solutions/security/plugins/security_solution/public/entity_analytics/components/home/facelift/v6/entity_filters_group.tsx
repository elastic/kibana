/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Page-level filter bar shown under the Entity analytics title. Order:
 * Entity type, Risk level, Asset criticality, Data source, Watchlist.
 * Each filter is its own compressed `EuiFilterGroup` (standalone rounded
 * control); the row spans the page with equal-width shares and 8px gaps.
 */

import React, { useCallback, useMemo } from 'react';
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
import { CriticalityLevels } from '../../../../../../common/constants';
import type { CriticalityLevelWithUnassigned } from '../../../../../../common/entity_analytics/asset_criticality/types';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import type { EntityRiskLevels } from '../../../../../../common/api/entity_analytics/common';
import { MultiselectFilter } from '../../../../../common/components/multiselect_filter';
import { AssetCriticalityBadge } from '../../../asset_criticality';
import { CRITICALITY_LEVEL_TITLE } from '../../../asset_criticality/translations';
import { EntityIconByType } from '../../../entity_store/entity_icon_by_type';
import { getRiskScoreColors } from '../../entities_table/risk_score_cell';
import type { FaceliftRiskLevel, FaceliftWatchlist, PageFilters, TableView } from './data';
import { ENTITY_SOURCE_LABELS, FACELIFT_WATCHLISTS, RISK_LEVELS } from './data';
import { facetCount, getFilterFacetCounts } from './filter_facet_counts';

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

const TITLES = {
  entityType: i18n.translate('xpack.securitySolution.entityAnalytics.homePage.filters.entityType', {
    defaultMessage: 'Entity type',
  }),
  watchlist: i18n.translate('xpack.securitySolution.entityAnalytics.homePage.filters.watchlist', {
    defaultMessage: 'Watchlist',
  }),
  entitySource: i18n.translate(
    'xpack.securitySolution.entityAnalytics.homePage.filters.entitySource',
    { defaultMessage: 'Data source' }
  ),
  riskLevel: i18n.translate('xpack.securitySolution.entityAnalytics.homePage.filters.riskLevel', {
    defaultMessage: 'Risk level',
  }),
  assetCriticality: i18n.translate(
    'xpack.securitySolution.entityAnalytics.homePage.filters.assetCriticality',
    { defaultMessage: 'Asset criticality' }
  ),
};

const OptionWithCount: React.FC<{ count: number; children: React.ReactNode }> = ({
  count,
  children,
}) => (
  <EuiFlexGroup
    gutterSize="s"
    alignItems="center"
    justifyContent="spaceBetween"
    responsive={false}
    css={css`
      inline-size: 100%;
    `}
  >
    {/* grow=false so badges / labels stay content-sized (e.g. risk level chips). */}
    <EuiFlexItem grow={false}>{children}</EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s" color="subdued">
        {count}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

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
  /** Kept for FaceliftHome / page wiring compatibility; v.5 uses pageFilters.watchlists. */
  selectedWatchlistId?: string;
  onWatchlistChange?: (id?: string, name?: string) => void;
  /** Drives facet counts for the current Resolved / Raw table corpus. */
  tableView: TableView;
}

export const EntityFiltersGroup: React.FC<EntityFiltersGroupProps> = ({
  pageFilters,
  onPageFiltersChange,
  tableView,
}) => {
  const counts = useMemo(() => getFilterFacetCounts(tableView), [tableView]);

  const onSelectEntityTypes = useCallback(
    (entityTypes: EntityType[]) => onPageFiltersChange({ ...pageFilters, entityTypes }),
    [pageFilters, onPageFiltersChange]
  );

  const onSelectWatchlists = useCallback(
    (watchlists: FaceliftWatchlist[]) => onPageFiltersChange({ ...pageFilters, watchlists }),
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

  const renderEntityType = useCallback(
    (entityType: EntityType) => (
      <OptionWithCount count={facetCount(counts, 'entityTypes', entityType)}>
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
      </OptionWithCount>
    ),
    [counts]
  );

  const renderWatchlist = useCallback(
    (watchlist: FaceliftWatchlist) => (
      <OptionWithCount count={facetCount(counts, 'watchlists', watchlist)}>
        <EuiText size="s">{watchlist}</EuiText>
      </OptionWithCount>
    ),
    [counts]
  );

  const renderSource = useCallback(
    (source: string) => (
      <OptionWithCount count={facetCount(counts, 'sources', source)}>
        <EuiText size="s">{source}</EuiText>
      </OptionWithCount>
    ),
    [counts]
  );

  const renderRiskLevel = useCallback(
    (level: FaceliftRiskLevel) => (
      <OptionWithCount count={facetCount(counts, 'riskLevels', level)}>
        <RiskLevelFilterBadge level={level} />
      </OptionWithCount>
    ),
    [counts]
  );

  const renderCriticality = useCallback(
    (level: CriticalityLevelWithUnassigned) => (
      <OptionWithCount count={facetCount(counts, 'criticalities', level)}>
        <AssetCriticalityBadge criticalityLevel={level} css={{ lineHeight: 'inherit' }} />
      </OptionWithCount>
    ),
    [counts]
  );

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      data-test-subj="eaFaceliftEntityFilters"
    >
      <EuiFlexItem>
        <EuiFilterGroup compressed fullWidth>
          <MultiselectFilter<EntityType>
            data-test-subj="eaFaceliftEntityTypeFilter"
            title={TITLES.entityType}
            items={ENTITY_TYPES}
            selectedItems={pageFilters.entityTypes}
            onSelectionChange={onSelectEntityTypes}
            renderItem={renderEntityType}
            renderLabel={capitalize}
            width={200}
            grow
          />
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFilterGroup compressed fullWidth>
          <MultiselectFilter<FaceliftRiskLevel>
            data-test-subj="eaFaceliftRiskLevelFilter"
            title={TITLES.riskLevel}
            items={RISK_LEVELS}
            selectedItems={pageFilters.riskLevels}
            onSelectionChange={onSelectRiskLevels}
            renderItem={renderRiskLevel}
            width={180}
            grow
          />
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFilterGroup compressed fullWidth>
          <MultiselectFilter<CriticalityLevelWithUnassigned>
            data-test-subj="eaFaceliftAssetCriticalityFilter"
            title={TITLES.assetCriticality}
            items={CRITICALITY_LEVELS}
            selectedItems={pageFilters.criticalities}
            onSelectionChange={onSelectCriticalities}
            renderItem={renderCriticality}
            renderLabel={(level) => CRITICALITY_LEVEL_TITLE[level]}
            width={230}
            grow
          />
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFilterGroup compressed fullWidth>
          <MultiselectFilter<string>
            data-test-subj="eaFaceliftEntitySourceFilter"
            title={TITLES.entitySource}
            items={ENTITY_SOURCE_LABELS}
            selectedItems={pageFilters.sources}
            onSelectionChange={onSelectSources}
            renderItem={renderSource}
            width={220}
            grow
          />
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFilterGroup compressed fullWidth>
          <MultiselectFilter<FaceliftWatchlist>
            data-test-subj="eaFaceliftWatchlistFilter"
            title={TITLES.watchlist}
            items={[...FACELIFT_WATCHLISTS]}
            selectedItems={pageFilters.watchlists}
            onSelectionChange={onSelectWatchlists}
            renderItem={renderWatchlist}
            width={260}
            grow
          />
        </EuiFilterGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
