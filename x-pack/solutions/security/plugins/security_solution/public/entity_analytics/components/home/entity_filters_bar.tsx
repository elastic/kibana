/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef } from 'react';
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
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { MultiselectFilter } from '../../../common/components/multiselect_filter';
import type { RiskSeverity } from '../../../../common/search_strategy';
import { SEVERITY_UI_SORT_ORDER } from '../../common/utils';
import type { EntityRiskLevels } from '../../../../common/api/entity_analytics/common';
import { getRiskScoreColors } from './entities_table/risk_score_cell';
import type { CriticalityLevels } from '../../../../common/entity_analytics/asset_criticality/constants';
import { ValidCriticalityLevels } from '../../../../common/entity_analytics/asset_criticality/constants';
import { AssetCriticalityBadge } from '../asset_criticality';
import type { EntityType } from '../../../../common/entity_analytics/types';
import { getEntityAnalyticsEntityTypes } from '../../../../common/entity_analytics/utils';
import { EntityIconByType } from '../entity_store/entity_icon_by_type';
import {
  EntitySourceValue,
  toEntitySourceArray,
} from '../../../flyout/entity_details/shared/components/entity_source_value';
import { getEntityFilterTerms } from './use_entity_filters_param';
import type { EntityFilters } from './use_entity_filters_param';
import { combineFilters, useEntityFilterBarCounts } from './use_entity_filter_bar_counts';
export { combineFilters, toBucketMap } from './use_entity_filter_bar_counts';
export type { EntityFilterBarCounts } from './use_entity_filter_bar_counts';

const ENTITY_TYPE_OPTIONS = getEntityAnalyticsEntityTypes();
const RISK_LEVEL_OPTIONS = SEVERITY_UI_SORT_ORDER.slice().reverse();

const FILTER_TITLES = {
  entityType: i18n.translate('xpack.securitySolution.entityAnalytics.home.filter.entityType', {
    defaultMessage: 'Entity type',
  }),
  riskLevel: i18n.translate('xpack.securitySolution.entityAnalytics.home.filter.riskLevel', {
    defaultMessage: 'Risk level',
  }),
  assetCriticality: i18n.translate(
    'xpack.securitySolution.entityAnalytics.home.filter.assetCriticality',
    { defaultMessage: 'Asset criticality' }
  ),
  dataSource: i18n.translate('xpack.securitySolution.entityAnalytics.home.filter.dataSource', {
    defaultMessage: 'Data source',
  }),
  watchlist: i18n.translate('xpack.securitySolution.entityAnalytics.home.filter.watchlist', {
    defaultMessage: 'Watchlist',
  }),
};

const FilterEntry = ({ children }: { children: React.ReactNode }) => (
  <EuiFlexItem>
    <EuiFilterGroup compressed>{children}</EuiFilterGroup>
  </EuiFlexItem>
);

const ItemWithCount = ({ count, children }: { count: number; children: React.ReactNode }) => (
  <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m" responsive={false}>
    <EuiFlexItem
      css={css`
        overflow: hidden;
        min-width: 0;
      `}
    >
      <span
        css={css`
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        `}
      >
        {children}
      </span>
    </EuiFlexItem>
    <EuiFlexItem
      grow={false}
      css={css`
        flex-shrink: 0;
      `}
    >
      <EuiText size="s" color="subdued">
        {count}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

interface Props {
  filters: EntityFilters;
  onFiltersChange: (filters: EntityFilters) => void;
  spaceId: string | undefined;
  view: 'resolved' | 'raw';
  esFilter?: QueryDslQueryContainer;
  watchlistNames: Map<string, string>;
}

export const EntityFiltersBar: React.FC<Props> = ({
  filters,
  onFiltersChange,
  spaceId,
  view,
  esFilter,
  watchlistNames,
}) => {
  const { euiTheme } = useEuiTheme();
  const baseFilter = useMemo(
    () => combineFilters([esFilter, ...getEntityFilterTerms(filters)]),
    [esFilter, filters]
  );
  const filterCounts = useEntityFilterBarCounts({ spaceId, view, filter: baseFilter });

  // static options
  const entityTypeOptions = ENTITY_TYPE_OPTIONS.map((value) => ({
    value,
    count: filterCounts.entity_types[value] ?? 0,
  }));

  const riskLevelOptions = RISK_LEVEL_OPTIONS.map((value) => ({
    value,
    count: filterCounts.risk_levels[value] ?? 0,
  }));

  const criticalityOptions = ValidCriticalityLevels.map((value) => ({
    value,
    count: filterCounts.asset_criticality[value] ?? 0,
  }));

  // dynamic options — seed from both agg results and current selection so stale/zero-hit
  // values remain visible and clearable
  const seenDataSources = useRef(new Set<string>());
  [...Object.keys(filterCounts.data_sources), ...filters.dataSources].forEach((v) =>
    seenDataSources.current.add(v)
  );
  const dataSourceOptions = [...seenDataSources.current].map((value) => ({
    value,
    count: filterCounts.data_sources[value] ?? 0,
  }));

  const watchlistOptions = [
    ...[...watchlistNames.entries()].map(([id, name]) => ({
      id,
      name,
      count: filterCounts.watchlists[id] ?? 0,
    })),
    ...filters.watchlists
      .filter((id) => !watchlistNames.has(id))
      .map((id) => ({ id, name: id, count: filterCounts.watchlists[id] ?? 0 })),
  ];

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <FilterEntry>
        <MultiselectFilter<EntityType>
          title={FILTER_TITLES.entityType}
          items={entityTypeOptions.map((o) => o.value)}
          selectedItems={filters.entityTypes}
          onSelectionChange={(entityTypes) => onFiltersChange({ ...filters, entityTypes })}
          renderItem={(t) => (
            <ItemWithCount count={entityTypeOptions.find((o) => o.value === t)?.count ?? 0}>
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                {EntityIconByType[t] && (
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={EntityIconByType[t]} size="s" aria-hidden={true} />
                  </EuiFlexItem>
                )}
                <EuiFlexItem>{t.charAt(0).toUpperCase() + t.slice(1)}</EuiFlexItem>
              </EuiFlexGroup>
            </ItemWithCount>
          )}
          width={220}
        />
      </FilterEntry>

      <FilterEntry>
        <MultiselectFilter<RiskSeverity>
          title={FILTER_TITLES.riskLevel}
          items={riskLevelOptions.map((o) => o.value)}
          selectedItems={filters.riskLevels}
          onSelectionChange={(riskLevels) => onFiltersChange({ ...filters, riskLevels })}
          renderItem={(s) => (
            <ItemWithCount count={riskLevelOptions.find((o) => o.value === s)?.count ?? 0}>
              {(() => {
                const colors = getRiskScoreColors(euiTheme, s as EntityRiskLevels);
                return (
                  <EuiBadge color={colors.background}>
                    <EuiText
                      size="xs"
                      color={colors.text}
                      css={css`
                        font-weight: ${euiTheme.font.weight.semiBold};
                      `}
                    >
                      {s}
                    </EuiText>
                  </EuiBadge>
                );
              })()}
            </ItemWithCount>
          )}
          width={220}
        />
      </FilterEntry>

      <FilterEntry>
        <MultiselectFilter<string>
          title={FILTER_TITLES.assetCriticality}
          items={criticalityOptions.map((o) => o.value)}
          selectedItems={filters.assetCriticality}
          onSelectionChange={(assetCriticality) =>
            onFiltersChange({ ...filters, assetCriticality })
          }
          renderItem={(c) => (
            <ItemWithCount count={criticalityOptions.find((o) => o.value === c)?.count ?? 0}>
              <AssetCriticalityBadge
                criticalityLevel={c as CriticalityLevels}
                css={{ lineHeight: 'inherit' }}
              />
            </ItemWithCount>
          )}
          width={220}
        />
      </FilterEntry>

      <FilterEntry>
        <MultiselectFilter<string>
          title={FILTER_TITLES.dataSource}
          items={dataSourceOptions.map((o) => o.value)}
          selectedItems={filters.dataSources}
          onSelectionChange={(dataSources) => onFiltersChange({ ...filters, dataSources })}
          renderItem={(s) => (
            <ItemWithCount count={dataSourceOptions.find((o) => o.value === s)?.count ?? 0}>
              <EntitySourceValue values={toEntitySourceArray(s)} textSize="s" />
            </ItemWithCount>
          )}
          width={220}
        />
      </FilterEntry>

      <FilterEntry>
        <MultiselectFilter<string>
          title={FILTER_TITLES.watchlist}
          items={watchlistOptions.map((o) => o.id)}
          selectedItems={filters.watchlists}
          onSelectionChange={(watchlists) => onFiltersChange({ ...filters, watchlists })}
          renderItem={(id) => {
            const opt = watchlistOptions.find((o) => o.id === id);
            return <ItemWithCount count={opt?.count ?? 0}>{opt?.name ?? id}</ItemWithCount>;
          }}
          width={220}
        />
      </FilterEntry>
    </EuiFlexGroup>
  );
};
