/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import { UnifiedDataTable, DataLoadingState, type SortOrder } from '@kbn/unified-data-table';
import { useKibana } from '../../../common/lib/kibana';
import { EsqlInspectButton } from '../kpis/esql_inspect_button';
import { useEpisodesTableData } from './use_episodes_table_data';

const TITLE = i18n.translate('xpack.securitySolution.alertsV2.episodesTable.title', {
  defaultMessage: 'Episodes',
});
const TITLE_ID = 'alertsV2EpisodesTableTitle';

/** Columns the view provides; tags/assignee (action-derived) come in a later step. */
const DEFAULT_COLUMNS = ['@timestamp', 'episode.status', 'severity', 'rule.id', 'duration'];
const SAMPLE_SIZE = 100;
const GRID_HEIGHT = 500;
const NO_SORT: SortOrder[] = [];

export interface EpisodesTableSectionProps {
  /** The page's ES|QL query — the table lists episodes from it. */
  query: AggregateQuery;
  timeRange: TimeRange;
}

/**
 * Episodes table below the KPI section. Step 2: a bar-driven `UnifiedDataTable`
 * with a fixed column set and default cell rendering (RnA cell renderers and
 * sorting/column management come in later steps).
 */
export const EpisodesTableSection = ({ query, timeRange }: EpisodesTableSectionProps) => {
  const { services } = useKibana();
  const { rows, columnsMeta, dataView, isLoading, error, inspect } = useEpisodesTableData(
    query,
    timeRange
  );

  const [columns, setColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const onSetColumns = useCallback((nextColumns: string[]) => setColumns(nextColumns), []);

  const tableServices = useMemo(
    () => ({
      theme: services.theme,
      fieldFormats: services.data.fieldFormats,
      uiSettings: services.uiSettings,
      toastNotifications: services.notifications.toasts,
      storage: services.storage,
      data: services.data,
    }),
    [services]
  );

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="alertsV2EpisodesTableSection">
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3 id={TITLE_ID}>{TITLE}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EsqlInspectButton inspect={inspect} title={TITLE} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      {error ? (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="error"
          size="s"
          title={i18n.translate('xpack.securitySolution.alertsV2.episodesTable.error', {
            defaultMessage: 'Unable to load episodes',
          })}
        >
          {error.message}
        </EuiCallOut>
      ) : !dataView ? (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ height: GRID_HEIGHT }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <div style={{ height: GRID_HEIGHT }}>
          <UnifiedDataTable
            ariaLabelledBy={TITLE_ID}
            columns={columns}
            columnsMeta={columnsMeta}
            dataView={dataView}
            rows={rows}
            loadingState={isLoading ? DataLoadingState.loading : DataLoadingState.loaded}
            onSetColumns={onSetColumns}
            sort={NO_SORT}
            sampleSizeState={SAMPLE_SIZE}
            showTimeCol={false}
            isPlainRecord
            isSortEnabled={false}
            isInMemorySortEnabled={false}
            controlColumnIds={[]}
            services={tableServices}
          />
        </div>
      )}
    </EuiPanel>
  );
};
