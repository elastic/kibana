/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingChart,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import {
  type CustomCellRenderer,
  type CustomGridColumnsConfiguration,
  DataLoadingState,
  type SortOrder,
  UnifiedDataTable,
} from '@kbn/unified-data-table';
import {
  EpisodeSeverityCell,
  EpisodeStatusCell,
} from '@kbn/alerting-v2-episodes-ui/components/episodes_table_cell_renderers';
import { useAlertingRulesCache } from '@kbn/alerting-v2-episodes-ui/hooks/use_alerting_rules_cache';
import type { RowControlColumn } from '@kbn/discover-utils';
import { useKibana } from '../../../common/lib/kibana';
import { EsqlInspectButton } from '../kpis/esql_inspect_button';
import { useEpisodesTableData } from './use_episodes_table_data';
import { HostNameCell } from './host_name_cell';
import { UserNameCell } from './user_name_cell';
import { NetworkIpCell } from './network_ip_cell';
import { useInvestigateEpisodeInTimeline } from './use_investigate_episode_in_timeline';
import { useFlyoutApi } from '../../../flyout_v2/use_flyout_api';
import { useEsqlAvailability } from '../../../common/hooks/esql/use_esql_availability';

const TITLE = i18n.translate('xpack.securitySolution.alertsV2.episodesTable.title', {
  defaultMessage: 'Episodes',
});
const TITLE_ID = 'alertsV2EpisodesTableTitle';

/**
 * The v1 alerts table's default columns, mapped to v2. Omitted vs v1: Risk Score
 * and Reason (don't exist in v2) and Assignees (needs the `.alert-actions` fold,
 * not on the view). `rule.id` stands in for the rule-name column (v2 has no name).
 * The ECS columns are extracted from `data` by the data hook.
 */
const DEFAULT_COLUMNS = [
  '@timestamp',
  'episode.status',
  'rule.id',
  'severity',
  'host.name',
  'user.name',
  'process.name',
  'file.name',
  'source.ip',
  'destination.ip',
];
const SAMPLE_SIZE = 100;
const GRID_HEIGHT = 500;
const DEFAULT_SORT: SortOrder[] = [['@timestamp', 'desc']];
const COLUMNS_STORAGE_KEY = 'securitySolution.alertsV2.episodesTableColumns';
const SORT_STORAGE_KEY = 'securitySolution.alertsV2.episodesTableSort';
const VIEW_DETAILS_LABEL = i18n.translate(
  'xpack.securitySolution.alertsV2.episodesTable.viewDetails',
  { defaultMessage: 'View details' }
);
const INVESTIGATE_IN_TIMELINE_LABEL = i18n.translate(
  'xpack.securitySolution.alertsV2.episodesTable.investigateInTimeline',
  { defaultMessage: 'Investigate in Timeline' }
);
const ANALYZE_EVENT_LABEL = i18n.translate(
  'xpack.securitySolution.alertsV2.episodesTable.analyzeEvent',
  { defaultMessage: 'Analyze event' }
);
const SESSION_VIEW_LABEL = i18n.translate(
  'xpack.securitySolution.alertsV2.episodesTable.openSessionView',
  { defaultMessage: 'Open Session View' }
);

/** Human-readable column headers, mirroring the v1 alerts table labels. */
const COLUMN_DISPLAY_NAMES: Record<string, string> = {
  '@timestamp': i18n.translate('xpack.securitySolution.alertsV2.episodesTable.columns.timestamp', {
    defaultMessage: 'Last seen',
  }),
  'episode.status': i18n.translate('xpack.securitySolution.alertsV2.episodesTable.columns.status', {
    defaultMessage: 'Status',
  }),
  'rule.id': i18n.translate('xpack.securitySolution.alertsV2.episodesTable.columns.rule', {
    defaultMessage: 'Rule',
  }),
  severity: i18n.translate('xpack.securitySolution.alertsV2.episodesTable.columns.severity', {
    defaultMessage: 'Severity',
  }),
  'host.name': i18n.translate('xpack.securitySolution.alertsV2.episodesTable.columns.host', {
    defaultMessage: 'Host name',
  }),
  'user.name': i18n.translate('xpack.securitySolution.alertsV2.episodesTable.columns.user', {
    defaultMessage: 'User name',
  }),
  'process.name': i18n.translate('xpack.securitySolution.alertsV2.episodesTable.columns.process', {
    defaultMessage: 'Process name',
  }),
  'file.name': i18n.translate('xpack.securitySolution.alertsV2.episodesTable.columns.file', {
    defaultMessage: 'File name',
  }),
  'source.ip': i18n.translate('xpack.securitySolution.alertsV2.episodesTable.columns.sourceIp', {
    defaultMessage: 'Source IP',
  }),
  'destination.ip': i18n.translate(
    'xpack.securitySolution.alertsV2.episodesTable.columns.destinationIp',
    { defaultMessage: 'Destination IP' }
  ),
};

const CUSTOM_GRID_COLUMNS_CONFIGURATION: CustomGridColumnsConfiguration = Object.fromEntries(
  Object.entries(COLUMN_DISPLAY_NAMES).map(([columnId, displayAsText]) => [
    columnId,
    ({ column }) => ({ ...column, displayAsText }),
  ])
);

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

  const [storedColumns, setStoredColumns] = useLocalStorage<string[]>(
    COLUMNS_STORAGE_KEY,
    DEFAULT_COLUMNS
  );
  const columns = storedColumns ?? DEFAULT_COLUMNS;
  const onSetColumns = useCallback(
    (nextColumns: string[]) => setStoredColumns(nextColumns),
    [setStoredColumns]
  );

  const [storedSort, setStoredSort] = useLocalStorage<SortOrder[]>(SORT_STORAGE_KEY, DEFAULT_SORT);
  const sort = storedSort ?? DEFAULT_SORT;
  const onSort = useCallback((nextSort: SortOrder[]) => setStoredSort(nextSort), [setStoredSort]);

  const { rows, columnsMeta, dataView, isLoading, error, inspect } = useEpisodesTableData(
    query,
    timeRange,
    sort
  );

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

  // Resolve rule.id (UUID) → rule name via the RnA rules-by-ids lookup.
  const ruleIds = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => String(row.flattened['rule.id'] ?? '')).filter(Boolean))
      ),
    [rows]
  );
  const { rulesCache } = useAlertingRulesCache({ ruleIds, services: { http: services.http } });

  const { openDocumentFlyoutFromHit, openRuleFlyout, openAnalyzer, openSessionView } =
    useFlyoutApi();

  const externalCustomRenderers = useMemo<CustomCellRenderer>(
    () => ({
      'episode.status': EpisodeStatusCell,
      severity: EpisodeSeverityCell,
      'host.name': HostNameCell,
      'user.name': UserNameCell,
      'source.ip': NetworkIpCell,
      'destination.ip': NetworkIpCell,
      // rule.id is a v2 rule UUID: show the resolved rule name and open the rule flyout on click.
      'rule.id': ({ row }) => {
        const ruleId = String(row.flattened['rule.id'] ?? '');
        if (!ruleId) {
          return <>{'—'}</>;
        }
        const name = rulesCache[ruleId]?.metadata?.name ?? ruleId;
        return (
          <EuiLink
            title={name}
            data-test-subj="alertsV2RuleNameLink"
            onClick={() => openRuleFlyout({ ruleId })}
          >
            {name}
          </EuiLink>
        );
      },
    }),
    [rulesCache, openRuleFlyout]
  );

  // Row actions. "View details" hands the episode DataTableRecord straight to the document flyout
  // (no `_id`/`_index` re-fetch). "Investigate in Timeline" opens Timeline's ES|QL tab scoped to the
  // episode id — only offered when the ES|QL advanced setting (which gates that tab) is on.
  const investigateEpisodeInTimeline = useInvestigateEpisodeInTimeline();
  const { isEsqlAdvancedSettingEnabled } = useEsqlAvailability();
  const rowAdditionalLeadingControls = useMemo<RowControlColumn[]>(() => {
    const controls: RowControlColumn[] = [
      {
        id: 'openDocumentFlyout',
        render: (Control, { record }) => (
          <Control
            data-test-subj="alertsV2OpenDocumentFlyout"
            iconType="maximize"
            label={VIEW_DETAILS_LABEL}
            tooltipContent={VIEW_DETAILS_LABEL}
            onClick={() => openDocumentFlyoutFromHit({ hit: record })}
          />
        ),
      },
      {
        id: 'openAnalyzer',
        render: (Control, { record }) => (
          <Control
            data-test-subj="alertsV2OpenAnalyzer"
            iconType="analyzeEvent"
            label={ANALYZE_EVENT_LABEL}
            tooltipContent={ANALYZE_EVENT_LABEL}
            onClick={() => openAnalyzer({ hit: record })}
          />
        ),
      },
      {
        id: 'openSessionView',
        render: (Control, { record }) => (
          <Control
            data-test-subj="alertsV2OpenSessionView"
            iconType="sessionViewer"
            label={SESSION_VIEW_LABEL}
            tooltipContent={SESSION_VIEW_LABEL}
            onClick={() => openSessionView({ hit: record })}
          />
        ),
      },
    ];
    if (isEsqlAdvancedSettingEnabled) {
      controls.push({
        id: 'investigateInTimeline',
        render: (Control, { record }) => (
          <Control
            data-test-subj="alertsV2InvestigateInTimeline"
            iconType="timeline"
            label={INVESTIGATE_IN_TIMELINE_LABEL}
            tooltipContent={INVESTIGATE_IN_TIMELINE_LABEL}
            onClick={() =>
              investigateEpisodeInTimeline({
                episodeId: String(record.flattened['episode.id'] ?? ''),
                timestamp: String(record.flattened['@timestamp'] ?? ''),
              })
            }
          />
        ),
      });
    }
    return controls;
  }, [
    openDocumentFlyoutFromHit,
    openAnalyzer,
    openSessionView,
    isEsqlAdvancedSettingEnabled,
    investigateEpisodeInTimeline,
  ]);

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
            customGridColumnsConfiguration={CUSTOM_GRID_COLUMNS_CONFIGURATION}
            externalCustomRenderers={externalCustomRenderers}
            dataView={dataView}
            rows={rows}
            loadingState={isLoading ? DataLoadingState.loading : DataLoadingState.loaded}
            onSetColumns={onSetColumns}
            sort={sort}
            onSort={onSort}
            sampleSizeState={SAMPLE_SIZE}
            showTimeCol={false}
            isPlainRecord
            isSortEnabled
            isInMemorySortEnabled={false}
            controlColumnIds={[]}
            rowAdditionalLeadingControls={rowAdditionalLeadingControls}
            visibleRowLeadingControls={rowAdditionalLeadingControls.length}
            services={tableServices}
          />
        </div>
      )}
    </EuiPanel>
  );
};
