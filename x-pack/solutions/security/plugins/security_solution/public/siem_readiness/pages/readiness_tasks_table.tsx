/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiTitle,
  EuiSuperSelect,
  EuiAccordion,
  EuiText,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiSplitPanel,
  useEuiTheme,
  EuiIcon,
  EuiFilterGroup,
  EuiFilterButton,
  EuiNotificationBadge,
  type IconType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SiemReadinessTask, ReadinessTaskConfig, ReadinessTaskId } from '@kbn/siem-readiness';
import { useReadinessTasks, READINESS_TASKS } from '@kbn/siem-readiness';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { usePillarsProps } from '../hooks/use_pillar_props';

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

// Color constants
const INCOMPLETE_BADGE_COLOR = '#FDE9B5';
const COMPLETED_BADGE_COLOR = '#4DD2CA';

const PANEL_HEIGHT = 600;
const ILLUSTRATION_SIZE = 128;
const FILTER_WIDTH = 150; // Width for longest filter label

export const ReadinessTasksTable: React.FC = () => {
  const [selectedPillar, setSelectedPillar] = useLocalStorage<string>(
    'readiness-tasks-selected-pillar',
    ''
  );
  const [statusFilter, setStatusFilter] = useLocalStorage<'completed' | 'incomplete' | null>(
    'readiness-tasks-status-filter',
    null
  );

  const { pillarPropsMap } = usePillarsProps();
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
      {
        value: '',
        inputDisplay: i18n.translate('xpack.securitySolution.siemReadiness.allCategoriesOption', {
          defaultMessage: 'All Categories',
        }),
      },
      ...Object.values(pillarPropsMap).map((pillar) => ({
        value: pillar.pillarKey,
        inputDisplay: pillar.displayName,
      })),
    ],
    [pillarPropsMap]
  );

  const filteredTasks = useMemo(
    () =>
      READINESS_TASKS.filter(
        (task: ReadinessTaskConfig) => !selectedPillar || task.pillar === selectedPillar
      )
        .filter((task: ReadinessTaskConfig) => {
          const taskData = getLatestTasks.data?.find(
            (latestTaskData) => latestTaskData.task_id === task.id
          );
          if (statusFilter === 'completed') {
            return taskData?.status === 'completed';
          }
          if (statusFilter === 'incomplete') {
            return taskData?.status !== 'completed';
          }
          return true;
        })
        .sort((a: ReadinessTaskConfig, b: ReadinessTaskConfig) => a.order - b.order),
    [selectedPillar, statusFilter, getLatestTasks.data]
  );

  const taskCounts = useMemo(() => {
    const allTasks = READINESS_TASKS.filter(
      (task: ReadinessTaskConfig) => !selectedPillar || task.pillar === selectedPillar
    );

    const completedCount = allTasks.filter((task) => {
      const taskData = getLatestTasks.data?.find(
        (latestTaskData) => latestTaskData.task_id === task.id
      );
      return taskData?.status === 'completed';
    }).length;

    const incompleteCount = allTasks.length - completedCount;

    return { completed: completedCount, incomplete: incompleteCount };
  }, [selectedPillar, getLatestTasks.data]);

  const readinessTasksAddOnsMap: Record<
    ReadinessTaskId,
    {
      action?: () => void;
      actionButtonLabel?: string;
      illustration: IconType;
      learnMoreLink?: string;
    }
  > = useMemo(
    () => ({
      'lets-get-started': {
        action: () => handleLogTask({ task_id: 'lets-get-started', status: 'completed' }),
        actionButtonLabel: 'Complete Task',
        illustration: illustration_aerospace,
        learnMoreLink: 'https://www.elastic.co/security-readiness',
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

  const taskStatusFilters = useMemo(
    () => [
      {
        key: 'incomplete',
        label: i18n.translate('xpack.securitySolution.siemReadiness.incompleteFilter', {
          defaultMessage: 'Incomplete',
        }),
        count: taskCounts.incomplete,
        isActive: statusFilter === 'incomplete',
        onClick: () => {
          setStatusFilter(statusFilter === 'incomplete' ? null : 'incomplete');
        },
        withNext: true,
      },
      {
        key: 'completed',
        label: i18n.translate('xpack.securitySolution.siemReadiness.completeFilter', {
          defaultMessage: 'Complete',
        }),
        count: taskCounts.completed,
        isActive: statusFilter === 'completed',
        onClick: () => {
          setStatusFilter(statusFilter === 'completed' ? null : 'completed');
        },
        withNext: false,
      },
    ],
    [statusFilter, taskCounts.completed, taskCounts.incomplete, setStatusFilter]
  );

  return (
    <EuiSplitPanel.Outer hasBorder hasShadow={false} css={{ height: PANEL_HEIGHT }}>
      <EuiSplitPanel.Inner grow={false} css={{ width: '100%' }}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3>
                {i18n.translate('xpack.securitySolution.siemReadiness.tasksTitle', {
                  defaultMessage: 'Tasks',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiFilterGroup>
                  {taskStatusFilters.map((filter) => (
                    <EuiFilterButton
                      key={filter.key}
                      withNext={filter.withNext}
                      hasActiveFilters={filter.isActive}
                      isSelected={filter.isActive}
                      onClick={filter.onClick}
                      isToggle
                      data-test-subj={`${filter.key}FilterButton`}
                    >
                      <EuiFlexGroup gutterSize="xs" alignItems="center">
                        <EuiFlexItem grow={false}>{filter.label}</EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiNotificationBadge color="subdued">
                            {filter.count}
                          </EuiNotificationBadge>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFilterButton>
                  ))}
                </EuiFilterGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSuperSelect
                  css={{ width: FILTER_WIDTH }}
                  options={selectOptions}
                  valueOfSelected={selectedPillar}
                  onChange={(value) => setSelectedPillar(value)}
                  placeholder={i18n.translate(
                    'xpack.securitySolution.siemReadiness.categoriesPlaceholder',
                    {
                      defaultMessage: 'Categories',
                    }
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner grow color="subdued" css={{ overflowY: 'auto' }}>
        {filteredTasks.map((task: ReadinessTaskConfig) => {
          const taskAddOn = readinessTasksAddOnsMap[task.id] || {};
          const taskData = getLatestTasks.data?.find(
            (latestTaskData) => latestTaskData.task_id === task.id
          );
          const taskPillar = pillarPropsMap[task.pillar];

          return (
            <EuiAccordion
              css={{
                backgroundColor: euiTheme.colors.plainLight,
                margin: `${euiTheme.size.m} 0`,
                paddingRight: euiTheme.size.s,
              }}
              borders="all"
              key={task.id}
              id={task.id}
              arrowDisplay="right"
              buttonContent={
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
                  <EuiFlexItem>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span
                        style={{
                          marginRight: euiTheme.size.s,
                          fontWeight: euiTheme.font.weight.bold,
                        }}
                      >
                        {i18n.translate('xpack.securitySolution.siemReadiness.categoryLabel', {
                          defaultMessage: 'Category:',
                        })}
                      </span>
                      {taskPillar?.icon && (
                        <EuiIcon
                          type={taskPillar.icon}
                          size="m"
                          color={taskPillar.color}
                          css={{ marginRight: euiTheme.size.s }}
                        />
                      )}
                      <span style={{ marginRight: euiTheme.size.m }}>
                        {taskPillar?.displayName}
                      </span>
                      <span
                        style={{
                          fontWeight: euiTheme.font.weight.bold,
                          marginRight: euiTheme.size.s,
                        }}
                      >
                        {i18n.translate('xpack.securitySolution.siemReadiness.taskLabel', {
                          defaultMessage: 'Task:',
                        })}
                      </span>
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
                  <EuiBadge
                    color={
                      taskData?.status === 'completed'
                        ? COMPLETED_BADGE_COLOR
                        : INCOMPLETE_BADGE_COLOR
                    }
                  >
                    {taskData?.status === 'completed'
                      ? i18n.translate('xpack.securitySolution.siemReadiness.completedStatus', {
                          defaultMessage: 'Completed',
                        })
                      : i18n.translate('xpack.securitySolution.siemReadiness.incompleteStatus', {
                          defaultMessage: 'Incomplete',
                        })}
                  </EuiBadge>
                </div>
              }
            >
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiFlexGroup direction="column">
                    <EuiFlexItem>
                      <EuiText size="s">
                        <p style={{ whiteSpace: 'pre-wrap' }}>{task.description}</p>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem
                      style={{
                        justifyContent: 'flex-start',
                        alignItems: 'flex-end',
                        flexDirection: 'row',
                        gap: euiTheme.size.s,
                      }}
                    >
                      {taskAddOn.actionButtonLabel && taskAddOn.action && (
                        <EuiButton
                          size="s"
                          fill
                          onClick={() => taskAddOn.action?.()}
                          disabled={taskData?.status === 'completed'}
                        >
                          {taskAddOn.actionButtonLabel}
                        </EuiButton>
                      )}
                      {taskAddOn.learnMoreLink && (
                        <EuiButtonEmpty
                          iconType="popout"
                          size="s"
                          onClick={() => window.open(taskAddOn.learnMoreLink, '_blank')}
                        >
                          {i18n.translate('xpack.securitySolution.siemReadiness.learnMoreButton', {
                            defaultMessage: 'Learn More',
                          })}
                        </EuiButtonEmpty>
                      )}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false} css={{ width: ILLUSTRATION_SIZE }}>
                  <EuiIcon
                    type={taskAddOn.illustration}
                    css={{ width: ILLUSTRATION_SIZE, height: ILLUSTRATION_SIZE }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiAccordion>
          );
        })}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
