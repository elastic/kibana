/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Criteria, EuiBasicTableColumn, EuiTableSelectionType } from '@elastic/eui';
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
  type SignificantEventsWorkflowStatusResult,
} from '@kbn/significant-events-schema';
import React, { useState } from 'react';
import { useIsCpsMultiProject } from '@kbn/cps-utils';
import { useKibana } from '../../../../hooks/use_kibana';
import { KnowledgeIndicatorsColumn } from './knowledge_indicators_column';
import { QueriesColumn } from './queries_column';
import { SignificantEventsColumn } from './significant_events_column';
import { SourceActionsColumn } from './source_actions_column';
import {
  ACTIONS_COLUMN_HEADER,
  ENABLED_COLUMN_HEADER,
  KNOWLEDGE_INDICATORS_COLUMN_HEADER,
  NO_SOURCES_MESSAGE,
  ONBOARDING_STATUS_COLUMN_HEADER,
  QUERIES_COLUMN_HEADER,
  QUERY_COLUMN_HEADER,
  SIGNIFICANT_EVENTS_COLUMN_HEADER,
  SIGNIFICANT_EVENTS_COLUMN_TOOLTIP,
  SOURCES_TABLE_CAPTION,
  TITLE_COLUMN_HEADER,
} from './translations';
import { filterSourcesByQuery, getOnboardSourceTooltip } from './utils';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export function SourcesTable({
  loading,
  sources,
  onboardingResultMap,
  searchText,
  selection,
  blocksActivity = false,
  activityBlockTooltip,
  canManage,
  pendingEnabledSourceId,
  onOpenSource,
  onToggleSourceEnabled,
  onOnboardSource,
  onStopOnboarding,
  onDeleteSource,
}: {
  sources: NightshiftSource[];
  onboardingResultMap: Record<string, SignificantEventsWorkflowStatusResult>;
  loading?: boolean;
  searchText: string;
  selection?: EuiTableSelectionType<NightshiftSource>;
  /** When true, per-row onboard actions are disabled (global pause / status loading). */
  blocksActivity?: boolean;
  /** Explains why onboard actions are disabled (loading / error / paused). */
  activityBlockTooltip?: string;
  canManage: boolean;
  /** Source whose enable/disable request is in flight; its switch stays disabled until it settles. */
  pendingEnabledSourceId?: string;
  /** Opens the source flyout; it is read-only without `canManage`. */
  onOpenSource: (source: NightshiftSource) => void;
  onToggleSourceEnabled: (source: NightshiftSource, enabled: boolean) => void;
  onOnboardSource: (sourceId: string) => void;
  onStopOnboarding: (sourceId: string) => void;
  onDeleteSource: (source: NightshiftSource) => void;
}) {
  const {
    dependencies: {
      start: { cps },
    },
  } = useKibana();
  const isCpsMultiProject = useIsCpsMultiProject(cps?.cpsManager);
  const items = filterSourcesByQuery(sources, searchText);
  // Controlled: EuiInMemoryTable goes back to page 1 whenever `items` is a new array, which happens
  // after every toggle, save, delete or status poll. A new search still starts from page 1.
  const [page, setPage] = useState({ index: 0, size: PAGE_SIZE_OPTIONS[0], searchText });
  const lastPageIndex = Math.max(0, Math.ceil(items.length / page.size) - 1);
  const pageIndex = page.searchText === searchText ? Math.min(page.index, lastPageIndex) : 0;

  const onboardTooltip = getOnboardSourceTooltip({ activityBlockTooltip, isCpsMultiProject });

  const actionsColumn: EuiBasicTableColumn<NightshiftSource> = {
    name: ACTIONS_COLUMN_HEADER,
    width: '110px',
    render: (source: NightshiftSource) => (
      <SourceActionsColumn
        source={source}
        onboardingStatus={onboardingResultMap[source.id]?.status}
        blocksActivity={blocksActivity}
        onboardTooltip={onboardTooltip}
        onOnboard={onOnboardSource}
        onStopOnboarding={onStopOnboarding}
        onDelete={onDeleteSource}
      />
    ),
  };

  const columns: Array<EuiBasicTableColumn<NightshiftSource>> = [
    {
      field: 'title',
      name: TITLE_COLUMN_HEADER,
      sortable: true,
      render: (title: string, source: NightshiftSource) => (
        <EuiLink
          data-test-subj={`significantEventsAppSourcesTableTitleLink-${source.id}`}
          onClick={() => onOpenSource(source)}
        >
          <EuiHighlight search={searchText}>{title}</EuiHighlight>
        </EuiLink>
      ),
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
      items={items}
      columns={columns}
      loading={loading}
      selection={selection}
      noItemsMessage={NO_SOURCES_MESSAGE}
      sorting={{ sort: { field: 'title', direction: 'asc' } }}
      pagination={{ pageIndex, pageSize: page.size, pageSizeOptions: PAGE_SIZE_OPTIONS }}
      onTableChange={({ page: nextPage }: Criteria<NightshiftSource>) => {
        if (nextPage) {
          setPage({ index: nextPage.index, size: nextPage.size, searchText });
        }
      }}
    />
  );
}
