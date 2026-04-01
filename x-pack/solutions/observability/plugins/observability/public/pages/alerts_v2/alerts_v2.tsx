/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiScreenReaderOnly,
  EuiSkeletonText,
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
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-plugin/server/resources/datastreams/alert_events';
import { useFetchAlertingEpisodesQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_alerting_episodes_query';
import { pagesToDatatableRecords } from '@kbn/alerting-v2-episodes-ui/utils/pages_to_datatable_records';
import { useAlertingRulesIndex } from '@kbn/alerting-v2-episodes-ui/hooks/use_alerting_rules_index';
import { useFetchEpisodeActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_actions';
import { useFetchGroupActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_group_actions';
import { AlertEpisodeStatusCell } from '@kbn/alerting-v2-episodes-ui/components/alert_episodes/status/alert_episode_status_cell';
import { AlertEpisodeActionsCell } from '@kbn/alerting-v2-episodes-ui/components/alert_episodes/actions/alert_episode_actions_cell';
import { AlertEpisodeTags } from '@kbn/alerting-v2-episodes-ui/components/alert_episodes/actions/alert_episode_tags';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';

const PAGE_SIZE = 50;

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

  const [sort] = useState<SortOrder[]>([['@timestamp', 'desc']]);
  const [columns, setColumns] = useState<string[]>([
    'episode.status',
    '@timestamp',
    'rule.id',
    'duration',
    'tags',
    'actions',
  ]);
  const [rowHeight, setRowHeight] = useState(2);

  const {
    data: episodesData,
    dataView,
    isLoading,
    fetchNextPage,
  } = useFetchAlertingEpisodesQuery({
    pageSize: PAGE_SIZE,
    services,
  });

  const ruleIds = useMemo(
    () => [
      ...new Set(
        episodesData?.pages.flatMap((page) => page.rows).map((row) => row['rule.id'] as string) ??
          []
      ),
    ],
    [episodesData?.pages]
  );

  const { rulesIndex, loading: isLoadingRules } = useAlertingRulesIndex({
    ruleIds,
    services,
  });

  const rows = useMemo(() => pagesToDatatableRecords(episodesData?.pages), [episodesData?.pages]);

  const episodeIds = useMemo(
    () => rows.map((row) => row.flattened['episode.id'] as string).filter(Boolean),
    [rows]
  );

  const groupHashes = useMemo(
    () => [...new Set(rows.map((row) => row.flattened.group_hash as string).filter(Boolean))],
    [rows]
  );

  const { episodeActionsMap } = useFetchEpisodeActions({ episodeIds, services });
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
                    const status = props.row.flattened[props.columnId] as AlertEpisodeStatus;
                    const episodeId = props.row.flattened['episode.id'] as string;
                    const groupHash = props.row.flattened.group_hash as string;

                    return (
                      <AlertEpisodeStatusCell
                        status={status}
                        episodeAction={episodeActionsMap.get(episodeId)}
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
                        episodeAction={episodeActionsMap.get(episodeId)}
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
                    if (!Object.keys(rulesIndex).length && isLoadingRules) {
                      return <EuiSkeletonText />;
                    }
                    const ruleId = props.row.flattened[props.columnId] as string;
                    const rule = rulesIndex[ruleId];
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
                totalHits={episodesData?.pages?.[0].total ?? 0}
                loadingState={isLoading ? DataLoadingState.loading : DataLoadingState.loaded}
                // Pagination
                isPaginationEnabled
                paginationMode="singlePage"
                onFetchMoreRecords={fetchNextPage}
                sampleSizeState={0}
                // Sorting
                isSortEnabled
                sort={sort}
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
