/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiDataGrid,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiNotificationBadge,
  EuiProgress,
  EuiSpacer,
  useEuiTheme,
  type EuiDataGridCustomBodyProps,
} from '@elastic/eui';
import { GroupSelector } from '@kbn/grouping/src/components/group_selector';
import { Global, css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
import { buildEsQuery } from '@kbn/es-query';
import { SecurityPageName } from '../../app/types';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SiemSearchBar } from '../../common/components/search_bar';
import { InputsModelId } from '../../common/store/inputs/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { useSpaceId } from '../../common/hooks/use_space_id';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import {
  globalFiltersQuerySelector,
  globalQuerySelector,
} from '../../common/store/inputs/selectors';
import { useEntityStoreDataView } from '../components/home/use_entity_store_data_view';
import { DataViewContext } from '../components/home/entities_table';
import { LastUpdated } from '../components/home/last_updated';
import { ResolvedView } from '../components/home/new_entities_table';
import {
  useEntityGridData,
  useChildRows,
  useWatchlistNames,
  renderEntityCell,
  GRID_COLUMNS,
  RAW_GRID_COLUMNS,
  TIME_RANGE_OPTIONS,
  PAGE_SIZE_OPTIONS,
} from '../components/home/new_entities_table';
import type { TimeRange } from '../components/home/new_entities_table';
import { MultiselectFilter } from '../../common/components/multiselect_filter';
import { RiskSeverity } from '../../../common/search_strategy';
import { SEVERITY_UI_SORT_ORDER } from '../common/utils';
import { RiskScoreLevel } from '../components/severity/common/index';
import { CriticalityLevels } from '../../../common/entity_analytics/asset_criticality/constants';
import { AssetCriticalityBadge } from '../components/asset_criticality';
import { EntityType } from '../../../common/entity_analytics/types';
import { EntityIconByType } from '../components/entity_store/entity_icon_by_type';

const VIEW_BY_OPTIONS = [
  { key: 'resolved', label: 'Resolved entities' },
  { key: 'raw', label: 'Raw records' },
];

const GROUP_BY_OPTIONS = [{ key: 'resolution', label: 'Resolution' }];

const ENTITY_TYPE_OPTIONS = [EntityType.host, EntityType.user, EntityType.service];
const CRITICALITY_OPTIONS = [
  CriticalityLevels.EXTREME_IMPACT,
  CriticalityLevels.HIGH_IMPACT,
  CriticalityLevels.MEDIUM_IMPACT,
  CriticalityLevels.LOW_IMPACT,
  'unassigned' as const,
];

const PAGE_TITLE = i18n.translate('xpack.securitySolution.entityAnalytics.home.pageTitle', {
  defaultMessage: 'Entity analytics',
});

const MANAGEMENT_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.managementLink',
  { defaultMessage: 'Management' }
);

const pageWrapperOverride = css`
  [data-test-subj='pageContainer'].securityPageWrapper {
    padding-inline: 0 !important;
  }
  [data-test-subj='pageContainer'].securityPageWrapper > [class*='euiPageSection__content'] {
    padding-block: 0 !important;
  }
`;

export const EntityAnalyticsNewHomePage: React.FC = () => {
  const spaceId = useSpaceId();
  const { dataView, isLoading: isDataViewLoading } = useEntityStoreDataView(spaceId);
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const { euiTheme } = useEuiTheme();

  const globalFilters = useDeepEqualSelector(globalFiltersQuerySelector());
  const globalQuery = useDeepEqualSelector(globalQuerySelector());

  const esFilter = useMemo(() => {
    try {
      const built = buildEsQuery(dataView, [globalQuery], globalFilters);
      const hasContent =
        built.bool?.must?.length ||
        built.bool?.filter?.length ||
        built.bool?.should?.length ||
        built.bool?.must_not?.length;
      return hasContent ? built : undefined;
    } catch {
      return undefined;
    }
  }, [dataView, globalQuery, globalFilters]);

  const watchlistNames = useWatchlistNames();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [viewBy, setViewBy] = useState<'resolved' | 'raw'>('resolved');
  const [sortField, setSortField] = useState('entity.risk.calculated_score_norm');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const [targetPageIndex, setTargetPageIndex] = useState<number | null>(null);

  // Expansion state
  const [groupBy, setGroupBy] = useState<'none' | 'resolution'>('none');
  const [groupingPageIndex, setGroupingPageIndex] = useState(0);
  const [groupingPageSize, setGroupingPageSize] = useState(25);

  // Filter bar state
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<EntityType[]>([]);
  const [selectedRiskLevels, setSelectedRiskLevels] = useState<RiskSeverity[]>([]);
  const [selectedCriticalities, setSelectedCriticalities] = useState<string[]>([]);
  const [selectedWatchlists, setSelectedWatchlists] = useState<string[]>([]);

  const watchlistOptions = useMemo(() => [...watchlistNames.keys()], [watchlistNames]);

  // Expansion state (inline expansion in flat grid)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const { childMap, fetchChildren, resetChildren } = useChildRows();

  const resetPagination = useCallback(() => {
    setPageIndex(0);
    setCursors([null]);
    setTargetPageIndex(null);
  }, []);

  const resetExpansion = useCallback(() => {
    setExpandedIds(new Set());
    resetChildren();
  }, [resetChildren]);

  const esFilterJson = useMemo(() => JSON.stringify(esFilter), [esFilter]);

  useEffect(() => {
    resetPagination();
    resetExpansion();
  }, [esFilterJson, resetPagination, resetExpansion]);

  const onNextCursor = useCallback((idx: number, cursor: string) => {
    setCursors((prev) => {
      const next = [...prev];
      next[idx] = cursor;
      return next;
    });
  }, []);

  const columns = viewBy === 'raw' ? RAW_GRID_COLUMNS : GRID_COLUMNS;

  const { rows, total, updatedAt, isFetching, isLastPage } = useEntityGridData({
    sortField,
    sortDirection,
    pageIndex,
    pageSize,
    cursors,
    onNextCursor,
    filter: esFilter,
    timeRange,
    view: viewBy,
  });

  // Chain-fetch forward when the user jumped to a page beyond what's been loaded.
  useEffect(() => {
    if (targetPageIndex == null) return;
    if (pageIndex >= targetPageIndex || isLastPage) {
      setTargetPageIndex(null);
      return;
    }
    const nextPage = pageIndex + 1;
    if (cursors[nextPage] != null) {
      setPageIndex(nextPage);
    }
  }, [cursors, pageIndex, targetPageIndex, isLastPage]);

  const [visibleColumns, setVisibleColumns] = useState(columns.map((c) => c.id));

  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
      const row = rows[rowIndex - pageIndex * pageSize];
      if (!row) return null;
      return renderEntityCell(columnId, row[columnId], row, watchlistNames, euiTheme);
    },
    [rows, pageIndex, pageSize, watchlistNames, euiTheme]
  );

  // Chevron leading column — only rendered in resolved view.
  const expanderColumn = useMemo(
    () => ({
      id: 'expander',
      width: 32,
      headerCellRender: () => null,
      rowCellRender: ({ rowIndex }: { rowIndex: number }) => {
        const row = rows[rowIndex - pageIndex * pageSize];
        if (!row) return null;
        const entityId = row['entity.id'] as string;
        const groupSize = (row['group_size'] as number) ?? 1;
        if (groupSize <= 1) return null;
        const isExpanded = expandedIds.has(entityId);
        return (
          <EuiButtonIcon
            size="xs"
            color="text"
            iconType={isExpanded ? 'chevronSingleDown' : 'chevronSingleRight'}
            aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
            onClick={() => {
              if (isExpanded) {
                setExpandedIds((prev) => {
                  const s = new Set(prev);
                  s.delete(entityId);
                  return s;
                });
              } else {
                setExpandedIds((prev) => new Set([...prev, entityId]));
                fetchChildren(entityId, timeRange);
              }
            }}
          />
        );
      },
    }),
    [rows, pageIndex, pageSize, expandedIds, fetchChildren, timeRange]
  );

  const renderCustomGridBody = useCallback(
    ({
      Cell,
      visibleColumns: visCols,
      visibleRowData,
      headerRow,
      footerRow,
    }: EuiDataGridCustomBodyProps) => {
      return (
        <>
          {headerRow}
          {rows.map((row, i) => {
            const absoluteIndex = visibleRowData.startRow + i;
            const entityId = row['entity.id'] as string;
            const isExpanded = expandedIds.has(entityId);
            const children = isExpanded ? childMap.get(entityId) ?? [] : [];
            return (
              <React.Fragment key={entityId ?? i}>
                <div
                  role="row"
                  className="euiDataGridRow"
                  css={css`
                    inline-size: fit-content;
                    min-inline-size: 100%;
                    border-block-end: ${euiTheme.border.thin};
                  `}
                >
                  <div
                    css={css`
                      display: flex;
                    `}
                  >
                    {visCols.map((col, ci) => (
                      <Cell
                        colIndex={ci}
                        visibleRowIndex={absoluteIndex}
                        key={`${entityId}-${col.id}`}
                      />
                    ))}
                  </div>
                </div>
                {children.map((child, childIdx) => (
                  <div
                    role="row"
                    className="euiDataGridRow"
                    key={`${entityId}-child-${childIdx}`}
                    css={css`
                      inline-size: fit-content;
                      min-inline-size: 100%;
                      border-block-end: ${euiTheme.border.thin};
                      background: ${euiTheme.colors.body};
                    `}
                  >
                    <div
                      css={css`
                        display: flex;
                      `}
                    >
                      {visCols.map((col) => {
                        // Leading control column (expander) — render blank placeholder
                        if (!columns.find((c) => c.id === col.id)) {
                          return <div key={col.id} style={{ width: 32, flexShrink: 0 }} />;
                        }
                        const colDef = columns.find((c) => c.id === col.id)!;
                        const w = colDef.initialWidth ?? 150;
                        const value = child[col.id as string];
                        return (
                          <div
                            key={col.id}
                            role="gridcell"
                            style={{
                              width: w,
                              flexShrink: 0,
                              padding: '6px 12px',
                              overflow: 'hidden',
                            }}
                          >
                            {col.id === 'entity.name' ? (
                              <EuiFlexGroup
                                gutterSize="xs"
                                alignItems="center"
                                responsive={false}
                                wrap={false}
                              >
                                <EuiFlexItem grow={false}>
                                  <EuiIcon
                                    type="returnKey"
                                    size="s"
                                    color="subdued"
                                    css={css`
                                      transform: scaleX(-1);
                                    `}
                                  />
                                </EuiFlexItem>
                                <EuiFlexItem>
                                  {renderEntityCell(
                                    col.id as string,
                                    value,
                                    child,
                                    watchlistNames,
                                    euiTheme
                                  )}
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            ) : (
                              renderEntityCell(
                                col.id as string,
                                value,
                                child,
                                watchlistNames,
                                euiTheme
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </React.Fragment>
            );
          })}
          {footerRow}
        </>
      );
    },
    [rows, expandedIds, childMap, columns, watchlistNames, euiTheme]
  );

  const sorting = useMemo(
    () => ({
      columns: [{ id: sortField, direction: sortDirection }],
      onSort: (cols: Array<{ id: string; direction: 'asc' | 'desc' }>) => {
        const col = cols.find((c) => c.id !== sortField) ?? cols[0];
        if (!col) return;
        setSortField(col.id);
        setSortDirection(col.direction);
        resetPagination();
        resetExpansion();
      },
    }),
    [sortField, sortDirection, resetPagination, resetExpansion]
  );

  const handleChangePage = useCallback(
    (nextPageIndex: number) => {
      resetExpansion();
      if (cursors[nextPageIndex] !== undefined) {
        setPageIndex(nextPageIndex);
      } else {
        setTargetPageIndex(nextPageIndex);
        setPageIndex(cursors.length - 1);
      }
    },
    [cursors, resetExpansion]
  );

  const handleChangeItemsPerPage = useCallback(
    (newSize: number) => {
      setPageSize(newSize);
      resetPagination();
      resetExpansion();
    },
    [resetPagination, resetExpansion]
  );

  const viewBySelector = (
    <GroupSelector
      groupingId="ea-new-home-view-by"
      groupsSelected={[viewBy]}
      onGroupChange={(key) => {
        const next = key as 'resolved' | 'raw';
        setViewBy(next);
        resetPagination();
        resetExpansion();
        setVisibleColumns((next === 'raw' ? RAW_GRID_COLUMNS : GRID_COLUMNS).map((c) => c.id));
      }}
      options={VIEW_BY_OPTIONS}
      fields={[]}
      title="View by"
      maxGroupingLevels={1}
      settings={{ hideNoneOption: true, hideCustomFieldOption: true }}
    />
  );

  const groupBySelector =
    viewBy === 'resolved' ? (
      <GroupSelector
        groupingId="ea-new-home-group-by"
        groupsSelected={groupBy === 'none' ? [] : [groupBy]}
        onGroupChange={(key) => {
          const next = key as 'none' | 'resolution';
          setGroupBy((prev) => (prev === next ? 'none' : next));
          resetPagination();
          resetExpansion();
        }}
        options={GROUP_BY_OPTIONS}
        fields={[]}
        title="Group by"
        maxGroupingLevels={1}
        settings={{ hideCustomFieldOption: true }}
      />
    ) : null;

  const menu = useMemo<AppHeaderMenu>(
    () => ({
      items: [
        {
          id: 'entityAnalyticsManagement',
          label: MANAGEMENT_LABEL,
          iconType: 'gear' as const,
          href: getSecuritySolutionUrl({ deepLinkId: SecurityPageName.entityAnalyticsManagement }),
        },
      ],
    }),
    [getSecuritySolutionUrl]
  );

  if (isDataViewLoading) return <EuiLoadingSpinner size="l" />;

  return (
    <>
      <Global styles={pageWrapperOverride} />
      <AppHeader title={PAGE_TITLE} menu={menu} />
      <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsNewHomePage">
        <div
          css={css`
            padding-block-start: ${euiTheme.size.base};
            display: flex;
            flex-direction: column;
            height: 100%;
          `}
        >
          <div
            css={css`
              padding-inline: ${euiTheme.size.base};
            `}
          >
            <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
              <EuiFlexItem>
                <SiemSearchBar dataView={dataView} id={InputsModelId.global} hideDatePicker />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  legend="Time range"
                  options={TIME_RANGE_OPTIONS}
                  idSelected={timeRange}
                  onChange={(id) => {
                    setTimeRange(id as TimeRange);
                    resetPagination();
                    resetExpansion();
                  }}
                  buttonSize="s"
                  color="primary"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>

          <EuiSpacer size="s" />

          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            css={css`
              padding-inline: 16px;
              padding-inline-start: 24px;
            `}
          >
            <EuiFlexItem>
              <EuiFilterGroup compressed>
                <MultiselectFilter<EntityType>
                  title="Entity type"
                  items={ENTITY_TYPE_OPTIONS}
                  selectedItems={selectedEntityTypes}
                  onSelectionChange={setSelectedEntityTypes}
                  renderLabel={(t) => t.charAt(0).toUpperCase() + t.slice(1)}
                  renderItem={(t) => (
                    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                      {EntityIconByType[t] && (
                        <EuiFlexItem grow={false}>
                          <EuiIcon type={EntityIconByType[t]} size="s" />
                        </EuiFlexItem>
                      )}
                      <EuiFlexItem>{t.charAt(0).toUpperCase() + t.slice(1)}</EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiNotificationBadge size="s" color="subdued">
                          0
                        </EuiNotificationBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  )}
                  width={160}
                />
              </EuiFilterGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFilterGroup compressed>
                <MultiselectFilter<RiskSeverity>
                  title="Risk level"
                  items={SEVERITY_UI_SORT_ORDER}
                  selectedItems={selectedRiskLevels}
                  onSelectionChange={setSelectedRiskLevels}
                  renderLabel={(s) => s}
                  renderItem={(s) => (
                    <EuiFlexGroup
                      justifyContent="spaceBetween"
                      alignItems="center"
                      gutterSize="none"
                      responsive={false}
                    >
                      <EuiFlexItem grow={false}>
                        <RiskScoreLevel severity={s} hideBackgroundColor />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiNotificationBadge size="s" color="subdued">
                          0
                        </EuiNotificationBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  )}
                  width={160}
                />
              </EuiFilterGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFilterGroup compressed>
                <MultiselectFilter<string>
                  title="Asset criticality"
                  items={CRITICALITY_OPTIONS}
                  selectedItems={selectedCriticalities}
                  onSelectionChange={setSelectedCriticalities}
                  renderLabel={(c) => c.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  renderItem={(c) => (
                    <EuiFlexGroup
                      justifyContent="spaceBetween"
                      alignItems="center"
                      gutterSize="none"
                      responsive={false}
                    >
                      <EuiFlexItem grow={false}>
                        <AssetCriticalityBadge
                          criticalityLevel={c as CriticalityLevels}
                          css={{ lineHeight: 'inherit' }}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiNotificationBadge size="s" color="subdued">
                          0
                        </EuiNotificationBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  )}
                  width={200}
                />
              </EuiFilterGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFilterGroup compressed>
                <MultiselectFilter<never>
                  title="Data source"
                  items={[]}
                  selectedItems={[]}
                  width={160}
                />
              </EuiFilterGroup>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiFilterGroup compressed>
                <MultiselectFilter<string>
                  title="Watchlist"
                  items={watchlistOptions}
                  selectedItems={selectedWatchlists}
                  onSelectionChange={setSelectedWatchlists}
                  renderLabel={(id) => watchlistNames.get(id) ?? id}
                  renderItem={(id) => (
                    <EuiFlexGroup
                      justifyContent="spaceBetween"
                      alignItems="center"
                      gutterSize="s"
                      responsive={false}
                    >
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
                          {watchlistNames.get(id) ?? id}
                        </span>
                      </EuiFlexItem>
                      <EuiFlexItem
                        grow={false}
                        css={css`
                          flex-shrink: 0;
                        `}
                      >
                        <EuiNotificationBadge size="s" color="subdued">
                          0
                        </EuiNotificationBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  )}
                  width={200}
                />
              </EuiFilterGroup>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          {isFetching && <EuiProgress size="xs" color="accent" position="fixed" />}

          <div
            css={css`
              padding-inline: ${euiTheme.size.base};
              padding-block-end: ${euiTheme.size.base};
            `}
          >
            {groupBy === 'resolution' ? (
              <DataViewContext.Provider value={{ dataView, dataViewIsLoading: isDataViewLoading }}>
                <ResolvedView
                  groupingPageIndex={groupingPageIndex}
                  groupingPageSize={groupingPageSize}
                  onChangeGroupsPage={setGroupingPageIndex}
                  onChangeGroupsItemsPerPage={setGroupingPageSize}
                  timeRange={timeRange}
                  watchlistNames={watchlistNames}
                  esFilter={esFilter}
                  groupSelectorComponent={
                    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
                      <EuiFlexItem grow={false}>{viewBySelector}</EuiFlexItem>
                      <EuiFlexItem grow={false}>{groupBySelector}</EuiFlexItem>
                    </EuiFlexGroup>
                  }
                />
              </DataViewContext.Provider>
            ) : (
              <EuiDataGrid
                aria-label="Entity analytics grid"
                leadingControlColumns={viewBy === 'resolved' ? [expanderColumn] : []}
                columns={columns}
                columnVisibility={{ visibleColumns, setVisibleColumns }}
                rowCount={total}
                renderCellValue={renderCellValue}
                renderCustomGridBody={renderCustomGridBody}
                sorting={sorting}
                pagination={{
                  pageIndex,
                  pageSize,
                  pageSizeOptions: PAGE_SIZE_OPTIONS,
                  onChangePage: handleChangePage,
                  onChangeItemsPerPage: handleChangeItemsPerPage,
                }}
                toolbarVisibility={{
                  showColumnSelector: false,
                  showSortSelector: false,
                  showDisplaySelector: false,
                  showKeyboardShortcuts: false,
                  additionalControls: {
                    left: {
                      prepend: updatedAt != null ? <LastUpdated updatedAt={updatedAt} /> : null,
                    },
                    right: (
                      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
                        <EuiFlexItem grow={false}>{viewBySelector}</EuiFlexItem>
                        {groupBySelector && (
                          <EuiFlexItem grow={false}>{groupBySelector}</EuiFlexItem>
                        )}
                      </EuiFlexGroup>
                    ),
                  },
                }}
                gridStyle={{
                  border: 'horizontal',
                  header: 'underline',
                  cellPadding: 'm',
                  fontSize: 'm',
                  stripes: false,
                }}
              />
            )}
          </div>
        </div>
      </SecuritySolutionPageWrapper>
      <SpyRoute pageName={SecurityPageName.entityAnalyticsHomePage} />
    </>
  );
};
