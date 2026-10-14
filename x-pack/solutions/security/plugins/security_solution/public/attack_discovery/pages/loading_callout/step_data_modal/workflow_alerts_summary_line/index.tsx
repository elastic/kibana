/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiLink, EuiText } from '@elastic/eui';
import React from 'react';

import { useWorkflowEditorLink } from '../../../use_workflow_editor_link';
import * as i18n from '../translations';

export interface WorkflowRetrievalSummary {
  alertsCount: number | null;
  workflowId?: string;
  workflowName?: string;
  workflowRunId?: string;
}

interface WorkflowAlertsSummaryLineProps {
  alertsCount: number | null;
  workflowId?: string;
  workflowName?: string;
  workflowRunId?: string;
}

const WorkflowAlertsSummaryLineComponent: React.FC<WorkflowAlertsSummaryLineProps> = ({
  alertsCount,
  workflowId,
  workflowName,
  workflowRunId,
}) => {
  const { editorUrl } = useWorkflowEditorLink({
    workflowId: workflowId ?? null,
    workflowRunId: workflowRunId ?? null,
  });

  const alertsBadge =
    alertsCount != null ? (
      <EuiBadge color="hollow" data-test-subj="workflowAlertsBadge">
        {i18n.N_ALERTS(alertsCount)}
      </EuiBadge>
    ) : null;

  const fromWorkflowPrefix = alertsCount != null ? i18n.FROM_WORKFLOW : i18n.ALERTS_FROM_WORKFLOW;

  return (
    <EuiText data-test-subj="workflowAlertsSummaryLine" size="s">
      {alertsBadge != null && <>{alertsBadge} </>}
      {`${fromWorkflowPrefix} `}
      {workflowName != null &&
        (editorUrl != null ? (
          <EuiLink
            data-test-subj="workflowAlertsSummaryLink"
            external
            href={editorUrl}
            target="_blank"
          >
            {workflowName}
          </EuiLink>
        ) : (
          <strong data-test-subj="workflowAlertsSummaryLink">{workflowName}</strong>
        ))}
      {` ${i18n.PROVIDED_AS_CONTEXT}`}
    </EuiText>
  );
};

WorkflowAlertsSummaryLineComponent.displayName = 'WorkflowAlertsSummaryLine';

export const WorkflowAlertsSummaryLine = React.memo(WorkflowAlertsSummaryLineComponent);
