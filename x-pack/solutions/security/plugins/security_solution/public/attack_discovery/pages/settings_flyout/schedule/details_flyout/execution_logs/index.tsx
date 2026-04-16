/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { useAssistantContext } from '@kbn/elastic-assistant';
import type {
  AttackDiscoveryGeneration,
  AttackDiscoverySchedule,
} from '@kbn/elastic-assistant-common';

import { WorkflowExecutionDetailsFlyout } from '../../../../loading_callout/workflow_execution_details_flyout';
import { useGetAttackDiscoveryGenerations } from '../../../../use_get_attack_discovery_generations';
import * as i18n from './translations';

const DEFAULT_PAGE_SIZE = 20;
// Fetch enough runs to cover typical schedule usage; client-side filtered by rule_id
const FETCH_SIZE = 100;

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

  const [pageIndex, setPageIndex] = useState(0);
  // Store only the stable execution UUID instead of the full item so the flyout
  // always reads live data rather than a frozen snapshot.
  const [selectedExecutionUuid, setSelectedExecutionUuid] = useState<string | null>(null);

  const { data, isLoading, refetch } = useGetAttackDiscoveryGenerations({
    http,
    isAssistantEnabled: assistantAvailability.isAssistantEnabled,
    scheduled: true,
    size: FETCH_SIZE,
  });

  // Filter client-side to only show runs for this specific schedule
  const filteredItems = useMemo(() => {
    if (data == null) {
      return [];
    }

    return data.generations.filter((item) => item.source_metadata?.rule_id === schedule.id);
  }, [data, schedule.id]);

  // Resolve the selected item from live data so that status updates (e.g.
  // started → succeeded) are reflected in the flyout header without requiring
  // the user to close and reopen the flyout.
  const selectedItem = useMemo((): AttackDiscoveryGeneration | null => {
    if (selectedExecutionUuid == null || data == null) {
      return null;
    }

    return data.generations.find((g) => g.execution_uuid === selectedExecutionUuid) ?? null;
  }, [data, selectedExecutionUuid]);

  // Poll the generations list while the selected execution is still in progress
  // so that the flyout header reflects the latest status without a manual refresh.
  const isSelectedInProgress = selectedItem?.status === 'started';
  useEffect(() => {
    if (!isSelectedInProgress) {
      return;
    }

    const POLL_INTERVAL_MS = 10000;
    const interval = setInterval(() => {
      refetch();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isSelectedInProgress, refetch]);

  const paginatedItems = useMemo(() => {
    const start = pageIndex * DEFAULT_PAGE_SIZE;
    return filteredItems.slice(start, start + DEFAULT_PAGE_SIZE);
  }, [filteredItems, pageIndex]);

  const handlePageChange = useCallback(({ page }: Criteria<AttackDiscoveryGeneration>) => {
    if (page != null) {
      setPageIndex(page.index);
    }
  }, []);

  const handleViewDetails = useCallback((item: AttackDiscoveryGeneration) => {
    setSelectedExecutionUuid(item.execution_uuid);
  }, []);

  const handleCloseFlyout = useCallback(() => {
    setSelectedExecutionUuid(null);
  }, []);

  const workflowId = selectedItem?.workflow_id ?? null;
  const workflowRunId = selectedItem?.workflow_run_id ?? null;
  const workflowExecutions = selectedItem?.workflow_executions ?? null;

  const hasWorkflowData = useCallback(
    (generation: AttackDiscoveryGeneration): boolean =>
      generation.workflow_id != null || generation.workflow_executions != null,
    []
  );

  const columns = useMemo(
    (): EuiBasicTableColumn<AttackDiscoveryGeneration>[] => [
      {
        render: (item: AttackDiscoveryGeneration) =>
          hasWorkflowData(item) ? (
            <EuiToolTip
              content={i18n.EXECUTION_LOGS_VIEW_DETAILS}
              disableScreenReaderOutput
              position="top"
            >
              <EuiButtonIcon
                aria-label={i18n.EXECUTION_LOGS_VIEW_DETAILS}
                data-test-subj={`inspect-${item.execution_uuid}`}
                iconType="inspect"
                onClick={() => handleViewDetails(item)}
              />
            </EuiToolTip>
          ) : (
            <></>
          ),
        width: '40px',
      },
      {
        field: 'start',
        name: i18n.EXECUTION_LOGS_COLUMN_START,
        render: (start: string) => start,
      },
      {
        field: 'status',
        name: i18n.EXECUTION_LOGS_COLUMN_STATUS,
        render: (status: string) => status,
      },
    ],
    [handleViewDetails, hasWorkflowData]
  );

  return (
    <>
      <EuiTitle data-test-subj="executionLogsTitle" size="s">
        <h3>{i18n.EXECUTION_LOGS_TITLE}</h3>
      </EuiTitle>
      <EuiHorizontalRule />
      <EuiFlexGroup data-test-subj="executionEventLogs" direction="column">
        <EuiFlexItem>
          <EuiBasicTable
            data-test-subj="scheduleExecutionLogsTable"
            columns={columns}
            itemId="execution_uuid"
            items={paginatedItems}
            loading={isLoading}
            noItemsMessage={i18n.EXECUTION_LOGS_NO_ITEMS}
            pagination={{
              pageIndex,
              pageSize: DEFAULT_PAGE_SIZE,
              totalItemCount: filteredItems.length,
            }}
            onChange={handlePageChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {!isLoading && selectedItem != null && (
        <WorkflowExecutionDetailsFlyout
          alertsContextCount={selectedItem.alerts_context_count}
          discoveriesCount={selectedItem.discoveries}
          duplicatesDroppedCount={selectedItem.duplicates_dropped_count}
          executionUuid={selectedItem.execution_uuid}
          generatedCount={selectedItem.generated_count}
          generationEndTime={selectedItem.end}
          generationStatus={STATUS_TO_GENERATION_STATUS[selectedItem.status] ?? 'started'}
          hallucinationsFilteredCount={selectedItem.hallucinations_filtered_count}
          http={http}
          onClose={handleCloseFlyout}
          persistedCount={selectedItem.persisted_count}
          workflowExecutions={workflowExecutions}
          workflowId={workflowId}
          workflowRunId={workflowRunId}
        />
      )}
    </>
  );
});

ScheduleExecutionLogs.displayName = 'ScheduleExecutionLogs';
