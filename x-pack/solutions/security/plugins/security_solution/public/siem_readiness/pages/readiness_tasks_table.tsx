/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiTitle,
  EuiSuperSelect,
  EuiAccordion,
  EuiText,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiSplitPanel,
  useEuiTheme,
} from '@elastic/eui';
import type { SiemReadinessTask, ReadinessTaskConfig, ReadinessTaskId } from '@kbn/siem-readiness';
import { useReadinessTasks, READINESS_TASKS } from '@kbn/siem-readiness';
import { usePillarProps } from '../hooks/use_pillar_props';

const PANEL_HEIGHT = 600; // px, adjust as needed

export const ReadinessTasksTable: React.FC = () => {
  const [selectedPillar, setSelectedPillar] = useState<string>('');

  const { pillars } = usePillarProps();
  const { euiTheme } = useEuiTheme();
  const { logReadinessTask, getLatestTasks } = useReadinessTasks();

  const handleLogTask = useCallback(
    async (task: SiemReadinessTask) => {
      logReadinessTask(task);
    },
    [logReadinessTask]
  );

  const selectOptions = useMemo(
    () => [
      { value: '', inputDisplay: 'All Categories' },
      ...Object.values(pillars).map((pillar) => ({
        value: pillar.value,
        inputDisplay: pillar.displayName,
      })),
    ],
    [pillars]
  );

  // Filter and sort tasks
  const filteredTasks = useMemo(
    () =>
      READINESS_TASKS.filter(
        (task: ReadinessTaskConfig) => !selectedPillar || task.pillar === selectedPillar
      ).sort((a: ReadinessTaskConfig, b: ReadinessTaskConfig) => a.order - b.order),
    [selectedPillar]
  );

  const readinessTasksActionsMap: Record<
    ReadinessTaskId,
    { action?: () => void; actionButtonLabel?: string }
  > = useMemo(
    () => ({
      'enable-endpoint-visibility': {
        action: () => handleLogTask({ task_id: 'enable-endpoint-visibility', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
      },
      'ingest-cloud-audit-logs': {
        action: () => handleLogTask({ task_id: 'ingest-cloud-audit-logs', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
      },
      'ingest-asset-inventory': {
        action: () => handleLogTask({ task_id: 'ingest-asset-inventory', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
      },
      'enable-kubernetes-container-logs': {
        action: () =>
          handleLogTask({ task_id: 'enable-kubernetes-container-logs', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
      },
      'ingest-all-cloud-logs-inventory': {
        action: () =>
          handleLogTask({ task_id: 'ingest-all-cloud-logs-inventory', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
      },
      'enable-mitre-aligned-detection-rules': {
        action: () =>
          handleLogTask({ task_id: 'enable-mitre-aligned-detection-rules', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
      },
      'view-detection-coverage-mitre': {
        action: () =>
          handleLogTask({ task_id: 'view-detection-coverage-mitre', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
      },
      'add-threat-intel-feeds': {
        action: () => handleLogTask({ task_id: 'add-threat-intel-feeds', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
      },
      'customize-create-rules': {
        action: () => handleLogTask({ task_id: 'customize-create-rules', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
      },
      'use-attack-discovery': {
        action: () => handleLogTask({ task_id: 'use-attack-discovery', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
      },
      'maintain-rule-coverage': {
        action: () => handleLogTask({ task_id: 'maintain-rule-coverage', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
      },
      'enable-cspm-on-all-clouds': {
        action: () => handleLogTask({ task_id: 'enable-cspm-on-all-clouds', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
      },
      'investigate-alert-using-timeline': {
        action: () =>
          handleLogTask({ task_id: 'investigate-alert-using-timeline', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
      },
      'use-ai-assistant-for-alert-root-cause': {
        action: () =>
          handleLogTask({ task_id: 'use-ai-assistant-for-alert-root-cause', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
      },
      'add-external-connectors': {
        action: () => handleLogTask({ task_id: 'add-external-connectors', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
      },
      'automate-response-rules-case-creation': {
        action: () =>
          handleLogTask({ task_id: 'automate-response-rules-case-creation', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
      },
      'create-manage-case-workflows': {
        action: () =>
          handleLogTask({ task_id: 'create-manage-case-workflows', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
      },
      'complete-automated-cases': {
        action: () => handleLogTask({ task_id: 'complete-automated-cases', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
      },
    }),
    [handleLogTask]
  );

  return (
    <EuiSplitPanel.Outer hasBorder hasShadow={false} css={{ height: PANEL_HEIGHT }}>
      <EuiSplitPanel.Inner grow={false} css={{ width: '100%' }}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3>{'Tasks'}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSuperSelect
              options={selectOptions}
              valueOfSelected={selectedPillar}
              onChange={(value) => setSelectedPillar(value)}
              placeholder="Categories"
              compressed
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner grow color="subdued" css={{ overflowY: 'auto' }}>
        {filteredTasks.map((task: ReadinessTaskConfig) => {
          const taskContent = readinessTasksActionsMap[task.id] || {};
          const taskData = getLatestTasks.data?.find(
            (latestTaskData) => latestTaskData.task_id === task.id
          );
          const taskPillar = pillars[task.pillar];

          return (
            <EuiAccordion
              css={{
                backgroundColor: euiTheme.colors.plainLight,
                margin: `${euiTheme.size.m} 0`,
              }}
              borders="all"
              key={task.id}
              id={task.id}
              buttonContent={task.title}
              paddingSize="l"
              initialIsOpen={false}
              buttonProps={{
                paddingSize: 'm',
              }}
              style={{
                borderRadius: euiTheme.border.radius.medium,
              }}
              extraAction={
                <div style={{ paddingRight: euiTheme.size.base }}>
                  <EuiBadge color={taskPillar?.color}>{taskPillar?.displayName}</EuiBadge>
                  <EuiBadge color={taskData?.status === 'completed' ? 'success' : 'warning'}>
                    {taskData?.status || 'incomplete'}
                  </EuiBadge>
                </div>
              }
            >
              <EuiText size="s">
                <p>{task.description}</p>
              </EuiText>
              {taskContent.actionButtonLabel && taskContent.action && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <EuiButton
                    size="s"
                    fill
                    onClick={() => taskContent.action?.()}
                    disabled={taskData?.status === 'completed'}
                  >
                    {taskContent.actionButtonLabel}
                  </EuiButton>
                </div>
              )}
            </EuiAccordion>
          );
        })}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
