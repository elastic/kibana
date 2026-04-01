/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React, { useMemo } from 'react';

import { ATTACK_DISCOVERY_PATH } from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import type { AggregatedWorkflowExecution } from '../../types';
import { useWorkflowEditorLink } from '../../../use_workflow_editor_link';
import type { FailureCategory } from './helpers/classify_error_category';
import { classifyFailure } from './helpers/classify_failure';

export interface FailureActionsProps {
  aggregatedExecution: AggregatedWorkflowExecution;
  errorCategory?: FailureCategory;
  failedWorkflowId?: string;
  reason: string;
  workflowId?: string;
}

const FailureActionsComponent: React.FC<FailureActionsProps> = ({
  aggregatedExecution,
  errorCategory,
  failedWorkflowId,
  reason,
  workflowId,
}) => {
  const { application } = useKibana().services;

  const classification = useMemo(
    () => classifyFailure(reason, aggregatedExecution, errorCategory, failedWorkflowId),
    [aggregatedExecution, errorCategory, failedWorkflowId, reason]
  );

  // Identify the workflow_editor action's workflowId, falling back to the prop.
  // useWorkflowEditorLink must be called unconditionally (rules of hooks).
  const workflowEditorAction = classification.actions.find(
    (action) => action.linkType === 'workflow_editor'
  );
  const editorWorkflowId = workflowEditorAction?.workflowId ?? workflowId ?? null;

  const { editorUrl } = useWorkflowEditorLink({
    workflowId: editorWorkflowId,
    workflowRunId: null,
  });

  if (classification.actions.length === 0) {
    return null;
  }

  const actionLinks = classification.actions.map((action) => {
    let href: string | null = null;

    switch (action.linkType) {
      case 'workflow_editor':
        href = editorUrl;
        break;

      case 'connector_management':
        try {
          href = application.getUrlForApp('management', {
            path: '/insightsAndAlerting/triggersActionsConnectors/connectors',
          });
        } catch {
          href = null;
        }
        break;

      case 'attack_discovery_settings':
        try {
          href = application.getUrlForApp('securitySolution', {
            path: ATTACK_DISCOVERY_PATH,
          });
        } catch {
          href = null;
        }
        break;

      default:
        href = null;
    }

    return { href, label: action.label, linkType: action.linkType };
  });

  return (
    <EuiCallOut
      color="warning"
      data-test-subj="failureActionsCallout"
      title={classification.summary}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        {actionLinks.map(
          (action) =>
            action.href != null && (
              <EuiFlexItem key={action.label} grow={false}>
                <EuiLink
                  data-test-subj={`failureAction-${action.linkType}`}
                  href={action.href}
                  target="_blank"
                >
                  {action.label}
                </EuiLink>
              </EuiFlexItem>
            )
        )}
      </EuiFlexGroup>
    </EuiCallOut>
  );
};

FailureActionsComponent.displayName = 'FailureActions';

export const FailureActions = React.memo(FailureActionsComponent);
