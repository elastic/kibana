/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiDataGridColumn, EuiThemeComputed } from '@elastic/eui';
import {
  EuiBadge,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiSuperDatePicker,
  logicalCSS,
  useEuiTheme,
} from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import { CellActionsProvider } from '@kbn/cell-actions';
import type {
  SortOrder,
  CustomBulkActions,
  CustomCellRenderer,
  CustomGridColumnsConfiguration,
  UnifiedDataTableSettings,
} from '@kbn/unified-data-table';
import { DataLoadingState, UnifiedDataTable } from '@kbn/unified-data-table';
import type { RowControlColumn, DataTableRecord } from '@kbn/discover-utils';
import { css } from '@emotion/react';
import { useQueryClient } from '@kbn/react-query';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useFetchAlertingEpisodesQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_alerting_episodes_query';
import type {
  AlertEpisode,
  EpisodesFilterState,
  EpisodesSortState,
} from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { useAlertingRulesCache } from '@kbn/alerting-v2-episodes-ui/hooks/use_alerting_rules_cache';
import { createEpisodeActions, type EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions';
import { EpisodeRuleCell } from '@kbn/alerting-v2-episodes-ui/components/episodes_table_cell_renderers';
import { AlertEpisodeTags } from '@kbn/alerting-v2-episodes-ui/components/actions/tags';
import { getEpisodesFromDocIds } from '@kbn/alerting-v2-episodes-ui/utils/bulk_selection';
import { useKibana } from '../../common/lib/kibana';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { EpisodeAssigneeCell } from '../components/episode_assignee_cell';
import * as i18n from '../translations';
import { AlertsV2DetailsPanelKey } from '../constants';

const PAGE_SIZE = 1000;

const DEFAULT_SORT: EpisodesSortState = { sortField: '@timestamp', sortDirection: 'desc' };

const TABLE_SETTINGS: UnifiedDataTableSettings = {
  columns: {
    assignees: { width: 120 },
  },
};

const CUSTOM_GRID_COLUMNS: CustomGridColumnsConfiguration = {
  tags: ({ column }: { column: EuiDataGridColumn }): EuiDataGridColumn => ({
    ...column,
    displayAsText: i18n.COLUMN_TAGS,
  }),
  assignees: ({ column }) => ({
    ...column,
    displayAsText: i18n.COLUMN_ASSIGNEES,
  }),
  last_ack_action: ({ column }) => ({
    ...column,
    displayAsText: i18n.COLUMN_STATUS,
  }),
};

const getTableCss = (euiTheme: EuiThemeComputed) => css`
  height: 100%;
  border-radius: ${euiTheme.border.radius.medium};
  border: ${euiTheme.border.thin};
  overflow: hidden;

  & .unifiedDataTable__cellValue {
    font-family: unset;
  }

  & .euiDataGridRowCell__content {
    display: flex;
    align-items: center;
    block-size: 100%;
  }

  & .euiDataGridRowCell[data-gridcell-column-id='select'] .euiDataGridRowCell__content {
    align-items: center;
    justify-content: flex-start;
    height: 100%;
  }

  &
    .euiDataGridRowCell--controlColumn[data-gridcell-column-id='actions']
    .euiDataGridRowCell__content
    > .euiFlexGroup {
    justify-content: center;
  }
`;

const alertEpisodeToDataTableRecord = (row: AlertEpisode): DataTableRecord => ({
  id: row['episode.id'],
  raw: {},
  flattened: Object.fromEntries(Object.entries(row)),
});

const dataTableRecordToEpisode = (record: DataTableRecord): AlertEpisode =>
  record.flattened as unknown as AlertEpisode;

export const AlertsV2Page = () => {
  const services = useKibana().services;
  const queryClient = useQueryClient();
  const { euiTheme } = useEuiTheme();
  const { openFlyout } = useExpandableFlyoutApi();

  const [timeRange, setTimeRange] = useState<TimeRange>({ from: 'now-24h', to: 'now' });
  const [searchQuery, setSearchQuery] = useState('');
  const filterState = useMemo<EpisodesFilterState>(
    () => ({
      queryString: searchQuery || null,
    }),
    [searchQuery]
  );
  const [sortState, setSortState] = useState<EpisodesSortState>(DEFAULT_SORT);
  const [columns, setColumns] = useState<string[]>([
    '@timestamp',
    'rule.id',
    'last_ack_action',
    'tags',
    'assignees',
  ]);
  const [rowHeight, setRowHeight] = useState(2);

  const {
    data: episodesData,
    dataView,
    isLoading,
    refetch,
  } = useFetchAlertingEpisodesQuery({
    pageSize: PAGE_SIZE,
    services,
    filterState,
    sortState,
    timeRange,
  });

  const sort: SortOrder[] = useMemo(
    () => [[sortState.sortField, sortState.sortDirection]],
    [sortState.sortField, sortState.sortDirection]
  );

  const onSort = useCallback((nextSort: string[][]) => {
    if (!nextSort.length) {
      setSortState(DEFAULT_SORT);
      return;
    }
    const [field, dir] = nextSort[nextSort.length - 1];
    if (field != null && dir != null) {
      setSortState({
        sortField: String(field),
        sortDirection: dir === 'asc' ? 'asc' : 'desc',
      });
    }
  }, []);

  const ruleIds = useMemo(
    () => [...new Set(episodesData?.map((row) => row['rule.id']) ?? [])],
    [episodesData]
  );

  const { rulesCache, loading: isLoadingRules } = useAlertingRulesCache({
    ruleIds,
    services,
  });

  const rows = useMemo(() => episodesData?.map(alertEpisodeToDataTableRecord), [episodesData]);

  const handleOpenFlyout = useCallback(
    (episodeId: string) => {
      openFlyout({
        right: {
          id: AlertsV2DetailsPanelKey,
          params: { episodeId },
        },
      });
    },
    [openFlyout]
  );

  const episodeActions: EpisodeAction[] = useMemo(
    () =>
      createEpisodeActions({
        http: services.http,
        overlays: services.overlays,
        notifications: services.notifications,
        rendering: services.rendering,
        application: services.application,
        userProfile: services.userProfile,
        docLinks: services.docLinks,
        expressions: services.expressions,
        queryClient,
        getEpisodeDetailsHref: () => '',
        getDiscoverHref: () => undefined,
      }),
    [services, queryClient]
  );

  const rowAdditionalLeadingControls: RowControlColumn[] = useMemo(
    () => [
      {
        id: 'alertsV2-expand',
        width: 38,
        render: (Control, { record }) => (
          <Control
            iconType="expand"
            label={i18n.FLYOUT_TITLE}
            onClick={() => handleOpenFlyout(record.id)}
            tooltipContent={i18n.FLYOUT_TITLE}
          />
        ),
      },
      ...episodeActions.map(
        (action) =>
          ({
            id: action.id,
            render: (Control, { record }) => {
              const episodes = [dataTableRecordToEpisode(record)];
              if (!action.isCompatible({ episodes })) return <></>;
              return (
                <Control
                  iconType={action.iconType}
                  label={action.displayName}
                  onClick={() => action.execute({ episodes, onSuccess: refetch })}
                  tooltipContent={action.displayName}
                />
              );
            },
          } as RowControlColumn)
      ),
    ],
    [episodeActions, refetch, handleOpenFlyout]
  );

  const customBulkActions: CustomBulkActions = useMemo(
    () =>
      episodeActions.map((action) => ({
        key: action.id,
        label: action.displayName,
        icon: action.iconType,
        isAvailable: ({ selectedDocIds }: { selectedDocIds: string[] }) =>
          action.isCompatible({
            episodes: getEpisodesFromDocIds(selectedDocIds, episodesData ?? []),
          }),
        onClick: ({ selectedDocIds }: { selectedDocIds: string[] }) =>
          action.execute({
            episodes: getEpisodesFromDocIds(selectedDocIds, episodesData ?? []),
            onSuccess: refetch,
          }),
      })),
    [episodeActions, episodesData, refetch]
  );

  const onTimeChange = useCallback(({ start, end }: { start: string; end: string }) => {
    setTimeRange({ from: start, to: end });
  }, []);

  const onSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const onSetColumns = useCallback((cols: string[], _hideTimeCol: boolean) => {
    setColumns(cols);
  }, []);

  const externalCustomRenderers = useMemo<CustomCellRenderer>(
    () => ({
      last_ack_action: ({ row }) => {
        const value = row.flattened.last_ack_action as string | undefined | null;
        if (!value || value === 'unack') return <></>;
        if (value === 'ack') {
          return <EuiBadge color="warning">{i18n.STATUS_ACKNOWLEDGED}</EuiBadge>;
        }
        return <></>;
      },
      tags: ({ row }) => {
        const raw = row.flattened.last_tags;
        const safeTags = Array.isArray(raw) ? (raw as string[]) : raw ? [String(raw)] : [];
        return <AlertEpisodeTags tags={safeTags} />;
      },
      'rule.id': (props) => (
        <EpisodeRuleCell
          {...props}
          rulesCache={rulesCache}
          isLoadingRules={isLoadingRules}
          rowHeight={rowHeight}
        />
      ),
      assignees: ({ row }) => {
        const assigneeUid = row.flattened.last_assignee_uid as string | undefined;
        return <EpisodeAssigneeCell assigneeUid={assigneeUid} userProfile={services.userProfile} />;
      },
    }),
    [rulesCache, isLoadingRules, rowHeight, services.userProfile]
  );

  return (
    <SecuritySolutionPageWrapper>
      <div
        data-test-subj="alertsV2Page"
        css={css`
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          ${logicalCSS('min-height')}: 0;
          min-width: 0;
        `}
      >
        <EuiPageHeader bottomBorder pageTitle={i18n.ALERTS_V2_PAGE_TITLE} />
        <EuiSpacer size="m" />

        <EuiFlexGroup
          direction="column"
          css={css`
            flex: 1;
            min-width: 0;
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
              <EuiFlexItem grow>
                <EuiFieldSearch
                  compressed
                  placeholder={i18n.SEARCH_PLACEHOLDER}
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  isClearable
                  aria-label={i18n.SEARCH_PLACEHOLDER}
                  fullWidth
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSuperDatePicker
                  compressed
                  start={timeRange.from}
                  end={timeRange.to}
                  onTimeChange={onTimeChange}
                  onRefresh={() => refetch()}
                  isLoading={isLoading}
                  showUpdateButton="iconOnly"
                  updateButtonProps={{ fill: false }}
                  width="auto"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem
            grow
            css={css`
              min-width: 0;
            `}
          >
            <CellActionsProvider
              getTriggerCompatibleActions={services.uiActions.getTriggerCompatibleActions}
            >
              <EuiScreenReaderOnly>
                <span id="alertsV2TableAriaLabel">{i18n.ALERTS_V2_TABLE_ARIA_LABEL}</span>
              </EuiScreenReaderOnly>
              {!dataView ? (
                <EuiLoadingSpinner />
              ) : (
                <UnifiedDataTable
                  ariaLabelledBy="alertsV2TableAriaLabel"
                  settings={TABLE_SETTINGS}
                  css={getTableCss(euiTheme)}
                  gridStyleOverride={{
                    stripes: false,
                    cellPadding: 'l',
                  }}
                  dataView={dataView}
                  columns={columns}
                  onSetColumns={onSetColumns}
                  canDragAndDropColumns
                  showTimeCol={!!dataView.timeFieldName}
                  customGridColumnsConfiguration={CUSTOM_GRID_COLUMNS}
                  externalCustomRenderers={externalCustomRenderers}
                  rows={rows}
                  totalHits={!episodesData?.length ? 0 : PAGE_SIZE + 1}
                  loadingState={isLoading ? DataLoadingState.loading : DataLoadingState.loaded}
                  isPaginationEnabled
                  paginationMode="singlePage"
                  sampleSizeState={PAGE_SIZE}
                  isSortEnabled
                  sort={sort}
                  onSort={onSort}
                  rowHeightState={rowHeight}
                  onUpdateRowHeight={setRowHeight}
                  customBulkActions={customBulkActions}
                  rowAdditionalLeadingControls={rowAdditionalLeadingControls}
                  enableComparisonMode={false}
                  services={{
                    ...services,
                    toastNotifications: services.notifications.toasts,
                  }}
                />
              )}
            </CellActionsProvider>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </SecuritySolutionPageWrapper>
  );
};
