/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Criteria, OnTimeChangeProps } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiTitle,
} from '@elastic/eui';
import { useAssistantContext } from '@kbn/elastic-assistant';
import type {
  AttackDiscoveryGeneration,
  AttackDiscoverySchedule,
} from '@kbn/elastic-assistant-common';

import { getColumns } from './columns';
import type { ScheduleRunRow } from './types';
import { useGetScheduleExecutionLogs } from './use_get_schedule_execution_logs';
import { WorkflowExecutionDetailsFlyout } from '../../../../loading_callout/workflow_execution_details_flyout';
import { useGetAttackDiscoveryGenerations } from '../../../../use_get_attack_discovery_generations';
import { useKibana } from '../../../../../../common/lib/kibana';
import * as i18n from './translations';

const DEFAULT_DATE_END = 'now';
const DEFAULT_DATE_START = 'now-24h';
const DEFAULT_PAGE_SIZE = 20;
// Fetch enough generations to enrich typical schedule run history; correlated
// to runs client-side by execution UUID.
const FETCH_SIZE = 100;

interface CommonlyUsedRange {
  display: string;
  from: string;
  to: string;
}

const STATUS_TO_GENERATION_STATUS: Record<string, 'started' | 'succeeded' | 'failed'> = {
  failed: 'failed',
  started: 'started',
  succeeded: 'succeeded',
};

interface Props {
  schedule: AttackDiscoverySchedule;
}

export const ScheduleExecutionLogs: React.FC<Props> = React.memo(({ schedule }) => {
  const { assistantAvailability, http } = useAssistantContext();
  const { uiSettings } = useKibana().services;

  const [pageIndex, setPageIndex] = useState(0);
  // Store only the stable execution UUID instead of the full item so the flyout
  // always reads live data rather than a frozen snapshot.
  const [selectedExecutionUuid, setSelectedExecutionUuid] = useState<string | null>(null);

  // Date range shared by both fetches so every visible run can be enriched with
  // its generation (and therefore show the inspect icon) within the same window.
  const [dateStart, setDateStart] = useState<string>(DEFAULT_DATE_START);
  const [dateEnd, setDateEnd] = useState<string>(DEFAULT_DATE_END);

  const dateFormat = useMemo(() => uiSettings?.get('dateFormat'), [uiSettings]);
  const commonlyUsedRanges = useMemo(
    () =>
      (uiSettings?.get('timepicker:quickRanges') as CommonlyUsedRange[] | undefined)?.map(
        ({ display, from, to }) => ({
          end: to,
          label: display,
          start: from,
        })
      ) ?? [],
    [uiSettings]
  );

  // All runs for this schedule (including failures that produced no generation),
  // sourced from the Alerting Framework execution log and keyed by execution UUID.
  const {
    data: executionLogs,
    isLoading: isLoadingExecutionLogs,
    refetch: refetchExecutionLogs,
  } = useGetScheduleExecutionLogs({
    dateEnd,
    dateStart,
    http,
    isAssistantEnabled: assistantAvailability.isAssistantEnabled,
    ruleId: schedule.id,
  });

  // Generations used to enrich runs with workflow execution details. Correlated
  // to runs by execution UUID (generation.execution_uuid === executionLog.id).
  const {
    data: generationsData,
    isLoading: isLoadingGenerations,
    refetch: refetchGenerations,
  } = useGetAttackDiscoveryGenerations({
    end: dateEnd,
    http,
    isAssistantEnabled: assistantAvailability.isAssistantEnabled,
    scheduled: true,
    size: FETCH_SIZE,
    start: dateStart,
  });

  const generationsByExecutionUuid = useMemo(() => {
    const entries = (generationsData?.generations ?? []).map(
      (generation): [string, AttackDiscoveryGeneration] => [generation.execution_uuid, generation]
    );

    return new Map<string, AttackDiscoveryGeneration>(entries);
  }, [generationsData]);

  // Build a row per run, enriching with the matching generation when one exists.
  const rows = useMemo((): ScheduleRunRow[] => {
    if (executionLogs == null) {
      return [];
    }

    return executionLogs.map((executionLog) => ({
      executionUuid: executionLog.id,
      generation: generationsByExecutionUuid.get(executionLog.id),
      start: executionLog.timestamp,
      status: executionLog.status,
    }));
  }, [executionLogs, generationsByExecutionUuid]);

  // Resolve the selected generation from live data so that status updates (e.g.
  // started → succeeded) are reflected in the flyout header without requiring
  // the user to close and reopen the flyout.
  const selectedGeneration = useMemo((): AttackDiscoveryGeneration | null => {
    if (selectedExecutionUuid == null) {
      return null;
    }

    return generationsByExecutionUuid.get(selectedExecutionUuid) ?? null;
  }, [generationsByExecutionUuid, selectedExecutionUuid]);

  // Poll the generations list while the selected execution is still in progress
  // so that the flyout header reflects the latest status without a manual refresh.
  const isSelectedInProgress = selectedGeneration?.status === 'started';
  useEffect(() => {
    if (!isSelectedInProgress) {
      return;
    }

    const POLL_INTERVAL_MS = 10000;
    const interval = setInterval(() => {
      refetchExecutionLogs();
      refetchGenerations();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isSelectedInProgress, refetchExecutionLogs, refetchGenerations]);

  const paginatedItems = useMemo(() => {
    const start = pageIndex * DEFAULT_PAGE_SIZE;
    return rows.slice(start, start + DEFAULT_PAGE_SIZE);
  }, [pageIndex, rows]);

  const handlePageChange = useCallback(({ page }: Criteria<ScheduleRunRow>) => {
    if (page != null) {
      setPageIndex(page.index);
    }
  }, []);

  const handleViewDetails = useCallback((item: ScheduleRunRow) => {
    setSelectedExecutionUuid(item.executionUuid);
  }, []);

  const handleCloseFlyout = useCallback(() => {
    setSelectedExecutionUuid(null);
  }, []);

  const handleTimeChange = useCallback(({ end, isInvalid, start }: OnTimeChangeProps) => {
    if (isInvalid) {
      return;
    }

    setDateStart(start);
    setDateEnd(end);
    setPageIndex(0);
  }, []);

  const handleRefresh = useCallback(() => {
    refetchExecutionLogs();
    refetchGenerations();
  }, [refetchExecutionLogs, refetchGenerations]);

  const workflowId = selectedGeneration?.workflow_id ?? null;
  const workflowRunId = selectedGeneration?.workflow_run_id ?? null;
  const workflowExecutions = selectedGeneration?.workflow_executions ?? null;

  const columns = useMemo(() => getColumns(handleViewDetails), [handleViewDetails]);

  const isLoading = isLoadingExecutionLogs || isLoadingGenerations;

  return (
    <>
      <EuiTitle data-test-subj="executionLogsTitle" size="s">
        <h3>{i18n.EXECUTION_LOGS_TITLE}</h3>
      </EuiTitle>
      <EuiHorizontalRule />
      <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiSuperDatePicker
            commonlyUsedRanges={commonlyUsedRanges}
            data-test-subj="scheduleExecutionLogsDatePicker"
            dateFormat={dateFormat}
            end={dateEnd}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            onTimeChange={handleTimeChange}
            start={dateStart}
            width="auto"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup data-test-subj="executionEventLogs" direction="column">
        <EuiFlexItem>
          <EuiBasicTable
            data-test-subj="scheduleExecutionLogsTable"
            columns={columns}
            itemId="executionUuid"
            items={paginatedItems}
            loading={isLoading}
            noItemsMessage={i18n.EXECUTION_LOGS_NO_ITEMS}
            pagination={{
              pageIndex,
              pageSize: DEFAULT_PAGE_SIZE,
              totalItemCount: rows.length,
            }}
            tableCaption={i18n.EXECUTION_LOGS_TABLE_CAPTION}
            onChange={handlePageChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {!isLoading && selectedGeneration != null && (
        <WorkflowExecutionDetailsFlyout
          alertsContextCount={selectedGeneration.alerts_context_count}
          discoveriesCount={selectedGeneration.discoveries}
          duplicatesDroppedCount={selectedGeneration.duplicates_dropped_count}
          executionUuid={selectedGeneration.execution_uuid}
          generatedCount={selectedGeneration.generated_count}
          generationEndTime={selectedGeneration.end}
          generationStatus={STATUS_TO_GENERATION_STATUS[selectedGeneration.status] ?? 'started'}
          hallucinationsFilteredCount={selectedGeneration.hallucinations_filtered_count}
          http={http}
          onClose={handleCloseFlyout}
          persistedCount={selectedGeneration.persisted_count}
          workflowExecutions={workflowExecutions}
          workflowId={workflowId}
          workflowRunId={workflowRunId}
        />
      )}
    </>
  );
});

ScheduleExecutionLogs.displayName = 'ScheduleExecutionLogs';
