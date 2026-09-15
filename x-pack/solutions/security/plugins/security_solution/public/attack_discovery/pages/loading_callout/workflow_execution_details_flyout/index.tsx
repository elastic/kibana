/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { WorkflowExecutionDetails } from './workflow_execution_details';
import type { WorkflowExecutionDetailsProps } from './workflow_execution_details';
import * as i18n from './translations';

type WorkflowExecutionDetailsFlyoutProps = WorkflowExecutionDetailsProps;

const WorkflowExecutionDetailsFlyoutComponent: React.FC<WorkflowExecutionDetailsFlyoutProps> = (
  props
) => {
  const { onClose } = props;
  const flyoutTitleId = useGeneratedHtmlId({
    prefix: 'workflowExecutionDetailsFlyout',
  });

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <EuiFlyout
      aria-labelledby={flyoutTitleId}
      data-test-subj="workflowExecutionDetailsFlyout"
      onClose={handleClose}
      size="m"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>{i18n.WORKFLOW_EXECUTION_DETAILS}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <WorkflowExecutionDetails {...props} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

WorkflowExecutionDetailsFlyoutComponent.displayName = 'WorkflowExecutionDetailsFlyout';

export const WorkflowExecutionDetailsFlyout = React.memo(WorkflowExecutionDetailsFlyoutComponent);
