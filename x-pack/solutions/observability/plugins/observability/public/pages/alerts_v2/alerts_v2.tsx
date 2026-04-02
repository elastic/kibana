/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import { map } from 'rxjs';
import {
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiScreenReaderOnly,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  logicalCSS,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CellActionsProvider } from '@kbn/cell-actions';
import type { SortOrder } from '@kbn/unified-data-table';
import {
  DataLoadingState,
  UnifiedDataTable,
  type UnifiedDataTableSettings,
} from '@kbn/unified-data-table';
import { css } from '@emotion/react';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { useFetchAlertingEpisodesQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_alerting_episodes_query';
import { useFetchEpisodeActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_actions';
import { useFetchGroupActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_group_actions';
import { AlertEpisodeStatusCell } from '@kbn/alerting-v2-episodes-ui/components/alert_episodes/status/alert_episode_status_cell';
import { AlertEpisodeActionsCell } from '@kbn/alerting-v2-episodes-ui/components/alert_episodes/actions/alert_episode_actions_cell';
import { AlertEpisodeTags } from '@kbn/alerting-v2-episodes-ui/components/alert_episodes/actions/alert_episode_tags';
import type {
  EpisodesFilterState,
  EpisodesSortState,
} from '@kbn/alerting-v2-episodes-ui/utils/build_episodes_esql_query';
import { useAlertingRulesCache } from '@kbn/alerting-v2-episodes-ui/hooks/use_alerting_rules_cache';
import useObservable from 'react-use/lib/useObservable';
import type { InputTimeRange } from '@kbn/data-plugin/public/query';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { EpisodesFilterBar } from './components/episodes_filter_bar';

const PAGE_SIZE = 1000;

const DEFAULT_SORT: EpisodesSortState = { sortField: '@timestamp', sortDirection: 'desc' };

const ALERTS_V2_TABLE_SETTINGS: UnifiedDataTableSettings = {
  columns: {
    duration: { width: 100 },
    actions: { width: 320 },
    'episode.status': { width: 220 },
  },
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
  }

  & .euiDataGridRowCell[data-gridcell-column-id='select'] .euiDataGridRowCell__content {
    align-items: center;
    justify-content: flex-start;
    height: 100%;
  }

  & .euiDataGridRowCell[data-gridcell-column-id='actions'] .euiDataGridRowCell__content {
    justify-content: flex-end;
  }
`;

function EmptyToolbar() {
  return <></>;
}

export function AlertsV2Page() {
  const services = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const { euiTheme } = useEuiTheme();
  const timefilter = services.data.query.timefilter.timefilter;

  const timeRange$ = useMemo(
    () => timefilter.getTimeUpdate$().pipe(map(() => timefilter.getTime())),
    [timefilter]
  );

  const timeRange = useObservable(
    timeRange$,
    timefilter?.getTime() ?? { from: 'now-24h', to: 'now' }
  );

  const [filterState, setFilterState] = useState<EpisodesFilterState>({});
  const [sortState, setSortState] = useState<EpisodesSortState>(DEFAULT_SORT);
  const [columns, setColumns] = useState<string[]>([
    'episode.status',
    '@timestamp',
    'rule.id',
    'duration',
    'tags',
    'actions',
  ]);
  const [rowHeight, setRowHeight] = useState(2);

  const handleTimeChange = useCallback(
    (range: InputTimeRange) => {
      timefilter.setTime(range);
    },
    [timefilter]
  );

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
    // Table supports multiple sort columns; the last element is the one the user just changed
    const [field, dir] = nextSort[nextSort.length - 1];
    if (field != null && dir != null) {
      setSortState({
        sortField: String(field),
        sortDirection: dir === 'asc' ? 'asc' : 'desc',
      });
    }
  }, []);

  const ruleIds = useMemo(
    () => [...new Set(episodesData?.rows.map((row) => row['rule.id'] as string) ?? [])],
    [episodesData?.rows]
  );

  const { rulesCache, loading: isLoadingRules } = useAlertingRulesCache({
    ruleIds,
    services,
  });

  const ruleOptions = useMemo(
    () =>
      Object.entries(rulesCache).map(([id, rule]) => ({
        label: rule.metadata?.name ?? id,
        value: id,
      })),
    [rulesCache]
  );

  const rows = useMemo(
    () =>
      episodesData?.rows.map((row, idx) => {
        const record: DataTableRecord = {
          id: String(idx),
          raw: row,
          flattened: row,
        };

        return record;
      }),
    [episodesData?.rows]
  );

  const episodeIds = useMemo(
    () => rows?.map((row) => row.flattened['episode.id'] as string).filter(Boolean),
    [rows]
  );

  const groupHashes = useMemo(
    () => [...new Set(rows?.map((row) => row.flattened.group_hash as string).filter(Boolean))],
    [rows]
  );

  const { data: episodeActionsMap } = useFetchEpisodeActions({
    episodeIds: episodeIds ?? [],
    services,
  });
  const { groupActionsMap } = useFetchGroupActions({ groupHashes, services });

  const onSetColumns = useCallback((cols: string[], _hideTimeCol: boolean) => {
    setColumns(cols);
  }, []);

  return (
    <ObservabilityPageTemplate
      data-test-subj="observabilityAlertsV2Page"
      pageHeader={{
        pageTitle: i18n.translate('xpack.observability.alertsV2.pageTitle', {
          defaultMessage: 'Alerts v2',
        }),
      }}
      pageSectionProps={{
        grow: true,
        contentProps: {
          css: css`
            display: flex;
            flex-grow: 1;
            ${logicalCSS('min-height')}: 0;
          `,
        },
      }}
    >
      <HeaderMenu />

      <EuiFlexGroup
        direction="column"
        css={css`
          min-width: 0;
        `}
      >
        <EuiFlexItem grow={false}>
          <EpisodesFilterBar
            filterState={filterState}
            onFilterChange={setFilterState}
            timeRange={timeRange}
            onTimeChange={handleTimeChange}
            ruleOptions={ruleOptions}
            onRefresh={() => refetch()}
            isLoading={isLoading}
            services={services}
          />
          <EuiSpacer size="s" />
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
              <span id="alertingEpisodesTableAriaLabel">
                {i18n.translate(
                  'xpack.observability.alertsV2Page.span.alertingEpisodesTableLabel',
                  { defaultMessage: 'Alerting episodes table' }
                )}
              </span>
            </EuiScreenReaderOnly>
            {!dataView ? (
              <EuiLoadingSpinner />
            ) : (
              <UnifiedDataTable
                ariaLabelledBy="alertingEpisodesTableAriaLabel"
                settings={ALERTS_V2_TABLE_SETTINGS}
                css={getTableCss(euiTheme)}
                gridStyleOverride={{
                  stripes: false,
                  cellPadding: 'l',
                }}
                renderCustomToolbar={EmptyToolbar}
                // Columns
                dataView={dataView}
                columns={columns}
                onSetColumns={onSetColumns}
                canDragAndDropColumns
                showTimeCol={!!dataView.timeFieldName}
                customGridColumnsConfiguration={{
                  actions: ({ column }) => ({
                    ...column,
                    displayAsText: i18n.translate('xpack.observability.alertsV2.columns.actions', {
                      defaultMessage: 'Actions',
                    }),
                  }),
                  tags: ({ column }) => ({
                    ...column,
                    displayAsText: i18n.translate('xpack.observability.alertsV2.columns.tags', {
                      defaultMessage: 'Tags',
                    }),
                  }),
                }}
                externalCustomRenderers={{
                  'episode.status': (props) => {
                    const status = props.row.flattened[
                      props.columnId
                    ] as unknown as AlertEpisodeStatus;
                    const episodeId = props.row.flattened['episode.id'] as string;
                    const groupHash = props.row.flattened.group_hash as string;

                    return (
                      <AlertEpisodeStatusCell
                        status={status}
                        episodeAction={episodeActionsMap?.get(episodeId)}
                        groupAction={groupActionsMap.get(groupHash)}
                      />
                    );
                  },
                  actions: (props) => {
                    const episodeId = props.row.flattened['episode.id'] as string;
                    const groupHash = props.row.flattened.group_hash as string;

                    return (
                      <AlertEpisodeActionsCell
                        episodeId={episodeId}
                        groupHash={groupHash}
                        episodeAction={episodeActionsMap?.get(episodeId)}
                        groupAction={groupActionsMap.get(groupHash)}
                        http={services.http}
                      />
                    );
                  },
                  tags: (props) => {
                    const groupHash = props.row.flattened.group_hash as string;
                    const groupAction = groupActionsMap.get(groupHash);

                    return <AlertEpisodeTags tags={groupAction?.tags ?? []} />;
                  },
                  'rule.id': (props) => {
                    if (!Object.keys(rulesCache).length && isLoadingRules) {
                      return <EuiSkeletonText />;
                    }
                    const ruleId = props.row.flattened[props.columnId] as string;
                    const rule = rulesCache[ruleId];
                    if (!rule) {
                      return ruleId;
                    }
                    const ruleName = (
                      <EuiText
                        size="s"
                        css={css`
                          font-weight: ${euiTheme.font.weight.semiBold};
                        `}
                      >
                        {rule.metadata.name}
                      </EuiText>
                    );
                    if (rowHeight === 1) {
                      return ruleName;
                    }
                    return (
                      <EuiFlexGroup direction="column" gutterSize="none">
                        <EuiFlexItem>{ruleName}</EuiFlexItem>
                        <EuiFlexItem>
                          <EuiCode
                            color="subdued"
                            css={css`
                              background: none;
                              color: ${euiTheme.colors.mediumShade};
                              font-size: ${euiTheme.font.scale.xs};
                              white-space: nowrap;
                              overflow: hidden;
                              text-overflow: ellipsis;
                              padding: 0;
                            `}
                          >
                            {rule.evaluation.query.base}
                          </EuiCode>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    );
                  },
                }}
                // Data
                rows={rows}
                // Forcing totalHits to be greater than the max page size to show
                // the footer callout about the max limit reached
                totalHits={!episodesData?.rows.length ? 0 : PAGE_SIZE + 1}
                loadingState={isLoading ? DataLoadingState.loading : DataLoadingState.loaded}
                // Pagination
                // We're not really paginating, this is just to show the
                // footer callout about the max limit reached
                isPaginationEnabled
                paginationMode="singlePage"
                sampleSizeState={PAGE_SIZE}
                // Sorting
                isSortEnabled
                sort={sort}
                onSort={onSort}
                // Rows
                rowHeightState={rowHeight}
                onUpdateRowHeight={setRowHeight}
                // Dependencies
                services={services}
              />
            )}
          </CellActionsProvider>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
