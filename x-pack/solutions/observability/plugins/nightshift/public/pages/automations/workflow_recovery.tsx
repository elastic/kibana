/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getEbtProps } from '@kbn/ebt-click';
import { EuiBadge, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../common/ebt_constants';
import {
  type Automation,
  useRefreshAutomations,
  useRepairAutomation,
} from '../../data/automations/use_automations';

export const workflowRecoveryLabels = {
  needsRepair: i18n.translate('xpack.nightshift.automations.workflow.needsRepair', {
    defaultMessage: 'Needs repair',
  }),
  unknown: i18n.translate('xpack.nightshift.automations.workflow.unknown', {
    defaultMessage: 'Unable to verify backing workflow',
  }),
  deletedExplanation: i18n.translate('xpack.nightshift.automations.workflow.deletedDescription', {
    defaultMessage:
      'The workflow used by this automation was deleted. Repair recreates it from the saved automation configuration, preserving run history and the enabled or paused state. Repair the workflow to run or edit this automation. You can still pause or delete it.',
  }),
  outOfSyncExplanation: i18n.translate(
    'xpack.nightshift.automations.workflow.outOfSyncDescription',
    {
      defaultMessage:
        'The workflow’s enabled state no longer matches this automation. Repair restores the saved automation configuration and enabled or paused state, preserving run history. You can also pause the automation to keep the workflow disabled, or delete it.',
    }
  ),
  actionDisabled: i18n.translate('xpack.nightshift.automations.workflow.actionDisabledTooltip', {
    defaultMessage:
      'Repair the backing workflow before editing, running, enabling, or cloning this automation.',
  }),
  updating: i18n.translate('xpack.nightshift.automations.workflow.updatingLabel', {
    defaultMessage: 'Updating automation',
  }),
  updatingExplanation: i18n.translate('xpack.nightshift.automations.workflow.updatingTooltip', {
    defaultMessage: 'This automation is being updated. Try again shortly.',
  }),
  retry: i18n.translate('xpack.nightshift.automations.workflow.retry', {
    defaultMessage: 'Retry',
  }),
};

export const needsWorkflowRepair = (automation: Automation): boolean =>
  automation.backingWorkflow?.state === 'missing' ||
  automation.backingWorkflow?.state === 'out_of_sync';

export const getWorkflowRepairDisabledReason = (automation: Automation): string | undefined =>
  automation.backingWorkflow?.state === 'updating'
    ? workflowRecoveryLabels.updatingExplanation
    : needsWorkflowRepair(automation)
    ? workflowRecoveryLabels.actionDisabled
    : undefined;

export const getAutomationToggleDisabledReason = (automation: Automation): string | undefined =>
  automation.isEnabled && automation.backingWorkflow?.state !== 'updating'
    ? undefined
    : getWorkflowRepairDisabledReason(automation);

export const getRepairLabel = (automation: Automation): string =>
  automation.isEnabled
    ? i18n.translate('xpack.nightshift.automations.workflow.repairAndEnable', {
        defaultMessage: 'Repair and enable',
      })
    : i18n.translate('xpack.nightshift.automations.workflow.repair', {
        defaultMessage: 'Repair',
      });

export const AutomationWorkflowBadge = ({ automation }: { automation: Automation }) => {
  const refresh = useRefreshAutomations();
  if (automation.backingWorkflow?.state === 'updating') {
    return (
      <EuiBadge color="hollow" data-test-subj="automationWorkflowUpdating">
        {workflowRecoveryLabels.updating}
      </EuiBadge>
    );
  }
  if (needsWorkflowRepair(automation)) {
    return (
      <EuiBadge color="warning" data-test-subj="automationNeedsRepair">
        {workflowRecoveryLabels.needsRepair}
      </EuiBadge>
    );
  }
  if (automation.backingWorkflow?.state === 'unknown') {
    return (
      <>
        <EuiBadge color="hollow" data-test-subj="automationWorkflowUnknown">
          {workflowRecoveryLabels.unknown}
        </EuiBadge>
        <EuiButtonEmpty
          data-test-subj="nightshiftAutomationWorkflowBadgeButton"
          size="xs"
          {...getEbtProps({
            action: NIGHTSHIFT_EBT_ACTIONS.RETRY_AUTOMATION_WORKFLOW,
            element: NIGHTSHIFT_EBT_ELEMENTS.AUTOMATIONS_LIST,
          })}
          onClick={() => refresh()}
        >
          {workflowRecoveryLabels.retry}
        </EuiButtonEmpty>
      </>
    );
  }
  return null;
};

export const AutomationWorkflowWarning = ({
  automation,
  canManage,
  editDisabledReason,
}: {
  automation: Automation;
  canManage: boolean;
  editDisabledReason?: string;
}) => {
  const repair = useRepairAutomation();
  const refresh = useRefreshAutomations();
  const needsRepair = needsWorkflowRepair(automation);
  if (!needsRepair && automation.backingWorkflow?.state !== 'unknown') return null;
  return (
    <>
      <KbnWarningCallout
        title={needsRepair ? workflowRecoveryLabels.needsRepair : workflowRecoveryLabels.unknown}
        text={
          automation.backingWorkflow?.state === 'missing'
            ? workflowRecoveryLabels.deletedExplanation
            : automation.backingWorkflow?.state === 'out_of_sync'
            ? workflowRecoveryLabels.outOfSyncExplanation
            : undefined
        }
        data-test-subj="automationWorkflowWarning"
        actionProps={{
          primary: {
            children: needsRepair ? getRepairLabel(automation) : workflowRecoveryLabels.retry,
            iconType: needsRepair ? 'wrench' : 'refresh',
            disabled: needsRepair && !canManage,
            title: needsRepair ? editDisabledReason : undefined,
            isLoading: needsRepair && repair.isLoading,
            onClick: () => (needsRepair ? repair.mutate(automation) : refresh()),
            'data-test-subj': needsRepair ? 'repairAutomation' : undefined,
            ...getEbtProps({
              action: needsRepair
                ? NIGHTSHIFT_EBT_ACTIONS.REPAIR_AUTOMATION
                : NIGHTSHIFT_EBT_ACTIONS.RETRY_AUTOMATION_WORKFLOW,
              element: NIGHTSHIFT_EBT_ELEMENTS.AUTOMATIONS_DETAIL_FLYOUT,
            }),
          },
        }}
      />
      <EuiSpacer size="s" />
    </>
  );
};
