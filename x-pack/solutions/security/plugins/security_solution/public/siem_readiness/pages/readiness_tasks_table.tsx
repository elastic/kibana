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
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiSplitPanel,
  EuiLoadingElastic,
} from '@elastic/eui';
import type { SiemReadinessTask, ReadinessTaskConfig } from '@kbn/siem-readiness';
import { useLogReadinessTask, READINESS_TASKS } from '@kbn/siem-readiness';
import { useGetLatestTasks } from '../hooks/use_get_latest_tasks';

const PILLARS = [
  { value: '', inputDisplay: 'All Categories' },
  { value: 'visibility', inputDisplay: 'Visibility' },
  { value: 'detection', inputDisplay: 'Detection' },
  { value: 'response', inputDisplay: 'Response' },
];

const PANEL_HEIGHT = 600; // px, adjust as needed

export const ReadinessTasksPanel: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { getLatestTasks } = useGetLatestTasks();
  const [selectedPillar, setSelectedPillar] = useState<string>('');
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

  console.log(getLatestTasks.data);

  const readinessTasksContentMap = {
    'enable-endpoint-visibility': {
      action: () => handleLogTask({ task_id: 'enable-endpoint-visibility', status: 'completed' }),
      buttonLabel: 'Complete Demo Task',
    },
    'ingest-cloud-audit-logs': {
      action: () =>
        handleLogTask({
          task_id: 'ingest-cloud-audit-logs',
          status: 'completed',
          meta: { test: 'demo' },
        }),
      buttonLabel: 'try to log invalid task',
    },
  };

  if (getLatestTasks.isLoading) {
    return <EuiLoadingElastic />;
  }

  return (
    <EuiSplitPanel.Outer hasBorder hasShadow={false} style={{ height: PANEL_HEIGHT }}>
      <EuiSplitPanel.Inner grow={false} style={{ width: '100%' }}>
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
      <EuiSplitPanel.Inner grow color="subdued" style={{ overflowY: 'auto' }}>
        {filteredTasks.map((task: ReadinessTaskConfig) => {
          const taskContent = readinessTasksContentMap[task.id] || {};
          const taskData = getLatestTasks.data?.find(
            (latestTaskData) => latestTaskData.task_id === task.id
          );

          return (
            <EuiAccordion
              css={{
                backgroundColor: 'white',
                margin: '12px 0',
              }}
              borders="all"
              key={task.id}
              id={task.id}
              buttonContent={task.id}
              paddingSize="l"
              initialIsOpen={false}
              buttonProps={{
                paddingSize: 'm',
              }}
              style={{
                borderRadius: '5px',
              }}
              extraAction={
                <div style={{ paddingRight: '16px' }}>
                  <EuiBadge>{task.pillar}</EuiBadge>
                  <EuiBadge color={taskData?.status === 'completed' ? 'success' : 'warning'}>
                    {taskData?.status || 'incomplete'}
                  </EuiBadge>
                </div>
              }
            >
              <EuiText size="s">
                <p>{task.id}</p>
              </EuiText>
              {taskContent.buttonLabel && taskContent.action && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <EuiButton size="s" fill onClick={() => taskContent.action()}>
                    {taskContent.buttonLabel}
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
