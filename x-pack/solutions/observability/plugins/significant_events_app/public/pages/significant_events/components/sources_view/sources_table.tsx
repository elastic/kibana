/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiBasicTableColumn,
  EuiTableActionsColumnType,
  EuiTableSelectionType,
  Query,
} from '@elastic/eui';
import {
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiIcon,
  EuiIconTip,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingSpinner,
  EuiSwitch,
} from '@elastic/eui';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import {
  SignificantEventsWorkflowStatus,
  KIS_ONBOARDING_IN_PROGRESS_STATUSES,
  type SignificantEventsWorkflowStatusResult,
} from '@kbn/significant-events-schema';
import React from 'react';
import { useIsCpsMultiProject } from '@kbn/cps-utils';
import { useKibana } from '../../../../hooks/use_kibana';
import { KnowledgeIndicatorsColumn } from './knowledge_indicators_column';
import { QueriesColumn } from './queries_column';
import { SignificantEventsColumn } from './significant_events_column';
import {
  ACTIONS_COLUMN_HEADER,
  DELETE_SOURCE_ACTION_DESCRIPTION,
  DELETE_SOURCE_ACTION_LABEL,
  EDIT_SOURCE_ACTION_LABEL,
  ENABLED_COLUMN_HEADER,
  KNOWLEDGE_INDICATORS_COLUMN_HEADER,
  NO_SOURCES_MESSAGE,
  ONBOARDING_STATUS_COLUMN_HEADER,
  QUERIES_COLUMN_HEADER,
  QUERY_COLUMN_HEADER,
  RESET_SOURCE_KNOWLEDGE_ACTION_DESCRIPTION,
  RESET_SOURCE_KNOWLEDGE_ACTION_LABEL,
  RUN_SOURCE_ONBOARDING_BUTTON_LABEL,
  SIGNIFICANT_EVENTS_COLUMN_HEADER,
  SIGNIFICANT_EVENTS_COLUMN_TOOLTIP,
  SOURCES_TABLE_CAPTION,
  STOP_SOURCE_ONBOARDING_BUTTON_LABEL,
  TITLE_COLUMN_HEADER,
} from './translations';
import { filterSourcesByQuery, getOnboardSourceTooltip } from './utils';

export function SourcesTable({
  loading,
  sources,
  onboardingResultMap,
  searchQuery,
  selection,
  blocksActivity = false,
  activityBlockTooltip,
  canManage,
  pendingEnabledSourceId,
  onEditSource,
  onToggleSourceEnabled,
  onOnboardSource,
  onStopOnboarding,
  onResetSourceKnowledge,
  onDeleteSource,
}: {
  sources: NightshiftSource[];
  onboardingResultMap: Record<string, SignificantEventsWorkflowStatusResult>;
  loading?: boolean;
  searchQuery: Query;
  selection?: EuiTableSelectionType<NightshiftSource>;
  /** When true, per-row onboard actions are disabled (global pause / status loading). */
  blocksActivity?: boolean;
  /** Explains why onboard actions are disabled (loading / error / paused). */
  activityBlockTooltip?: string;
  canManage: boolean;
  /** Source whose enable/disable request is in flight; its switch stays disabled until it settles. */
  pendingEnabledSourceId?: string;
  onEditSource: (source: NightshiftSource) => void;
  onToggleSourceEnabled: (source: NightshiftSource, enabled: boolean) => void;
  onOnboardSource: (sourceId: string) => void;
  onStopOnboarding: (sourceId: string) => void;
  onResetSourceKnowledge: (source: NightshiftSource) => void;
  onDeleteSource: (source: NightshiftSource) => void;
}) {
  const {
    dependencies: {
      start: { cps },
    },
  } = useKibana();
  const isCpsMultiProject = useIsCpsMultiProject(cps?.cpsManager);

  const isOnboardingInProgress = (source: NightshiftSource) =>
    KIS_ONBOARDING_IN_PROGRESS_STATUSES.has(onboardingResultMap[source.id]?.status);

  const actionsColumn: EuiTableActionsColumnType<NightshiftSource> = {
    name: ACTIONS_COLUMN_HEADER,
    width: '100px',
    actions: [
      {
        name: STOP_SOURCE_ONBOARDING_BUTTON_LABEL,
        description: STOP_SOURCE_ONBOARDING_BUTTON_LABEL,
        icon: 'stop',
        type: 'icon',
        isPrimary: true,
        'data-test-subj': 'significantEventsAppSourcesTableStopButton',
        available: isOnboardingInProgress,
        enabled: (source: NightshiftSource) =>
          onboardingResultMap[source.id]?.status !== SignificantEventsWorkflowStatus.BeingCanceled,
        onClick: (source: NightshiftSource) => onStopOnboarding(source.id),
      },
      {
        name: RUN_SOURCE_ONBOARDING_BUTTON_LABEL,
        description: getOnboardSourceTooltip({ activityBlockTooltip, isCpsMultiProject }),
        icon: 'radar',
        type: 'icon',
        isPrimary: true,
        'data-test-subj': 'significantEventsAppSourcesTableOnboardButton',
        available: (source: NightshiftSource) => !isOnboardingInProgress(source),
        // The onboarding route rejects disabled sources.
        enabled: (source: NightshiftSource) => source.enabled && !blocksActivity,
        onClick: (source: NightshiftSource) => onOnboardSource(source.id),
      },
      {
        name: EDIT_SOURCE_ACTION_LABEL,
        description: EDIT_SOURCE_ACTION_LABEL,
        icon: 'pencil',
        type: 'icon',
        'data-test-subj': 'significantEventsAppSourcesTableEditButton',
        onClick: onEditSource,
      },
      {
        name: RESET_SOURCE_KNOWLEDGE_ACTION_LABEL,
        description: RESET_SOURCE_KNOWLEDGE_ACTION_DESCRIPTION,
        icon: 'eraser',
        type: 'icon',
        'data-test-subj': 'significantEventsAppSourcesTableResetButton',
        onClick: onResetSourceKnowledge,
      },
      {
        name: DELETE_SOURCE_ACTION_LABEL,
        description: DELETE_SOURCE_ACTION_DESCRIPTION,
        icon: 'trash',
        type: 'icon',
        color: 'danger',
        'data-test-subj': 'significantEventsAppSourcesTableDeleteButton',
        onClick: onDeleteSource,
      },
    ],
  };

  const columns: Array<EuiBasicTableColumn<NightshiftSource>> = [
    {
      field: 'title',
      name: TITLE_COLUMN_HEADER,
      sortable: true,
      render: (title: string, source: NightshiftSource) => {
        const highlightedTitle = <EuiHighlight search={searchQuery.text}>{title}</EuiHighlight>;
        return canManage ? (
          <EuiLink
            data-test-subj={`significantEventsAppSourcesTableTitleLink-${source.id}`}
            onClick={() => onEditSource(source)}
          >
            {highlightedTitle}
          </EuiLink>
        ) : (
          highlightedTitle
        );
      },
    },
    {
      field: 'esql',
      name: QUERY_COLUMN_HEADER,
      truncateText: true,
      render: (esql: string) => (
        <EuiCode transparentBackground title={esql}>
          {esql}
        </EuiCode>
      ),
    },
    {
      field: 'enabled',
      name: ENABLED_COLUMN_HEADER,
      width: '90px',
      render: (enabled: boolean, source: NightshiftSource) => (
        <EuiSwitch
          data-test-subj={`significantEventsAppSourcesTableEnabledSwitch-${source.id}`}
          label={ENABLED_COLUMN_HEADER}
          showLabel={false}
          compressed
          checked={enabled}
          disabled={!canManage || pendingEnabledSourceId === source.id}
          onChange={(event) => onToggleSourceEnabled(source, event.target.checked)}
        />
      ),
    },
    {
      name: ONBOARDING_STATUS_COLUMN_HEADER,
      width: '120px',
      align: 'left',
      render: (source: NightshiftSource) => {
        const onboardingResult = onboardingResultMap[source.id];

        if (onboardingResult === undefined) {
          return '-';
        }

        switch (onboardingResult.status) {
          case SignificantEventsWorkflowStatus.InProgress:
          case SignificantEventsWorkflowStatus.BeingCanceled:
            return <EuiLoadingSpinner size="m" />;
          case SignificantEventsWorkflowStatus.NotStarted:
          case SignificantEventsWorkflowStatus.Canceled:
            return '-';
          case SignificantEventsWorkflowStatus.Completed:
            return <EuiIcon type="checkCircleFill" color="success" size="m" aria-hidden={true} />;
          case SignificantEventsWorkflowStatus.Failed:
            return (
              <EuiIconTip
                size="m"
                type="crossCircle"
                color="danger"
                content={onboardingResult.error}
              />
            );
        }
      },
    },
    {
      name: KNOWLEDGE_INDICATORS_COLUMN_HEADER,
      width: '120px',
      align: 'left',
      render: (source: NightshiftSource) => (
        <KnowledgeIndicatorsColumn
          sourceId={source.id}
          streamOnboardingResult={onboardingResultMap[source.id]}
        />
      ),
    },
    {
      name: QUERIES_COLUMN_HEADER,
      width: '120px',
      align: 'left',
      render: (source: NightshiftSource) => (
        <QueriesColumn
          streamName={source.id}
          streamOnboardingResult={onboardingResultMap[source.id]}
        />
      ),
    },
    {
      name: (
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>{SIGNIFICANT_EVENTS_COLUMN_HEADER}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              type="info"
              color="subdued"
              content={SIGNIFICANT_EVENTS_COLUMN_TOOLTIP}
              size="s"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      width: '210px',
      align: 'left',
      render: (source: NightshiftSource) => <SignificantEventsColumn streamName={source.id} />,
    },
    ...(canManage ? [actionsColumn] : []),
  ];

  return (
    <EuiInMemoryTable<NightshiftSource>
      data-test-subj="significantEventsAppSourcesTable"
      tableCaption={SOURCES_TABLE_CAPTION}
      itemId="id"
      items={filterSourcesByQuery(sources, searchQuery.text)}
      columns={columns}
      loading={loading}
      selection={selection}
      noItemsMessage={NO_SOURCES_MESSAGE}
      sorting={{ sort: { field: 'title', direction: 'asc' } }}
      pagination={{ initialPageSize: 25, pageSizeOptions: [25, 50, 100] }}
    />
  );
}
