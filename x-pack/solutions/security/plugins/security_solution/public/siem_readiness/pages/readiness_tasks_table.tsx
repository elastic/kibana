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
  EuiIcon,
} from '@elastic/eui';
import type { SiemReadinessTask, ReadinessTaskConfig, ReadinessTaskId } from '@kbn/siem-readiness';
import { useReadinessTasks, READINESS_TASKS } from '@kbn/siem-readiness';
import { usePillarProps } from '../hooks/use_pillar_props';

import illustration_aerospace from '../assets/illustration_aerospace.svg';
import illustration_packed_box from '../assets/illustration_packed_box.svg';
import illustration_cloud_rocket from '../assets/illustration_cloud_rocket.svg';
import illustration_monitor_cogs from '../assets/illustration_monitor_cogs.svg';
import illustration_on_prem from '../assets/illustration_on_prem.svg';
import illustration_cloud_cog from '../assets/illustration_cloud_cog.svg';
import illustration_checklist_doc from '../assets/illustration_checklist_doc.svg';
import illustration_cloud_services from '../assets/illustration_cloud_services.svg';
import illustration_file_monitoring from '../assets/illustration_file_monitoring.svg';
import illustration_malware_bug from '../assets/illustration_malware_bug.svg';
import illustration_network_activity from '../assets/illustration_network_activity.svg';
import illustration_insights_files from '../assets/illustration_insights_files.svg';
import illustration_asset_visibility from '../assets/illustration_asset_visibility.svg';
import illustration_magnify_glass from '../assets/illustration_magnify_glass.svg';
import illustration_megaphone from '../assets/illustration_megaphone.svg';
import illustration_machine_brain from '../assets/illustration_machine_brain.svg';
import illustration_projects_folder from '../assets/illustration_projects_folder.svg';
import illustration_right_arrows from '../assets/illustration_right_arrows.svg';
import illustration_organize_folders from '../assets/illustration_organize_folders.svg';

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

  const readinessTasksAddOnsMap: Record<
    ReadinessTaskId,
    { action?: () => void; actionButtonLabel?: string }
  > = useMemo(
    () => ({
      'lets-get-started': {
        action: () => handleLogTask({ task_id: 'lets-get-started', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
        illustration: illustration_aerospace,
      },
      'enable-endpoint-visibility': {
        action: () => handleLogTask({ task_id: 'enable-endpoint-visibility', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
        illustration: illustration_packed_box,
      },
      'ingest-cloud-audit-logs': {
        action: () => handleLogTask({ task_id: 'ingest-cloud-audit-logs', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
        illustration: illustration_cloud_rocket,
      },
      'ingest-asset-inventory': {
        action: () => handleLogTask({ task_id: 'ingest-asset-inventory', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
        illustration: illustration_monitor_cogs,
      },
      'enable-kubernetes-container-logs': {
        action: () =>
          handleLogTask({ task_id: 'enable-kubernetes-container-logs', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
        illustration: illustration_on_prem,
      },
      'ingest-all-cloud-logs-inventory': {
        action: () =>
          handleLogTask({ task_id: 'ingest-all-cloud-logs-inventory', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
        illustration: illustration_cloud_cog,
      },
      'enable-mitre-aligned-detection-rules': {
        action: () =>
          handleLogTask({ task_id: 'enable-mitre-aligned-detection-rules', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
        illustration: illustration_checklist_doc,
      },
      'view-detection-coverage-mitre': {
        action: () =>
          handleLogTask({ task_id: 'view-detection-coverage-mitre', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
        illustration: illustration_insights_files,
      },
      'add-threat-intel-feeds': {
        action: () => handleLogTask({ task_id: 'add-threat-intel-feeds', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
        illustration: illustration_malware_bug,
      },
      'customize-create-rules': {
        action: () => handleLogTask({ task_id: 'customize-create-rules', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
        illustration: illustration_file_monitoring,
      },
      'use-attack-discovery': {
        action: () => handleLogTask({ task_id: 'use-attack-discovery', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
        illustration: illustration_network_activity,
      },
      'maintain-rule-coverage': {
        action: () => handleLogTask({ task_id: 'maintain-rule-coverage', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
        illustration: illustration_asset_visibility,
      },
      'enable-cspm-on-all-clouds': {
        action: () => handleLogTask({ task_id: 'enable-cspm-on-all-clouds', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
        illustration: illustration_cloud_services,
      },
      'investigate-alert-using-timeline': {
        action: () =>
          handleLogTask({ task_id: 'investigate-alert-using-timeline', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
        illustration: illustration_magnify_glass,
      },
      'use-ai-assistant-for-alert-root-cause': {
        action: () =>
          handleLogTask({ task_id: 'use-ai-assistant-for-alert-root-cause', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
        illustration: illustration_machine_brain,
      },
      'add-external-connectors': {
        action: () => handleLogTask({ task_id: 'add-external-connectors', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
        illustration: illustration_megaphone,
      },
      'automate-response-rules-case-creation': {
        action: () =>
          handleLogTask({ task_id: 'automate-response-rules-case-creation', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
        illustration: illustration_right_arrows,
      },
      'create-manage-case-workflows': {
        action: () =>
          handleLogTask({ task_id: 'create-manage-case-workflows', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
        illustration: illustration_projects_folder,
      },
      'complete-automated-cases': {
        action: () => handleLogTask({ task_id: 'complete-automated-cases', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
        illustration: illustration_organize_folders,
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
          const taskAddOn = readinessTasksAddOnsMap[task.id] || {};
          const taskData = getLatestTasks.data?.find(
            (latestTaskData) => latestTaskData.task_id === task.id
          );
          const taskPillar = pillars[task.pillar];

          return (
            <EuiAccordion
              css={{
                backgroundColor: euiTheme.colors.plainLight,
                margin: `${euiTheme.size.m} 0`,
                paddingRight: 6,
              }}
              borders="all"
              key={task.id}
              id={task.id}
              arrowDisplay="right"
              buttonContent={
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
                  <EuiFlexItem>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: euiTheme.size.s, fontWeight: 600 }}>
                        {'Category:'}
                      </span>
                      {taskPillar?.icon && (
                        <EuiIcon
                          type={taskPillar.icon}
                          size="m"
                          color={taskPillar.color}
                          style={{ marginRight: euiTheme.size.s }}
                        />
                      )}
                      <span style={{ marginRight: euiTheme.size.m }}>
                        {taskPillar?.displayName}
                      </span>
                      <span style={{ fontWeight: 600, marginRight: 4 }}>{`Task:`}</span>
                      <span>{`${task.taskNumber}. ${task.title}`}</span>
                    </div>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
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
                  <EuiBadge color={taskData?.status === 'completed' ? 'success' : '#FDE9B5'}>
                    {taskData?.status || 'Incomplete'}
                  </EuiBadge>
                </div>
              }
            >
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiText size="s">
                    <p style={{ whiteSpace: 'pre-wrap' }}>{task.description}</p>
                  </EuiText>
                  {taskAddOn.actionButtonLabel && taskAddOn.action && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                      <EuiButton
                        size="s"
                        fill
                        onClick={() => taskAddOn.action?.()}
                        disabled={taskData?.status === 'completed'}
                      >
                        {taskAddOn.actionButtonLabel}
                      </EuiButton>
                    </div>
                  )}
                </EuiFlexItem>
                <EuiFlexItem grow={false} style={{ width: 128 }}>
                  <EuiIcon type={taskAddOn.illustration} style={{ width: 128, height: 128 }} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiAccordion>
          );
        })}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
