/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Page-level filter bar shown under the Entity analytics title. Opens with
 * Resolved entities | Raw records as paired `EuiFilterButton`s (`withNext`),
 * then the shared `MultiselectFilter` dropdowns. The group is `fullWidth` so
 * it spans the page content.
 */

import React, { useCallback } from 'react';
import {
  EuiBadge,
  EuiFilterButton,
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
  resolvedEntities: i18n.translate(
    'xpack.securitySolution.entityAnalytics.homePage.filters.resolvedEntities',
    { defaultMessage: 'Resolved entities' }
  ),
  rawRecords: i18n.translate('xpack.securitySolution.entityAnalytics.homePage.filters.rawRecords', {
    defaultMessage: 'Raw records',
  }),
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
  /** Kept for FaceliftHome / page wiring compatibility; v.3 uses pageFilters.watchlists. */
  selectedWatchlistId?: string;
  onWatchlistChange?: (id?: string, name?: string) => void;
  tableView: TableView;
  onTableViewChange: (view: TableView) => void;
}

export const EntityFiltersGroup: React.FC<EntityFiltersGroupProps> = ({
  pageFilters,
  onPageFiltersChange,
  tableView,
  onTableViewChange,
}) => {
  const onSelectResolved = useCallback(
    () => onTableViewChange('resolved'),
    [onTableViewChange]
  );
  const onSelectRaw = useCallback(() => onTableViewChange('raw'), [onTableViewChange]);

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

  const isResolved = tableView === 'resolved';
  const isRaw = tableView === 'raw';

  return (
    <EuiFilterGroup compressed fullWidth data-test-subj="eaFaceliftEntityFilters">
      <EuiFilterButton
        withNext
        isToggle
        grow={false}
        iconType="aggregate"
        iconSide="left"
        isSelected={isResolved}
        hasActiveFilters={isResolved}
        onClick={onSelectResolved}
        data-test-subj="eaFaceliftEntitiesViewResolved"
      >
        {TITLES.resolvedEntities}
      </EuiFilterButton>
      <EuiFilterButton
        isToggle
        grow={false}
        iconType="listBullet"
        iconSide="left"
        isSelected={isRaw}
        hasActiveFilters={isRaw}
        onClick={onSelectRaw}
        data-test-subj="eaFaceliftEntitiesViewRaw"
      >
        {TITLES.rawRecords}
      </EuiFilterButton>
      <MultiselectFilter<EntityType>
        data-test-subj="eaFaceliftEntityTypeFilter"
        title={TITLES.entityType}
        items={ENTITY_TYPES}
        selectedItems={pageFilters.entityTypes}
        onSelectionChange={onSelectEntityTypes}
        renderItem={renderEntityType}
        renderLabel={capitalize}
        width={160}
        grow
      />
      <MultiselectFilter<FaceliftWatchlist>
        data-test-subj="eaFaceliftWatchlistFilter"
        title={TITLES.watchlist}
        items={[...FACELIFT_WATCHLISTS]}
        selectedItems={pageFilters.watchlists}
        onSelectionChange={onSelectWatchlists}
        width={220}
        grow
      />
      <MultiselectFilter<string>
        data-test-subj="eaFaceliftEntitySourceFilter"
        title={TITLES.entitySource}
        items={ENTITY_SOURCE_LABELS}
        selectedItems={pageFilters.sources}
        onSelectionChange={onSelectSources}
        width={180}
        grow
      />
      <MultiselectFilter<FaceliftRiskLevel>
        data-test-subj="eaFaceliftRiskLevelFilter"
        title={TITLES.riskLevel}
        items={RISK_LEVELS}
        selectedItems={pageFilters.riskLevels}
        onSelectionChange={onSelectRiskLevels}
        renderItem={renderRiskLevel}
        width={150}
        grow
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
        grow
      />
    </EuiFilterGroup>
  );
};
