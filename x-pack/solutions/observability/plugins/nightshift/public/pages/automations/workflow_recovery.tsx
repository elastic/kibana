/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../common/ebt_constants';
import { type Automation, useRepairAutomation } from '../../data/automations/use_automations';

interface WorkflowCheck {
  data?: { isWorkflowMissing: boolean };
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

const labels = {
  missing: i18n.translate('xpack.nightshift.automations.workflow.missingTitle', {
    defaultMessage: 'Workflow missing',
  }),
  explanation: i18n.translate('xpack.nightshift.automations.workflow.missingDescription', {
    defaultMessage:
      'The workflow used by this automation was deleted. Repair recreates it from the saved configuration and leaves the automation paused. Previous runs will no longer appear in its run history.',
  }),
  checking: i18n.translate('xpack.nightshift.automations.workflow.checkingAriaLabel', {
    defaultMessage: 'Checking backing workflow',
  }),
  unavailable: i18n.translate('xpack.nightshift.automations.workflow.unavailableTitle', {
    defaultMessage: 'Unable to verify backing workflow',
  }),
  repair: i18n.translate('xpack.nightshift.automations.workflow.repairButtonLabel', {
    defaultMessage: 'Repair',
  }),
  retry: i18n.translate('xpack.nightshift.automations.workflow.retryButtonLabel', {
    defaultMessage: 'Retry',
  }),
  disabled: i18n.translate('xpack.nightshift.automations.workflow.repairRequiredTooltip', {
    defaultMessage:
      'Repair the backing workflow before editing, running, enabling, or cloning this automation.',
  }),
};

export const getWorkflowRepairDisabledReason = (
  check: Pick<WorkflowCheck, 'data' | 'isLoading' | 'isError'>
): string | undefined => {
  if (check.isError) return labels.unavailable;
  if (check.isLoading || !check.data) return labels.checking;
  return check.data.isWorkflowMissing ? labels.disabled : undefined;
};

export const AutomationWorkflowWarning = ({
  automation,
  check,
  canManage,
  editDisabledReason,
}: {
  automation: Automation;
  check: WorkflowCheck;
  canManage: boolean;
  editDisabledReason?: string;
}) => {
  const repair = useRepairAutomation();
  if (check.isLoading) return <EuiLoadingSpinner size="s" aria-label={labels.checking} />;
  const missing = check.data?.isWorkflowMissing;
  if (!check.isError && !missing) return null;
  return (
    <>
      <KbnWarningCallout
        title={check.isError ? labels.unavailable : labels.missing}
        text={check.isError ? undefined : labels.explanation}
        data-test-subj="automationWorkflowWarning"
        actionProps={{
          primary: {
            children: check.isError ? labels.retry : labels.repair,
            iconType: check.isError ? 'refresh' : 'wrench',
            disabled: !check.isError && !canManage,
            title: check.isError ? undefined : editDisabledReason,
            isLoading: !check.isError && repair.isLoading,
            onClick: () => (check.isError ? check.refetch() : repair.mutate(automation)),
            'data-test-subj': check.isError ? 'retryAutomationWorkflow' : 'repairAutomation',
            ...getEbtProps({
              action: check.isError
                ? NIGHTSHIFT_EBT_ACTIONS.RETRY_AUTOMATION_WORKFLOW
                : NIGHTSHIFT_EBT_ACTIONS.REPAIR_AUTOMATION,
              element: NIGHTSHIFT_EBT_ELEMENTS.AUTOMATIONS_DETAIL_FLYOUT,
            }),
          },
        }}
      />
      <EuiSpacer size="s" />
    </>
  );
};
