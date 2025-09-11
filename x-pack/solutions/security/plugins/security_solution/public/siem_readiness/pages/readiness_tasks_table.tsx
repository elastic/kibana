/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
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
  EuiLoadingElastic,
  useEuiTheme,
} from '@elastic/eui';
import type { SiemReadinessTask, ReadinessTaskConfig, ReadinessTaskId } from '@kbn/siem-readiness';
import { useLogReadinessTask, READINESS_TASKS } from '@kbn/siem-readiness';
import { useGetLatestTasks } from '../hooks/use_get_latest_tasks';

const PILLARS = [
  { value: '', inputDisplay: 'All Categories' },
  { value: 'visibility', inputDisplay: 'Visibility', badgeColor: '#61A2FF' },
  { value: 'detection', inputDisplay: 'Detection', badgeColor: '#EE72A6' },
  { value: 'response', inputDisplay: 'Response', badgeColor: '#16C5C0' },
];

const PANEL_HEIGHT = 600; // px, adjust as needed

export const ReadinessTasksTable: React.FC = () => {
  const [selectedPillar, setSelectedPillar] = useState<string>('');

  const { euiTheme } = useEuiTheme();
  const { getLatestTasks } = useGetLatestTasks();
  const { logReadinessTask } = useLogReadinessTask();

  const handleLogTask = useCallback(
    async (task: SiemReadinessTask) => {
      logReadinessTask(task);
    },
    [logReadinessTask]
  );

  // Filter and sort tasks
  const filteredTasks = READINESS_TASKS.filter(
    (task: ReadinessTaskConfig) => !selectedPillar || task.pillar === selectedPillar
  ).sort((a: ReadinessTaskConfig, b: ReadinessTaskConfig) => a.order - b.order);

  const readinessTasksActionsMap: Record<
    ReadinessTaskId,
    { action?: () => void; actionButtonLabel?: string }
  > = {
    'enable-endpoint-visibility': {
      action: () => handleLogTask({ task_id: 'enable-endpoint-visibility', status: 'completed' }),
      actionButtonLabel: 'Complete Demo Task',
    },
    'ingest-cloud-audit-logs': {
      action: () =>
        handleLogTask({
          task_id: 'ingest-cloud-audit-logs',
          status: 'completed',
          meta: { test: 'demo' }, // purposefully invalid meta to demonstrate validation
        }),
      actionButtonLabel: 'try to log invalid task',
    },
  };

  if (getLatestTasks.isLoading) {
    return <EuiLoadingElastic />;
  }

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
              options={PILLARS}
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
          const pillar = PILLARS.find((p) => p.value === task.pillar);

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
                  <EuiBadge color={pillar?.badgeColor}>{pillar?.inputDisplay}</EuiBadge>
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
                  <EuiButton size="s" fill onClick={() => taskContent.action?.()}>
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
