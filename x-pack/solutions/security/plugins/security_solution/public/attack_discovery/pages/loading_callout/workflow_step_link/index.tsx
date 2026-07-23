/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React from 'react';

import { useWorkflowEditorLink } from '../../use_workflow_editor_link';
import type { StepExecutionWithLink } from '../types';
import * as i18n from './translations';

interface WorkflowStepLinkProps {
  step: StepExecutionWithLink;
}

export const WorkflowStepLink: React.FC<WorkflowStepLinkProps> = ({ step }) => {
  const { editorUrl } = useWorkflowEditorLink({
    workflowId: step.workflowId,
    workflowRunId: step.workflowRunId,
  });

  if (!editorUrl) {
    return null;
  }

  return (
    <EuiButtonEmpty
      data-test-subj="workflowStepLink"
      href={editorUrl}
      iconType="popout"
      rel="noopener noreferrer"
      size="xs"
      target="_blank"
    >
      {i18n.VIEW_IN_WORKFLOWS}
    </EuiButtonEmpty>
  );
};
