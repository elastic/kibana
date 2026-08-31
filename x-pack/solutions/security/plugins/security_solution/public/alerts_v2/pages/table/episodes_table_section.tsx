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
import { AlertEpisodeAssigneeCell } from '@kbn/alerting-v2-episodes-ui/components/assignee_cell';
import {
  createAckAction,
  createUnackAction,
  createResolveAction,
  createUnresolveAction,
  createEditTagsAction,
  createEditAssigneeAction,
  type EpisodeAction,
} from '@kbn/alerting-v2-episodes-ui/actions';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { useQueryClient } from '@kbn/react-query';
import type { RowControlColumn } from '@kbn/discover-utils';
import { SECURITY_EPISODE_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import { useWorkflowsCapabilities, useWorkflowsUIEnabledSetting } from '@kbn/workflows-ui';
import { APP_ID, DEFAULT_ALERT_TAGS_KEY } from '../../../../common/constants';
import { useKibana, useUiSetting$ } from '../../../common/lib/kibana';
import { EsqlInspectButton } from '../kpis/esql_inspect_button';
import { useEpisodesTableData } from './use_episodes_table_data';
import { HostNameCell } from './host_name_cell';
import { UserNameCell } from './user_name_cell';
import { NetworkIpCell } from './network_ip_cell';
import { useInvestigateEpisodeInTimeline } from './use_investigate_episode_in_timeline';
import { useEpisodeAssignees } from './use_episode_assignees';
import { EpisodeActionsMenu } from './episode_actions_menu';
import { EpisodeWorkflowsPanel } from './episode_workflows_panel';
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
  // `first_timestamp` (episode start) rather than `@timestamp`: the view's `@timestamp` is
  // `MAX(@timestamp)` over rule-events, which jumps to "now" when a lifecycle action (resolve/
  // unresolve) appends a synthetic rule-event. `first_timestamp` is `MIN(@timestamp)`, so it stays
  // pinned to when the alert actually fired — matching what Security users expect.
  'first_timestamp',
  'episode.status',
  'rule.id',
  'severity',
  // `assignees` isn't in the view; it's side-fetched from `.alert-actions` and rendered from a map.
  'assignees',
  'host.name',
  'user.name',
  'process.name',
  'file.name',
  'source.ip',
  'destination.ip',
];
const SAMPLE_SIZE = 100;
const GRID_HEIGHT = 500;
const DEFAULT_SORT: SortOrder[] = [['first_timestamp', 'desc']];
// Bumped when the default column set changes so it takes effect over any persisted state (v2: the
// `@timestamp` → `first_timestamp` swap; v3: added the side-fetched `assignees` column).
const COLUMNS_STORAGE_KEY = 'securitySolution.alertsV2.episodesTableColumns.v3';
const SORT_STORAGE_KEY = 'securitySolution.alertsV2.episodesTableSort.v2';
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
const NOTES_LABEL = i18n.translate('xpack.securitySolution.alertsV2.episodesTable.notes', {
  defaultMessage: 'Add note',
});
const ADD_TO_NEW_CASE_LABEL = i18n.translate(
  'xpack.securitySolution.alertsV2.episodesTable.addToNewCase',
  { defaultMessage: 'Add to new case' }
);
const ADD_TO_EXISTING_CASE_LABEL = i18n.translate(
  'xpack.securitySolution.alertsV2.episodesTable.addToExistingCase',
  { defaultMessage: 'Add to existing case' }
);

/** Human-readable column headers, mirroring the v1 alerts table labels. */
const COLUMN_DISPLAY_NAMES: Record<string, string> = {
  first_timestamp: i18n.translate(
    'xpack.securitySolution.alertsV2.episodesTable.columns.triggered',
    { defaultMessage: 'Triggered' }
  ),
  'episode.status': i18n.translate('xpack.securitySolution.alertsV2.episodesTable.columns.status', {
    defaultMessage: 'Status',
  }),
  'rule.id': i18n.translate('xpack.securitySolution.alertsV2.episodesTable.columns.rule', {
    defaultMessage: 'Rule',
  }),
  severity: i18n.translate('xpack.securitySolution.alertsV2.episodesTable.columns.severity', {
    defaultMessage: 'Severity',
  }),
  assignees: i18n.translate('xpack.securitySolution.alertsV2.episodesTable.columns.assignees', {
    defaultMessage: 'Assignee',
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

  const { rows, columnsMeta, dataView, isLoading, error, inspect, refetch } = useEpisodesTableData(
    query,
    timeRange,
    sort
  );

  // v2 status actions (ack/unack, resolve/unresolve): the RnA factories post to `.alert-actions`.
  // They only need http + notifications; on success we refetch (the view is eventually consistent).
  const statusActions = useMemo(() => {
    const deps = { http: services.http, notifications: services.notifications };
    return [
      createAckAction(deps),
      createUnackAction(deps),
      createResolveAction(deps),
      createUnresolveAction(deps),
    ];
  }, [services.http, services.notifications]);

  // Tags (series-scoped): the factory opens the RnA tags flyout, then posts a `tag` action. It needs
  // a heavier dep set (overlays/rendering/expressions/spaces for the flyout, queryClient for the tag
  // list) — all reachable here (services is CoreStart & plugins; the app wraps a react-query client).
  const queryClient = useQueryClient();
  // Reuse v1's preset tag vocabulary so v1 and v2 share the same tags (the flyout also still fetches
  // ES suggestions and allows new ones).
  const [presetAlertTags] = useUiSetting$<string[]>(DEFAULT_ALERT_TAGS_KEY);
  const editTagsAction = useMemo(
    () =>
      createEditTagsAction({
        http: services.http,
        overlays: services.overlays,
        notifications: services.notifications,
        rendering: services.rendering,
        expressions: services.expressions,
        spaces: services.spaces,
        queryClient,
        presetTags: presetAlertTags ?? [],
      }),
    [services, queryClient, presetAlertTags]
  );

  // Assignees (episode-scoped): the factory opens the RnA assignee picker, then posts an `assign`
  // action. Needs userProfile + docLinks (for the user picker) on top of the shared deps.
  const editAssigneeAction = useMemo(
    () =>
      createEditAssigneeAction({
        http: services.http,
        overlays: services.overlays,
        notifications: services.notifications,
        rendering: services.rendering,
        userProfile: services.userProfile,
        docLinks: services.docLinks,
        queryClient,
      }),
    [services, queryClient]
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

  // Add to case: attach an episode as a `security.episode` case attachment (comment + Episodes
  // table). We store display fields inline in `metadata` — the episode is an ES|QL projection with
  // no queryable doc — using the resolved rule name for the title.
  // Run workflow: gated on the workflows UI setting + execute capability. The nested selector panel
  // is built per-row (from the source event the episode wraps).
  const { canExecuteWorkflow } = useWorkflowsCapabilities();
  const workflowUIEnabled = useWorkflowsUIEnabledSetting();
  const canRunWorkflow = workflowUIEnabled && canExecuteWorkflow;

  const casesUi = services.cases;
  const userCasesPermissions = casesUi.helpers.canUseCases([APP_ID]);
  // The unified attachment framework (and thus the `security.episode` type) is gated behind
  // `xpack.cases.attachments.enabled`; there's no legacy fallback for episodes, so we only offer
  // "Add to case" when it's on.
  const attachmentsEnabled = casesUi.config.attachmentsEnabled;
  const createCaseFlyout = casesUi.hooks.useCasesAddToNewCaseFlyout({});
  const selectCaseModal = casesUi.hooks.useCasesAddToExistingCaseModal();
  const buildEpisodeCaseAttachments = useCallback(
    (episodes: AlertEpisode[]): CaseAttachmentsWithoutOwner =>
      episodes.map((episode) => {
        const ep = episode as unknown as Record<string, unknown>;
        const ruleId = String(ep['rule.id'] ?? '');
        return {
          type: SECURITY_EPISODE_ATTACHMENT_TYPE,
          attachmentId: String(ep['episode.id'] ?? ''),
          metadata: {
            title: rulesCache[ruleId]?.metadata?.name ?? ruleId,
            ruleId,
            status: String(ep['episode.status'] ?? ''),
            severity: ep.severity != null ? String(ep.severity) : null,
            triggeredAt: ep.first_timestamp != null ? String(ep.first_timestamp) : null,
          },
        };
      }),
    [rulesCache]
  );
  const addToCaseActions = useMemo<EpisodeAction[]>(() => {
    if (!attachmentsEnabled || !(userCasesPermissions.createComment && userCasesPermissions.read)) {
      return [];
    }
    return [
      {
        id: 'ALERTS_V2_ADD_TO_NEW_CASE',
        order: 60,
        displayName: ADD_TO_NEW_CASE_LABEL,
        iconType: 'plusInCircle',
        isCompatible: () => true,
        execute: async ({ episodes }) =>
          createCaseFlyout.open({ attachments: buildEpisodeCaseAttachments(episodes) }),
      },
      {
        id: 'ALERTS_V2_ADD_TO_EXISTING_CASE',
        order: 61,
        displayName: ADD_TO_EXISTING_CASE_LABEL,
        iconType: 'folderOpen',
        isCompatible: () => true,
        execute: async ({ episodes }) =>
          selectCaseModal.open({ getAttachments: () => buildEpisodeCaseAttachments(episodes) }),
      },
    ];
  }, [
    attachmentsEnabled,
    userCasesPermissions,
    createCaseFlyout,
    selectCaseModal,
    buildEpisodeCaseAttachments,
  ]);

  // Everything the per-row "…" (More actions) menu offers — v2 mutations plus add-to-case, ordered
  // by `order`. Mirrors the v1 alerts table's per-row take-action menu.
  const episodeActions = useMemo(
    () => [...statusActions, editTagsAction, editAssigneeAction, ...addToCaseActions],
    [statusActions, editTagsAction, editAssigneeAction, addToCaseActions]
  );

  // Side-fetch the current assignee per visible episode (the view doesn't carry it).
  const episodeIds = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => String(row.flattened['episode.id'] ?? '')).filter(Boolean))
      ),
    [rows]
  );
  const { assignees: assigneesByEpisode, refetch: refetchAssignees } =
    useEpisodeAssignees(episodeIds);

  // After a mutation, refresh the table (rows) and the side-fetched assignees together — an `assign`
  // doesn't change the visible episode set, so the assignees lookup needs an explicit re-run.
  const refetchAll = useCallback(() => {
    refetch();
    refetchAssignees();
  }, [refetch, refetchAssignees]);

  // The synthetic `assignees` column isn't in the ES|QL result, so give the grid a type for it
  // (the grid renders any column in `columns`; without a meta entry it has no type to fall back on).
  const gridColumnsMeta = useMemo(
    () => ({ ...columnsMeta, assignees: { type: 'string' as const } }),
    [columnsMeta]
  );

  const { openDocumentFlyoutFromHit, openRuleFlyout, openAnalyzer, openSessionView, openNotes } =
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
      // `assignees` is a synthetic column (not in the ES|QL result); the value comes from the
      // side-fetched map, keyed by episode.id. The cell resolves the uid → user profile itself.
      assignees: ({ row }) => (
        <AlertEpisodeAssigneeCell
          assigneeUid={assigneesByEpisode.get(String(row.flattened['episode.id'] ?? '')) ?? undefined}
          userProfile={services.userProfile}
        />
      ),
    }),
    [rulesCache, openRuleFlyout, assigneesByEpisode, services.userProfile]
  );

  // Row actions. "View details" hands the episode DataTableRecord straight to the document flyout
  // (no `_id`/`_index` re-fetch). "Investigate in Timeline" opens Timeline's ES|QL tab scoped to the
  // episode id — only offered when the ES|QL advanced setting (which gates that tab) is on.
  const investigateEpisodeInTimeline = useInvestigateEpisodeInTimeline();
  const { isEsqlAdvancedSettingEnabled } = useEsqlAvailability();
  const rowAdditionalLeadingControls = useMemo<RowControlColumn[]>(() => {
    const controls: RowControlColumn[] = [
      {
        id: 'episodeActions',
        render: (Control, { record }) => (
          <EpisodeActionsMenu
            Control={Control}
            record={record}
            actions={episodeActions}
            onSuccess={refetchAll}
            renderRunWorkflowPanel={
              canRunWorkflow
                ? (closePopover) => (
                    <EpisodeWorkflowsPanel record={record} onClose={closePopover} />
                  )
                : undefined
            }
          />
        ),
      },
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
      {
        id: 'openNotes',
        render: (Control, { record }) => (
          <Control
            data-test-subj="alertsV2OpenNotes"
            iconType="comment"
            label={NOTES_LABEL}
            tooltipContent={NOTES_LABEL}
            onClick={() => openNotes({ hit: record })}
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
                startTimestamp: String(record.flattened.first_timestamp ?? ''),
                endTimestamp: String(record.flattened['@timestamp'] ?? ''),
              })
            }
          />
        ),
      });
    }
    return controls;
  }, [
    episodeActions,
    refetchAll,
    canRunWorkflow,
    openDocumentFlyoutFromHit,
    openAnalyzer,
    openSessionView,
    openNotes,
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
            columnsMeta={gridColumnsMeta}
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
